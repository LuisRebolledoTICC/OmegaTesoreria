using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Services;

public interface IVentasService
{
    Task<List<VentaResumenDto>> GetVentasAsync();
    Task<VentaDetalleDto?> GetVentaByIdAsync(int id);
    Task<VentaResumenDto> CreateVentaAsync(CreateVentaRequest request, string userName);
    Task<bool> UpdateVentaAsync(int id, UpdateVentaRequest request, string userName);
    Task<bool> DeleteVentaAsync(int id, string userName);

    // Productos y Presentaciones
    Task<VentaProductoDto> SaveProductoAsync(int ventaId, int? productoId, CreateOrUpdateProductoRequest request, string userName);
    Task<bool> DeleteProductoAsync(int ventaId, int productoId, string userName);

    // Pedidos
    Task<PedidoDto> CreatePedidoAsync(int ventaId, CreatePedidoRequest request, string userName);
    Task<PedidoDto> UpdatePedidoAsync(int ventaId, int pedidoId, CreatePedidoRequest request, string userName);
    Task<bool> UpdateEstadoEntregaAsync(int ventaId, int pedidoId, UpdateEstadoEntregaRequest request, string userName);
    Task<bool> CancelarPedidoAsync(int ventaId, int pedidoId, string userName);

    // Cierre e integración con Tesorería: "Realizar Entrada"
    Task<RealizarEntradaVentaResultDto> RealizarEntradaAsync(int ventaId, RealizarEntradaVentaRequest request, int userId, string userName);
}

public class VentasService : IVentasService
{
    private readonly AppDbContext _context;
    private readonly ITesoreriaService _tesoreriaService;

    public VentasService(AppDbContext context, ITesoreriaService tesoreriaService)
    {
        _context = context;
        _tesoreriaService = tesoreriaService;
    }

    public async Task<List<VentaResumenDto>> GetVentasAsync()
    {
        var ventas = await _context.Ventas
            .Include(v => v.Pedidos).ThenInclude(p => p.Pagos)
            .OrderByDescending(v => v.FechaVenta)
            .ThenByDescending(v => v.Id)
            .ToListAsync();

        return ventas.Select(v => CalcularResumenVenta(v)).ToList();
    }

    public async Task<VentaDetalleDto?> GetVentaByIdAsync(int id)
    {
        var v = await _context.Ventas
            .Include(x => x.Productos).ThenInclude(p => p.Presentaciones)
            .Include(x => x.Pedidos).ThenInclude(p => p.Detalles)
            .Include(x => x.Pedidos).ThenInclude(p => p.Pagos)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (v == null) return null;

        var metricas = CalcularMetricas(v.Pedidos.ToList());

        var productosDto = v.Productos
            .OrderBy(p => p.Orden).ThenBy(p => p.Nombre)
            .Select(p => new VentaProductoDto(
                p.Id,
                p.VentaId,
                p.Nombre,
                p.Descripcion,
                p.Orden,
                p.Presentaciones.OrderBy(pr => pr.Orden).ThenBy(pr => pr.Precio)
                    .Select(pr => new VentaPresentacionDto(pr.Id, pr.VentaProductoId, pr.Nombre, pr.Precio, pr.Orden))
                    .ToList()
            )).ToList();

        var pedidosDto = v.Pedidos
            .OrderByDescending(p => p.Folio)
            .Select(p => new PedidoDto(
                p.Id,
                p.VentaId,
                p.Folio,
                p.NombreCliente,
                p.FechaHora,
                p.TotalPedido,
                p.EstadoEntrega,
                p.EstadoPago,
                p.Observaciones,
                p.RegistradoPor,
                p.Detalles.Select(d => new PedidoDetalleDto(d.Id, d.PedidoId, d.VentaPresentacionId, d.ProductoNombre, d.PresentacionNombre, d.Cantidad, d.PrecioUnitario, d.Subtotal)).ToList(),
                p.Pagos.Select(pg => new PedidoPagoDto(pg.Id, pg.PedidoId, pg.MetodoPago, pg.Importe, pg.Referencia, pg.FechaPago)).ToList()
            )).ToList();

        return new VentaDetalleDto(
            v.Id,
            v.Nombre,
            v.FechaVenta,
            v.Estado,
            v.FechaCreacion,
            v.CreadoPor,
            v.FechaCierre,
            v.CerradoPor,
            v.EntradaEfectivoOperacionId,
            v.EntradaTransferenciaOperacionId,
            v.TotalEfectivoIngresado,
            v.TotalTransferenciaIngresado,
            metricas,
            productosDto,
            pedidosDto
        );
    }

    public async Task<VentaResumenDto> CreateVentaAsync(CreateVentaRequest request, string userName)
    {
        var venta = new Venta
        {
            Nombre = request.Nombre.Trim(),
            FechaVenta = DateTime.SpecifyKind(request.FechaVenta, DateTimeKind.Utc),
            Estado = "ABIERTA",
            FechaCreacion = DateTime.UtcNow,
            CreadoPor = userName
        };

        _context.Ventas.Add(venta);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "CREAR_VENTA",
            Entidad = "Venta",
            EntidadId = venta.Nombre,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Creación de venta comercial '{venta.Nombre}' para la fecha {venta.FechaVenta:dd/MM/yyyy}"
        });

        await _context.SaveChangesAsync();
        return CalcularResumenVenta(venta);
    }

    public async Task<bool> UpdateVentaAsync(int id, UpdateVentaRequest request, string userName)
    {
        var venta = await _context.Ventas.FindAsync(id);
        if (venta == null || venta.Estado == "CERRADA") return false;

        venta.Nombre = request.Nombre.Trim();
        venta.FechaVenta = DateTime.SpecifyKind(request.FechaVenta, DateTimeKind.Utc);

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "EDITAR_VENTA",
            Entidad = "Venta",
            EntidadId = venta.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Edición de datos de venta '{venta.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteVentaAsync(int id, string userName)
    {
        var venta = await _context.Ventas
            .Include(v => v.Pedidos)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (venta == null || venta.Estado == "CERRADA") return false;

        // Si ya tiene pedidos registrados, evitar borrado accidental
        if (venta.Pedidos.Any(p => p.EstadoEntrega != "CANCELADO"))
        {
            throw new InvalidOperationException("No se puede eliminar una venta que ya tiene pedidos registrados. Cancela los pedidos primero.");
        }

        _context.Ventas.Remove(venta);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "ELIMINAR_VENTA",
            Entidad = "Venta",
            EntidadId = id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Eliminación de venta '{venta.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<VentaProductoDto> SaveProductoAsync(int ventaId, int? productoId, CreateOrUpdateProductoRequest request, string userName)
    {
        var venta = await _context.Ventas.FindAsync(ventaId);
        if (venta == null || venta.Estado == "CERRADA")
            throw new InvalidOperationException("La venta no existe o ya está cerrada.");

        VentaProducto producto;
        if (productoId.HasValue && productoId.Value > 0)
        {
            producto = await _context.VentaProductos
                .Include(p => p.Presentaciones)
                .FirstOrDefaultAsync(p => p.Id == productoId.Value && p.VentaId == ventaId)
                ?? throw new InvalidOperationException("Producto no encontrado.");

            producto.Nombre = request.Nombre.Trim();
            producto.Descripcion = request.Descripcion?.Trim();
            producto.Orden = request.Orden;

            // Actualizar o crear presentaciones
            var incomingIds = request.Presentaciones.Where(pr => pr.Id.HasValue).Select(pr => pr.Id!.Value).ToList();
            var toRemove = producto.Presentaciones.Where(pr => !incomingIds.Contains(pr.Id)).ToList();
            foreach (var rem in toRemove)
            {
                producto.Presentaciones.Remove(rem);
            }

            foreach (var prReq in request.Presentaciones)
            {
                if (prReq.Id.HasValue && prReq.Id.Value > 0)
                {
                    var existingPr = producto.Presentaciones.FirstOrDefault(pr => pr.Id == prReq.Id.Value);
                    if (existingPr != null)
                    {
                        existingPr.Nombre = prReq.Nombre.Trim();
                        existingPr.Precio = prReq.Precio;
                        existingPr.Orden = prReq.Orden;
                    }
                }
                else
                {
                    producto.Presentaciones.Add(new VentaPresentacion
                    {
                        Nombre = prReq.Nombre.Trim(),
                        Precio = prReq.Precio,
                        Orden = prReq.Orden
                    });
                }
            }
        }
        else
        {
            producto = new VentaProducto
            {
                VentaId = ventaId,
                Nombre = request.Nombre.Trim(),
                Descripcion = request.Descripcion?.Trim(),
                Orden = request.Orden,
                Presentaciones = request.Presentaciones.Select(pr => new VentaPresentacion
                {
                    Nombre = pr.Nombre.Trim(),
                    Precio = pr.Precio,
                    Orden = pr.Orden
                }).ToList()
            };
            _context.VentaProductos.Add(producto);
        }

        await _context.SaveChangesAsync();

        return new VentaProductoDto(
            producto.Id,
            producto.VentaId,
            producto.Nombre,
            producto.Descripcion,
            producto.Orden,
            producto.Presentaciones.Select(pr => new VentaPresentacionDto(pr.Id, pr.VentaProductoId, pr.Nombre, pr.Precio, pr.Orden)).ToList()
        );
    }

    public async Task<bool> DeleteProductoAsync(int ventaId, int productoId, string userName)
    {
        var venta = await _context.Ventas.FindAsync(ventaId);
        if (venta == null || venta.Estado == "CERRADA") return false;

        var prod = await _context.VentaProductos
            .Include(p => p.Presentaciones)
            .FirstOrDefaultAsync(p => p.Id == productoId && p.VentaId == ventaId);

        if (prod == null) return false;

        _context.VentaProductos.Remove(prod);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PedidoDto> CreatePedidoAsync(int ventaId, CreatePedidoRequest request, string userName)
    {
        var venta = await _context.Ventas
            .Include(v => v.Pedidos)
            .FirstOrDefaultAsync(v => v.Id == ventaId);

        if (venta == null || venta.Estado == "CERRADA")
            throw new InvalidOperationException("La venta no existe o ya está cerrada. No se pueden agregar pedidos.");

        if (request.Items == null || !request.Items.Any())
            throw new InvalidOperationException("El pedido debe contener al menos un producto.");

        // Generar folio correlativo dentro de la venta
        int nextFolio = (venta.Pedidos.Any() ? venta.Pedidos.Max(p => p.Folio) : 0) + 1;

        // Obtener detalles con precios congelados de la base de datos
        var detalles = new List<PedidoDetalle>();
        decimal totalCalculado = 0;

        foreach (var item in request.Items)
        {
            if (item.Cantidad <= 0) continue;

            var presentacion = await _context.VentaPresentaciones
                .Include(pr => pr.VentaProducto)
                .FirstOrDefaultAsync(pr => pr.Id == item.VentaPresentacionId && pr.VentaProducto!.VentaId == ventaId)
                ?? throw new InvalidOperationException($"La presentación con ID {item.VentaPresentacionId} no pertenece a esta venta.");

            var subtotal = presentacion.Precio * item.Cantidad;
            totalCalculado += subtotal;

            detalles.Add(new PedidoDetalle
            {
                VentaPresentacionId = presentacion.Id,
                ProductoNombre = presentacion.VentaProducto?.Nombre ?? "Producto",
                PresentacionNombre = presentacion.Nombre,
                Cantidad = item.Cantidad,
                PrecioUnitario = presentacion.Precio,
                Subtotal = subtotal
            });
        }

        // Validar y registrar pagos
        var pagos = new List<PedidoPago>();
        decimal sumaPagosRegistrados = 0;

        if (request.Pagos != null)
        {
            foreach (var p in request.Pagos)
            {
                if (p.Importe <= 0) continue;
                sumaPagosRegistrados += p.Importe;

                pagos.Add(new PedidoPago
                {
                    MetodoPago = p.MetodoPago.ToUpperInvariant(),
                    Importe = p.Importe,
                    Referencia = p.Referencia?.Trim(),
                    FechaPago = DateTime.UtcNow
                });
            }
        }

        if (sumaPagosRegistrados > totalCalculado)
        {
            throw new InvalidOperationException($"La suma de pagos (${sumaPagosRegistrados:N2}) no puede exceder el total del pedido (${totalCalculado:N2}).");
        }

        string estadoPago = "PENDIENTE";
        if (sumaPagosRegistrados >= totalCalculado && totalCalculado > 0)
        {
            estadoPago = "PAGADO";
        }
        else if (sumaPagosRegistrados > 0)
        {
            estadoPago = "PARCIAL";
        }

        var pedido = new Pedido
        {
            VentaId = ventaId,
            Folio = nextFolio,
            NombreCliente = request.NombreCliente?.Trim(),
            FechaHora = DateTime.UtcNow,
            TotalPedido = totalCalculado,
            EstadoEntrega = string.Equals(request.EstadoEntrega, "ENTREGADO", StringComparison.OrdinalIgnoreCase) ? "ENTREGADO" : "PENDIENTE",
            EstadoPago = estadoPago,
            Observaciones = request.Observaciones?.Trim(),
            RegistradoPor = userName,
            Detalles = detalles,
            Pagos = pagos
        };

        _context.Pedidos.Add(pedido);
        await _context.SaveChangesAsync();

        return new PedidoDto(
            pedido.Id,
            pedido.VentaId,
            pedido.Folio,
            pedido.NombreCliente,
            pedido.FechaHora,
            pedido.TotalPedido,
            pedido.EstadoEntrega,
            pedido.EstadoPago,
            pedido.Observaciones,
            pedido.RegistradoPor,
            pedido.Detalles.Select(d => new PedidoDetalleDto(d.Id, d.PedidoId, d.VentaPresentacionId, d.ProductoNombre, d.PresentacionNombre, d.Cantidad, d.PrecioUnitario, d.Subtotal)).ToList(),
            pedido.Pagos.Select(pg => new PedidoPagoDto(pg.Id, pg.PedidoId, pg.MetodoPago, pg.Importe, pg.Referencia, pg.FechaPago)).ToList()
        );
    }

    public async Task<PedidoDto> UpdatePedidoAsync(int ventaId, int pedidoId, CreatePedidoRequest request, string userName)
    {
        var venta = await _context.Ventas.FindAsync(ventaId);
        if (venta == null) throw new InvalidOperationException("Venta no encontrada.");
        if (venta.Estado == "CERRADA") throw new InvalidOperationException("No se pueden modificar pedidos en una venta cerrada.");

        var pedido = await _context.Pedidos
            .Include(p => p.Detalles)
            .Include(p => p.Pagos)
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.VentaId == ventaId)
            ?? throw new InvalidOperationException("Pedido no encontrado.");

        if (pedido.EstadoEntrega == "CANCELADO")
        {
            throw new InvalidOperationException("No se puede editar un pedido cancelado.");
        }

        if (request.Items == null || !request.Items.Any())
        {
            throw new InvalidOperationException("El pedido debe contener al menos un producto.");
        }

        // Validar presentaciones
        var presentacionIds = request.Items.Select(i => i.VentaPresentacionId).Distinct().ToList();
        var presentaciones = await _context.VentaPresentaciones
            .Include(p => p.VentaProducto)
            .Where(p => presentacionIds.Contains(p.Id) && p.VentaProducto!.VentaId == ventaId)
            .ToDictionaryAsync(p => p.Id);

        if (presentaciones.Count != presentacionIds.Count)
        {
            throw new InvalidOperationException("Una o más presentaciones seleccionadas no pertenecen a esta venta.");
        }

        // Limpiar detalles anteriores y recrear
        _context.PedidoDetalles.RemoveRange(pedido.Detalles);
        pedido.Detalles.Clear();

        decimal totalCalculado = 0;
        foreach (var item in request.Items)
        {
            if (item.Cantidad <= 0) continue;
            var pres = presentaciones[item.VentaPresentacionId];
            var subtotal = item.Cantidad * pres.Precio;
            totalCalculado += subtotal;

            pedido.Detalles.Add(new PedidoDetalle
            {
                PedidoId = pedido.Id,
                VentaPresentacionId = pres.Id,
                ProductoNombre = pres.VentaProducto?.Nombre ?? "Producto",
                PresentacionNombre = pres.Nombre,
                Cantidad = item.Cantidad,
                PrecioUnitario = pres.Precio,
                Subtotal = subtotal
            });
        }

        pedido.TotalPedido = totalCalculado;

        // Limpiar pagos anteriores y recrear
        _context.PedidoPagos.RemoveRange(pedido.Pagos);
        pedido.Pagos.Clear();

        decimal totalPagado = 0;
        if (request.Pagos != null && request.Pagos.Any())
        {
            foreach (var pago in request.Pagos)
            {
                if (pago.Importe <= 0 && pago.MetodoPago != "PENDIENTE") continue;
                totalPagado += pago.Importe;

                pedido.Pagos.Add(new PedidoPago
                {
                    PedidoId = pedido.Id,
                    MetodoPago = pago.MetodoPago.ToUpperInvariant(),
                    Importe = pago.Importe,
                    Referencia = pago.Referencia,
                    FechaPago = DateTime.UtcNow
                });
            }
        }

        if (totalPagado > totalCalculado)
        {
            throw new InvalidOperationException($"El total pagado (${totalPagado:N2}) no puede exceder el total del pedido (${totalCalculado:N2}).");
        }

        string estadoPago = "PENDIENTE";
        if (totalPagado >= totalCalculado && totalCalculado > 0)
        {
            estadoPago = "PAGADO";
        }
        else if (totalPagado > 0)
        {
            estadoPago = "PARCIAL";
        }

        pedido.NombreCliente = request.NombreCliente?.Trim();
        pedido.Observaciones = request.Observaciones?.Trim();
        if (!string.IsNullOrWhiteSpace(request.EstadoEntrega))
        {
            pedido.EstadoEntrega = request.EstadoEntrega.ToUpperInvariant();
        }
        pedido.EstadoPago = estadoPago;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "EDITAR_PEDIDO",
            Entidad = "Pedido",
            EntidadId = pedido.Folio.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Edición de pedido #{pedido.Folio} en la venta '{venta.Nombre}'. Nuevo total: ${pedido.TotalPedido:N2}"
        });

        await _context.SaveChangesAsync();

        return new PedidoDto(
            pedido.Id,
            pedido.VentaId,
            pedido.Folio,
            pedido.NombreCliente,
            pedido.FechaHora,
            pedido.TotalPedido,
            pedido.EstadoEntrega,
            pedido.EstadoPago,
            pedido.Observaciones,
            pedido.RegistradoPor,
            pedido.Detalles.Select(d => new PedidoDetalleDto(d.Id, d.PedidoId, d.VentaPresentacionId, d.ProductoNombre, d.PresentacionNombre, d.Cantidad, d.PrecioUnitario, d.Subtotal)).ToList(),
            pedido.Pagos.Select(pg => new PedidoPagoDto(pg.Id, pg.PedidoId, pg.MetodoPago, pg.Importe, pg.Referencia, pg.FechaPago)).ToList()
        );
    }

    public async Task<bool> UpdateEstadoEntregaAsync(int ventaId, int pedidoId, UpdateEstadoEntregaRequest request, string userName)
    {
        var venta = await _context.Ventas.FindAsync(ventaId);
        if (venta == null || venta.Estado == "CERRADA") return false;

        var pedido = await _context.Pedidos.FirstOrDefaultAsync(p => p.Id == pedidoId && p.VentaId == ventaId);
        if (pedido == null) return false;

        pedido.EstadoEntrega = request.EstadoEntrega.ToUpperInvariant();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CancelarPedidoAsync(int ventaId, int pedidoId, string userName)
    {
        var venta = await _context.Ventas.FindAsync(ventaId);
        if (venta == null || venta.Estado == "CERRADA") return false;

        var pedido = await _context.Pedidos.FirstOrDefaultAsync(p => p.Id == pedidoId && p.VentaId == ventaId);
        if (pedido == null) return false;

        pedido.EstadoEntrega = "CANCELADO";

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "CANCELAR_PEDIDO",
            Entidad = "Pedido",
            EntidadId = pedido.Folio.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Cancelación de pedido #{pedido.Folio} de la venta '{venta.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<RealizarEntradaVentaResultDto> RealizarEntradaAsync(int ventaId, RealizarEntradaVentaRequest request, int userId, string userName)
    {
        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var venta = await _context.Ventas
                .Include(v => v.Pedidos).ThenInclude(p => p.Pagos)
                .FirstOrDefaultAsync(v => v.Id == ventaId)
                ?? throw new InvalidOperationException("Venta no encontrada.");

            // Idempotencia: Verificar que no se haya cerrado ni enviado a Tesorería previamente
            if (venta.Estado == "CERRADA" || venta.EntradaEfectivoOperacionId.HasValue || venta.EntradaTransferenciaOperacionId.HasValue)
            {
                throw new InvalidOperationException("Esta venta ya ha sido cerrada e ingresada a Tesorería previamente.");
            }

            // 1. Obtener todos los pedidos válidos (excluyendo cancelados)
            var pedidosValidos = venta.Pedidos.Where(p => p.EstadoEntrega != "CANCELADO").ToList();

            // 2. Calcular los importes efectivamente pagados en efectivo y por transferencia
            decimal totalEfectivo = pedidosValidos
                .SelectMany(p => p.Pagos)
                .Where(pg => pg.MetodoPago == "EFECTIVO")
                .Sum(pg => pg.Importe);

            decimal totalTransferencia = pedidosValidos
                .SelectMany(p => p.Pagos)
                .Where(pg => pg.MetodoPago == "TRANSFERENCIA")
                .Sum(pg => pg.Importe);

            if (totalEfectivo <= 0 && totalTransferencia <= 0)
            {
                throw new InvalidOperationException("No hay importes cobrados en efectivo o transferencia para realizar una entrada en Tesorería.");
            }

            int? opEfectivoId = null;
            int? opTransferenciaId = null;

            // Entrada 1: Efectivo (en la caja de efectivo elegida por el usuario)
            if (totalEfectivo > 0)
            {
                var cajaEfectivo = await _context.Cajas.FirstOrDefaultAsync(c => c.Id == request.CajaEfectivoId)
                    ?? throw new InvalidOperationException("La caja de efectivo seleccionada no existe.");

                if (cajaEfectivo.Tipo == "TRANSFERENCIAS")
                {
                    throw new InvalidOperationException("La caja seleccionada para efectivo no puede ser una caja bancaria/digital.");
                }

                var entradaEfReq = new EntradaRequest
                {
                    CajaId = request.CajaEfectivoId,
                    Importe = totalEfectivo,
                    Concepto = $"Ingreso por Ventas: {venta.Nombre}",
                    Descripcion = $"Ingreso por recaudación de venta '{venta.Nombre}' del {venta.FechaVenta:dd/MM/yyyy} (Efectivo cobrado)",
                    Observaciones = $"Generado automáticamente desde el módulo de Ventas. Venta ID: {venta.Id}"
                };

                var opEf = await _tesoreriaService.RegistrarEntradaAsync(entradaEfReq, userId, userName);
                opEfectivoId = opEf.Id;
            }

            // Entrada 2: Transferencia (en la cuenta o caja bancaria de transferencias)
            if (totalTransferencia > 0)
            {
                var cajaTransf = await _context.Cajas.FirstOrDefaultAsync(c => c.Tipo == "TRANSFERENCIAS" && c.Activa)
                    ?? throw new InvalidOperationException("No se encontró una caja activa de tipo 'TRANSFERENCIAS' para registrar los pagos digitales.");

                var entradaTrReq = new EntradaRequest
                {
                    CajaId = cajaTransf.Id,
                    Importe = totalTransferencia,
                    Concepto = $"Ingreso por Ventas (Transferencias): {venta.Nombre}",
                    Descripcion = $"Ingreso por recaudación de venta '{venta.Nombre}' del {venta.FechaVenta:dd/MM/yyyy} (Transferencias cobradas)",
                    Observaciones = $"Generado automáticamente desde el módulo de Ventas. Venta ID: {venta.Id}"
                };

                var opTr = await _tesoreriaService.RegistrarEntradaAsync(entradaTrReq, userId, userName);
                opTransferenciaId = opTr.Id;
            }

            // Cierre y bloqueo definitivo de la venta
            venta.Estado = "CERRADA";
            venta.FechaCierre = DateTime.UtcNow;
            venta.CerradoPor = userName;
            venta.EntradaEfectivoOperacionId = opEfectivoId;
            venta.EntradaTransferenciaOperacionId = opTransferenciaId;
            venta.TotalEfectivoIngresado = totalEfectivo;
            venta.TotalTransferenciaIngresado = totalTransferencia;

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "REALIZAR_ENTRADA_VENTA",
                Entidad = "Venta",
                EntidadId = venta.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Cierre e ingreso a Tesorería de venta '{venta.Nombre}'. Efectivo: ${totalEfectivo:N2}, Transferencias: ${totalTransferencia:N2}"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return new RealizarEntradaVentaResultDto(
                true,
                $"Entrada realizada exitosamente y venta cerrada. Efectivo: ${totalEfectivo:N2}, Transferencia: ${totalTransferencia:N2}",
                opEfectivoId,
                totalEfectivo,
                opTransferenciaId,
                totalTransferencia
            );
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static VentaResumenDto CalcularResumenVenta(Venta v)
    {
        var metricas = CalcularMetricas(v.Pedidos.ToList());
        return new VentaResumenDto(
            v.Id,
            v.Nombre,
            v.FechaVenta,
            v.Estado,
            v.FechaCreacion,
            v.CreadoPor,
            v.FechaCierre,
            v.CerradoPor,
            metricas.TotalPedidos,
            metricas.PedidosPendientes,
            metricas.PedidosEntregados,
            metricas.PedidosCancelados,
            metricas.TotalVendido,
            metricas.TotalEfectivo,
            metricas.TotalTransferencia,
            metricas.TotalPendientePago,
            v.EntradaEfectivoOperacionId,
            v.EntradaTransferenciaOperacionId
        );
    }

    private static VentaMetricasDto CalcularMetricas(List<Pedido> pedidos)
    {
        int total = pedidos.Count;
        int entregados = pedidos.Count(p => p.EstadoEntrega == "ENTREGADO");
        int pendientes = pedidos.Count(p => p.EstadoEntrega == "PENDIENTE");
        int cancelados = pedidos.Count(p => p.EstadoEntrega == "CANCELADO");

        var pedidosValidos = pedidos.Where(p => p.EstadoEntrega != "CANCELADO").ToList();

        decimal totalVendido = pedidosValidos.Sum(p => p.TotalPedido);

        decimal totalEfectivo = pedidosValidos
            .SelectMany(p => p.Pagos)
            .Where(pg => pg.MetodoPago == "EFECTIVO")
            .Sum(pg => pg.Importe);

        decimal totalTransferencia = pedidosValidos
            .SelectMany(p => p.Pagos)
            .Where(pg => pg.MetodoPago == "TRANSFERENCIA")
            .Sum(pg => pg.Importe);

        decimal totalPagado = totalEfectivo + totalTransferencia;
        decimal totalPendiente = totalVendido > totalPagado ? totalVendido - totalPagado : 0;

        return new VentaMetricasDto(
            total,
            pendientes,
            entregados,
            cancelados,
            totalVendido,
            totalEfectivo,
            totalTransferencia,
            totalPendiente
        );
    }
}
