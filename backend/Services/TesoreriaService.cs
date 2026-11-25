using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Services;

public interface ITesoreriaService
{
    Task<DashboardSummaryDto> GetDashboardSummaryAsync();
    Task<List<CajaDto>> GetCajasAsync(bool includeInactive = false);
    Task<CajaDto?> GetCajaByIdAsync(int id);
    Task<CajaDto> CreateCajaAsync(CreateCajaRequest request, int userId, string userName);
    Task<bool> UpdateCajaAsync(int id, UpdateCajaRequest request, string userName);
    Task<bool> ToggleCajaStatusAsync(int id, string userName);
    Task<bool> DeleteCajaAsync(int id, string userName);
    
    Task<List<Denominacion>> GetDenominacionesAsync();
    Task<List<TipoBolsa>> GetTiposBolsasAsync(int? cajaId = null);
    Task<TipoBolsa> CreateTipoBolsaAsync(CreateTipoBolsaRequest request, string userName);
    Task<bool> UpdateTipoBolsaAsync(int id, UpdateTipoBolsaRequest request, string userName);
    Task<bool> DeleteTipoBolsaAsync(int id, string userName);

    Task<Conteo> RegistrarConteoAsync(SaveConteoRequest request, int userId, string userName);
    Task<List<Conteo>> GetConteosAsync(int? cajaId = null);

    Task<OperacionDto> RegistrarEntradaAsync(EntradaRequest request, int userId, string userName);
    Task<OperacionDto> RegistrarSalidaAsync(SalidaRequest request, int userId, string userName);
    Task<OperacionDto> RegistrarTransferenciaAsync(TransferenciaRequest request, int userId, string userName);
    Task<OperacionDto> AnularOperacionAsync(int operacionId, string motivo, int userId, string userName);

    Task<List<OperacionDto>> GetHistorialOperacionesAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin,
        int? cajaId,
        string? tipoOperacion,
        string? usuarioNombre
    );

    Task<List<Auditoria>> GetAuditoriaAsync();
}

public class TesoreriaService : ITesoreriaService
{
    private readonly AppDbContext _context;

    public TesoreriaService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync()
    {
        var cajas = await GetCajasAsync(includeInactive: true);
        var activas = cajas.Where(c => c.Activa).ToList();

        var saldoTotal = activas.Sum(c => c.SaldoActual);

        var totalEntradas = await _context.Operaciones
            .Where(o => o.TipoOperacion == "ENTRADA" && o.Estado == "CONFIRMADA")
            .SumAsync(o => o.Importe);

        var totalSalidas = await _context.Operaciones
            .Where(o => o.TipoOperacion == "SALIDA" && o.Estado == "CONFIRMADA")
            .SumAsync(o => o.Importe);

        var totalTransferencias = await _context.Operaciones
            .Where(o => o.TipoOperacion == "TRANSFERENCIA" && o.Estado == "CONFIRMADA")
            .SumAsync(o => o.Importe);

        var ultimoConteo = await _context.Conteos
            .OrderByDescending(c => c.FechaConteo)
            .Select(c => (DateTime?)c.FechaConteo)
            .FirstOrDefaultAsync();

        var cajasPendientes = activas.Count(c => c.EstadoVerificacion != "Verificado");

        var ultimasOps = await _context.Operaciones
            .Include(o => o.CajaOrigen)
            .Include(o => o.CajaDestino)
            .Include(o => o.Detalles).ThenInclude(d => d.Denominacion)
            .Include(o => o.Detalles).ThenInclude(d => d.TipoBolsa)
            .OrderByDescending(o => o.FechaRegistro)
            .Take(10)
            .Select(o => MapToOperacionDto(o))
            .ToListAsync();

        var distribucion = activas.Select(c => new GraficaDistribucionItem(
            c.Nombre,
            c.SaldoActual,
            saldoTotal > 0 ? Math.Round((c.SaldoActual / saldoTotal) * 100, 2) : 0
        )).ToList();

        return new DashboardSummaryDto(
            saldoTotal,
            cajas.Count,
            activas.Count,
            totalEntradas,
            totalSalidas,
            totalTransferencias,
            ultimoConteo,
            cajasPendientes,
            activas,
            ultimasOps,
            distribucion
        );
    }

    public async Task<List<CajaDto>> GetCajasAsync(bool includeInactive = false)
    {
        var query = _context.Cajas
            .Include(c => c.EfectivoDisponible).ThenInclude(e => e.Denominacion)
            .Include(c => c.EfectivoDisponible).ThenInclude(e => e.TipoBolsa)
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(c => c.Activa);
        }

        var list = await query.OrderBy(c => c.Id).ToListAsync();
        return list.Select(MapToCajaDto).ToList();
    }

    public async Task<CajaDto?> GetCajaByIdAsync(int id)
    {
        var caja = await _context.Cajas
            .Include(c => c.EfectivoDisponible).ThenInclude(e => e.Denominacion)
            .Include(c => c.EfectivoDisponible).ThenInclude(e => e.TipoBolsa)
            .FirstOrDefaultAsync(c => c.Id == id);

        return caja == null ? null : MapToCajaDto(caja);
    }

    public async Task<CajaDto> CreateCajaAsync(CreateCajaRequest request, int userId, string userName)
    {
        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var caja = new Caja
            {
                Nombre = request.Nombre.Trim(),
                Descripcion = request.Descripcion.Trim(),
                Finalidad = request.Finalidad.Trim(),
                Tipo = string.IsNullOrWhiteSpace(request.Tipo) ? "EFECTIVO" : request.Tipo.Trim().ToUpper(),
                Activa = true,
                SaldoActual = request.SaldoInicial,
                CreadoPor = userName,
                FechaCreacion = DateTime.UtcNow,
                UltimoConteoFecha = DateTime.UtcNow,
                EstadoVerificacion = "Verificado"
            };

            _context.Cajas.Add(caja);
            await _context.SaveChangesAsync();

            if (request.SaldoInicial > 0)
            {
                var op = new Operacion
                {
                    TipoOperacion = "ENTRADA",
                    CajaDestinoId = caja.Id,
                    FechaOperacion = DateTime.UtcNow,
                    Importe = request.SaldoInicial,
                    Concepto = "Saldo inicial de apertura",
                    Descripcion = $"Apertura de {caja.Nombre} con saldo inicial",
                    Estado = "CONFIRMADA",
                    UsuarioId = userId,
                    UsuarioNombre = userName,
                    FechaRegistro = DateTime.UtcNow,
                    Observaciones = "Apertura de caja"
                };
                _context.Operaciones.Add(op);
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "CREAR_CAJA",
                Entidad = "Caja",
                EntidadId = caja.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Creación de la caja '{caja.Nombre}' con saldo inicial de ${request.SaldoInicial:N2} MXN"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return (await GetCajaByIdAsync(caja.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateCajaAsync(int id, UpdateCajaRequest request, string userName)
    {
        var caja = await _context.Cajas.FindAsync(id);
        if (caja == null) return false;

        caja.Nombre = request.Nombre.Trim();
        caja.Descripcion = request.Descripcion.Trim();
        caja.Finalidad = request.Finalidad.Trim();
        if (!string.IsNullOrWhiteSpace(request.Tipo))
        {
            caja.Tipo = request.Tipo.Trim().ToUpper();
        }
        caja.Activa = request.Activa;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "EDITAR_CAJA",
            Entidad = "Caja",
            EntidadId = caja.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Edición de información para la caja '{caja.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCajaAsync(int id, string userName)
    {
        var caja = await _context.Cajas
            .Include(c => c.EfectivoDisponible)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (caja == null) return false;

        // Desvincular operaciones históricas de forma segura
        var opsOrigen = await _context.Operaciones.Where(o => o.CajaOrigenId == id).ToListAsync();
        foreach (var op in opsOrigen) { op.CajaOrigenId = null; }

        var opsDestino = await _context.Operaciones.Where(o => o.CajaDestinoId == id).ToListAsync();
        foreach (var op in opsDestino) { op.CajaDestinoId = null; }

        var conteos = await _context.Conteos.Where(c => c.CajaId == id).ToListAsync();
        _context.Conteos.RemoveRange(conteos);

        _context.CajasEfectivo.RemoveRange(caja.EfectivoDisponible);
        _context.Cajas.Remove(caja);

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "ELIMINAR_CAJA",
            Entidad = "Caja",
            EntidadId = id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Eliminación permanente de la caja '{caja.Nombre}' (Saldo al eliminar: ${caja.SaldoActual:N2} MXN)"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleCajaStatusAsync(int id, string userName)
    {
        var caja = await _context.Cajas.FindAsync(id);
        if (caja == null) return false;

        caja.Activa = !caja.Activa;
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = caja.Activa ? "ACTIVAR_CAJA" : "DESACTIVAR_CAJA",
            Entidad = "Caja",
            EntidadId = caja.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Cambio de estado de la caja '{caja.Nombre}' a {(caja.Activa ? "Activa" : "Inactiva")}"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<Denominacion>> GetDenominacionesAsync()
    {
        return await _context.Denominaciones
            .Where(d => d.Activa)
            .OrderBy(d => d.OrdenVisualizacion)
            .ToListAsync();
    }

    public async Task<List<TipoBolsa>> GetTiposBolsasAsync(int? cajaId = null)
    {
        var query = _context.TiposBolsas
            .Include(b => b.DenominacionAsociada)
            .Where(b => b.Activa);

        if (cajaId.HasValue)
        {
            query = query.Where(b => b.CajaId == cajaId.Value);
        }

        return await query
            .OrderBy(b => b.ValorUnitario)
            .ToListAsync();
    }

    public async Task<TipoBolsa> CreateTipoBolsaAsync(CreateTipoBolsaRequest request, string userName)
    {
        var bolsa = new TipoBolsa
        {
            CajaId = request.CajaId,
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            ValorUnitario = request.ValorUnitario,
            DenominacionAsociadaId = request.DenominacionAsociadaId,
            Activa = true,
            FechaCreacion = DateTime.UtcNow
        };

        _context.TiposBolsas.Add(bolsa);
        await _context.SaveChangesAsync();

        if (bolsa.DenominacionAsociadaId.HasValue)
        {
            await _context.Entry(bolsa).Reference(b => b.DenominacionAsociada).LoadAsync();
        }

        _context.Auditoria.Add(new Auditoria
        {
            Entidad = "TiposBolsas",
            EntidadId = bolsa.Id.ToString(),
            Accion = "Crear",
            ValoresNuevos = $"{{\"Nombre\":\"{request.Nombre}\",\"ValorUnitario\":{request.ValorUnitario},\"DenominacionAsociadaId\":{request.DenominacionAsociadaId}}}",
            UsuarioNombre = userName,
            Descripcion = $"Tipo de bolsa '{request.Nombre}' creada con valor ${request.ValorUnitario}",
            FechaHora = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return bolsa;
    }

    public async Task<bool> UpdateTipoBolsaAsync(int id, UpdateTipoBolsaRequest request, string userName)
    {
        var bolsa = await _context.TiposBolsas.FindAsync(id);
        if (bolsa == null) return false;

        var valorAnterior = bolsa.ValorUnitario;
        if (request.CajaId.HasValue)
        {
            bolsa.CajaId = request.CajaId;
        }
        bolsa.Nombre = request.Nombre;
        bolsa.Descripcion = request.Descripcion;
        bolsa.ValorUnitario = request.ValorUnitario;
        if (request.DenominacionAsociadaId.HasValue)
        {
            bolsa.DenominacionAsociadaId = request.DenominacionAsociadaId;
        }

        _context.Auditoria.Add(new Auditoria
        {
            Entidad = "TiposBolsas",
            EntidadId = id.ToString(),
            Accion = "Actualizar",
            ValoresAnteriores = $"{{\"ValorUnitario\":{valorAnterior}}}",
            ValoresNuevos = $"{{\"Nombre\":\"{request.Nombre}\",\"ValorUnitario\":{request.ValorUnitario},\"DenominacionAsociadaId\":{request.DenominacionAsociadaId}}}",
            UsuarioNombre = userName,
            Descripcion = $"Tipo de bolsa '{request.Nombre}' actualizado. Valor: {valorAnterior} → {request.ValorUnitario}",
            FechaHora = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteTipoBolsaAsync(int id, string userName)
    {
        var bolsa = await _context.TiposBolsas.FindAsync(id);
        if (bolsa == null) return false;

        bolsa.Activa = false;
        _context.Auditoria.Add(new Auditoria
        {
            Entidad = "TiposBolsas",
            EntidadId = id.ToString(),
            Accion = "Desactivar",
            UsuarioNombre = userName,
            Descripcion = $"Tipo de bolsa '{bolsa.Nombre}' desactivada",
            FechaHora = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<Conteo> RegistrarConteoAsync(SaveConteoRequest request, int userId, string userName)
    {
        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var caja = await _context.Cajas
                .Include(c => c.EfectivoDisponible)
                .FirstOrDefaultAsync(c => c.Id == request.CajaId)
                ?? throw new InvalidOperationException("Caja no encontrada.");

            if (!caja.Activa)
                throw new InvalidOperationException("No se pueden realizar conteos en una caja inactiva.");

            decimal totalMonedas = request.Items.Where(i => i.TipoEfectivo == "Moneda").Sum(i => i.Subtotal);
            decimal totalBilletes = request.Items.Where(i => i.TipoEfectivo == "Billete").Sum(i => i.Subtotal);
            decimal totalBolsas = request.Items.Where(i => i.TipoEfectivo == "Bolsa").Sum(i => i.Subtotal);
            decimal saldoContado = totalMonedas + totalBilletes + totalBolsas;
            decimal saldoEsperado = caja.SaldoActual;
            decimal diferencia = saldoContado - saldoEsperado;

            string estado = Math.Abs(diferencia) < 0.01m ? "VERIFICADO" : (request.AplicarAjuste ? "AJUSTADO" : "CON_DIFERENCIA");

            var conteo = new Conteo
            {
                CajaId = caja.Id,
                CajaNombre = caja.Nombre,
                FechaConteo = DateTime.UtcNow,
                SaldoEsperado = saldoEsperado,
                SaldoContado = saldoContado,
                Diferencia = diferencia,
                Estado = estado,
                UsuarioId = userId,
                UsuarioNombre = userName,
                Observaciones = request.Observaciones,
                TotalMonedas = totalMonedas,
                TotalBilletes = totalBilletes,
                TotalBolsas = totalBolsas,
                DesgloseJson = JsonSerializer.Serialize(request.Items)
            };

            _context.Conteos.Add(conteo);
            caja.UltimoConteoFecha = DateTime.UtcNow;
            caja.EstadoVerificacion = estado == "VERIFICADO" ? "Verificado" : (estado == "AJUSTADO" ? "Verificado" : "Diferencia");

            // Si se aplica ajuste o movimiento de conciliación:
            if (request.AplicarAjuste && Math.Abs(diferencia) >= 0.01m)
            {
                var tipoMov = string.IsNullOrWhiteSpace(request.TipoMovimientoDiferencia)
                    ? (diferencia > 0 ? "ENTRADA" : "SALIDA")
                    : request.TipoMovimientoDiferencia.Trim().ToUpper();

                var conceptoFinal = !string.IsNullOrWhiteSpace(request.ConceptoDiferencia)
                    ? request.ConceptoDiferencia.Trim()
                    : (!string.IsNullOrWhiteSpace(request.MotivoAjuste)
                        ? request.MotivoAjuste.Trim()
                        : (diferencia > 0 ? "Entrada por sobrante" : "Salida por faltante"));

                var descripcionFinal = !string.IsNullOrWhiteSpace(request.MotivoAjuste)
                    ? request.MotivoAjuste.Trim()
                    : $"Movimiento generado desde conteo físico #{conteo.Id}. Diferencia: ${diferencia:N2} MXN.";

                var opAjuste = new Operacion
                {
                    TipoOperacion = tipoMov,
                    CajaDestinoId = (tipoMov == "ENTRADA" || (tipoMov == "AJUSTE" && diferencia > 0)) ? caja.Id : null,
                    CajaOrigenId = (tipoMov == "SALIDA" || (tipoMov == "AJUSTE" && diferencia < 0)) ? caja.Id : null,
                    FechaOperacion = DateTime.UtcNow,
                    Importe = Math.Abs(diferencia),
                    Concepto = conceptoFinal,
                    Descripcion = descripcionFinal,
                    Estado = "CONFIRMADA",
                    UsuarioId = userId,
                    UsuarioNombre = userName,
                    FechaRegistro = DateTime.UtcNow,
                    Observaciones = $"Generado desde conteo físico #{conteo.Id}. Saldo esperado: ${saldoEsperado:N2}, Contado: ${saldoContado:N2}."
                };
                _context.Operaciones.Add(opAjuste);

                // Modificar saldo financiero
                caja.SaldoActual = saldoContado;
            }

            // Actualizar la composición física en CajaEfectivo
            _context.CajasEfectivo.RemoveRange(caja.EfectivoDisponible);
            foreach (var item in request.Items.Where(i => i.Cantidad > 0))
            {
                _context.CajasEfectivo.Add(new CajaEfectivo
                {
                    CajaId = caja.Id,
                    TipoEfectivo = item.TipoEfectivo,
                    DenominacionId = item.DenominacionId,
                    TipoBolsaId = item.TipoBolsaId,
                    Cantidad = item.Cantidad
                });
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "CONTEO_FISICO",
                Entidad = "Caja",
                EntidadId = caja.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Conteo en '{caja.Nombre}'. Esperado: ${saldoEsperado:N2}, Contado: ${saldoContado:N2}, Dif: ${diferencia:N2}. Estado: {estado}"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return conteo;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<List<Conteo>> GetConteosAsync(int? cajaId = null)
    {
        var query = _context.Conteos.AsQueryable();
        if (cajaId.HasValue)
            query = query.Where(c => c.CajaId == cajaId.Value);

        return await query.OrderByDescending(c => c.FechaConteo).ToListAsync();
    }

    public async Task<OperacionDto> RegistrarEntradaAsync(EntradaRequest request, int userId, string userName)
    {
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe debe ser mayor a cero.");

        var isLocalTx = _context.Database.CurrentTransaction == null;
        var tx = isLocalTx ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var caja = await _context.Cajas
                .Include(c => c.EfectivoDisponible)
                .FirstOrDefaultAsync(c => c.Id == request.CajaId)
                ?? throw new InvalidOperationException("Caja receptora no encontrada.");

            if (!caja.Activa)
                throw new InvalidOperationException("No se pueden registrar movimientos en una caja inactiva.");

            caja.SaldoActual += request.Importe;

            var op = new Operacion
            {
                TipoOperacion = "ENTRADA",
                CajaDestinoId = caja.Id,
                FechaOperacion = DateTime.UtcNow,
                Importe = request.Importe,
                Concepto = request.Concepto.Trim(),
                Descripcion = (request.Descripcion ?? request.Concepto).Trim(),
                Estado = "CONFIRMADA",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = request.Observaciones
            };

            _context.Operaciones.Add(op);
            await _context.SaveChangesAsync();

            // Desglose si se proporcionó
            if (request.Desglose != null && request.Desglose.Any())
            {
                await ProcesarDesgloseAsync(op.Id, request.Desglose, caja.Id, incrementar: true);
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "REGISTRO_ENTRADA",
                Entidad = "Operacion",
                EntidadId = op.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Entrada de ${request.Importe:N2} MXN a caja '{caja.Nombre}' por concepto '{op.Concepto}'"
            });

            await _context.SaveChangesAsync();
            if (isLocalTx && tx != null)
            {
                await tx.CommitAsync();
            }

            return (await GetOperacionByIdAsync(op.Id))!;
        }
        catch
        {
            if (isLocalTx && tx != null)
            {
                await tx.RollbackAsync();
            }
            throw;
        }
        finally
        {
            if (isLocalTx && tx != null)
            {
                await tx.DisposeAsync();
            }
        }
    }

    public async Task<OperacionDto> RegistrarSalidaAsync(SalidaRequest request, int userId, string userName)
    {
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe debe ser mayor a cero.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var caja = await _context.Cajas
                .Include(c => c.EfectivoDisponible)
                .FirstOrDefaultAsync(c => c.Id == request.CajaId)
                ?? throw new InvalidOperationException("Caja de origen no encontrada.");

            if (!caja.Activa)
                throw new InvalidOperationException("No se pueden retirar fondos de una caja inactiva.");

            if (caja.SaldoActual < request.Importe)
                throw new InvalidOperationException($"Saldo insuficiente en '{caja.Nombre}'. Disponible: ${caja.SaldoActual:N2} MXN.");

            caja.SaldoActual -= request.Importe;

            var op = new Operacion
            {
                TipoOperacion = "SALIDA",
                CajaOrigenId = caja.Id,
                FechaOperacion = DateTime.UtcNow,
                Importe = request.Importe,
                Concepto = request.Concepto.Trim(),
                Descripcion = (request.Descripcion ?? request.Concepto).Trim(),
                Estado = "CONFIRMADA",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = request.Observaciones
            };

            _context.Operaciones.Add(op);
            await _context.SaveChangesAsync();

            if (request.Desglose != null && request.Desglose.Any())
            {
                await ProcesarDesgloseAsync(op.Id, request.Desglose, caja.Id, incrementar: false);
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "REGISTRO_SALIDA",
                Entidad = "Operacion",
                EntidadId = op.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Salida de ${request.Importe:N2} MXN de caja '{caja.Nombre}' por concepto '{op.Concepto}'"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return (await GetOperacionByIdAsync(op.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<OperacionDto> RegistrarTransferenciaAsync(TransferenciaRequest request, int userId, string userName)
    {
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe a transferir debe ser mayor a cero.");

        if (request.CajaOrigenId == request.CajaDestinoId)
            throw new InvalidOperationException("No se puede transferir dinero hacia la misma caja.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var origen = await _context.Cajas.Include(c => c.EfectivoDisponible).FirstOrDefaultAsync(c => c.Id == request.CajaOrigenId)
                ?? throw new InvalidOperationException("Caja de origen no encontrada.");

            var destino = await _context.Cajas.Include(c => c.EfectivoDisponible).FirstOrDefaultAsync(c => c.Id == request.CajaDestinoId)
                ?? throw new InvalidOperationException("Caja de destino no encontrada.");

            if (!origen.Activa || !destino.Activa)
                throw new InvalidOperationException("Ambas cajas deben estar activas para realizar una transferencia.");

            if (origen.SaldoActual < request.Importe)
                throw new InvalidOperationException($"Saldo insuficiente en '{origen.Nombre}'. Disponible: ${origen.SaldoActual:N2} MXN.");

            // Operación atómica: resta y suma
            origen.SaldoActual -= request.Importe;
            destino.SaldoActual += request.Importe;

            var op = new Operacion
            {
                TipoOperacion = "TRANSFERENCIA",
                CajaOrigenId = origen.Id,
                CajaDestinoId = destino.Id,
                FechaOperacion = DateTime.UtcNow,
                Importe = request.Importe,
                Concepto = $"Transferencia de {origen.Nombre} a {destino.Nombre}",
                Descripcion = $"Traspaso interno de fondos por ${request.Importe:N2} MXN",
                Estado = "CONFIRMADA",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = request.Observaciones
            };

            _context.Operaciones.Add(op);
            await _context.SaveChangesAsync();

            if (request.Desglose != null && request.Desglose.Any())
            {
                await ProcesarDesgloseAsync(op.Id, request.Desglose, origen.Id, incrementar: false);
                await ActualizarEfectivoCajaAsync(destino.Id, request.Desglose, incrementar: true);
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "TRANSFERENCIA_INTERNA",
                Entidad = "Operacion",
                EntidadId = op.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Transferencia de ${request.Importe:N2} MXN de '{origen.Nombre}' a '{destino.Nombre}'. Patrimonio neto invariable."
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return (await GetOperacionByIdAsync(op.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<OperacionDto> AnularOperacionAsync(int operacionId, string motivo, int userId, string userName)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw new InvalidOperationException("Debe indicar el motivo de la anulación/reversa.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var opOriginal = await _context.Operaciones
                .Include(o => o.Detalles)
                .FirstOrDefaultAsync(o => o.Id == operacionId)
                ?? throw new InvalidOperationException("Operación no encontrada.");

            if (opOriginal.Estado == "ANULADA")
                throw new InvalidOperationException("Esta operación ya fue anulada previamente.");

            if (await _context.MovimientosPresupuesto.AnyAsync(m => m.OperacionTesoreriaId == opOriginal.Id))
                throw new InvalidOperationException("Las transferencias vinculadas a presupuestos de área deben corregirse mediante devolución o ajuste en el módulo de Presupuestos.");

            opOriginal.Estado = "ANULADA";

            // Crear operación inversa (REVERSA)
            var opReversa = new Operacion
            {
                TipoOperacion = "REVERSA",
                OperacionRelacionadaId = opOriginal.Id,
                FechaOperacion = DateTime.UtcNow,
                Importe = opOriginal.Importe,
                Concepto = $"Reversión de operación #{opOriginal.Id} ({opOriginal.TipoOperacion})",
                Descripcion = motivo,
                Estado = "CONFIRMADA",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = $"Reversa de: {opOriginal.Concepto}"
            };

            // Invertir saldos según tipo
            if (opOriginal.TipoOperacion == "ENTRADA" && opOriginal.CajaDestinoId.HasValue)
            {
                var caja = await _context.Cajas.FindAsync(opOriginal.CajaDestinoId.Value);
                if (caja != null)
                {
                    if (caja.SaldoActual < opOriginal.Importe)
                        throw new InvalidOperationException($"No se puede revertir la entrada: la caja '{caja.Nombre}' no cuenta con saldo suficiente (${caja.SaldoActual:N2} MXN).");
                    caja.SaldoActual -= opOriginal.Importe;
                    opReversa.CajaOrigenId = caja.Id;
                }
            }
            else if (opOriginal.TipoOperacion == "SALIDA" && opOriginal.CajaOrigenId.HasValue)
            {
                var caja = await _context.Cajas.FindAsync(opOriginal.CajaOrigenId.Value);
                if (caja != null)
                {
                    caja.SaldoActual += opOriginal.Importe;
                    opReversa.CajaDestinoId = caja.Id;
                }
            }
            else if (opOriginal.TipoOperacion == "TRANSFERENCIA")
            {
                var origen = await _context.Cajas.FindAsync(opOriginal.CajaOrigenId);
                var destino = await _context.Cajas.FindAsync(opOriginal.CajaDestinoId);
                if (origen != null && destino != null)
                {
                    if (destino.SaldoActual < opOriginal.Importe)
                        throw new InvalidOperationException($"No se puede revertir la transferencia: la caja destino '{destino.Nombre}' no cuenta con saldo suficiente.");
                    destino.SaldoActual -= opOriginal.Importe;
                    origen.SaldoActual += opOriginal.Importe;

                    opReversa.CajaOrigenId = destino.Id;
                    opReversa.CajaDestinoId = origen.Id;
                }
            }

            _context.Operaciones.Add(opReversa);

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "ANULACION_OPERACION",
                Entidad = "Operacion",
                EntidadId = opOriginal.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Anulación de operación #{opOriginal.Id} ({opOriginal.TipoOperacion}). Reversa generada #{opReversa.Id}. Motivo: {motivo}"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return (await GetOperacionByIdAsync(opReversa.Id))!;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<List<OperacionDto>> GetHistorialOperacionesAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin,
        int? cajaId,
        string? tipoOperacion,
        string? usuarioNombre)
    {
        var query = _context.Operaciones
            .Include(o => o.CajaOrigen)
            .Include(o => o.CajaDestino)
            .Include(o => o.Detalles).ThenInclude(d => d.Denominacion)
            .Include(o => o.Detalles).ThenInclude(d => d.TipoBolsa)
            .AsQueryable();

        if (fechaInicio.HasValue)
            query = query.Where(o => o.FechaOperacion >= fechaInicio.Value);

        if (fechaFin.HasValue)
            query = query.Where(o => o.FechaOperacion <= fechaFin.Value.AddDays(1).AddTicks(-1));

        if (cajaId.HasValue)
            query = query.Where(o => o.CajaOrigenId == cajaId.Value || o.CajaDestinoId == cajaId.Value);

        if (!string.IsNullOrWhiteSpace(tipoOperacion))
            query = query.Where(o => o.TipoOperacion == tipoOperacion);

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
            query = query.Where(o => o.UsuarioNombre.ToLower().Contains(usuarioNombre.ToLower()));

        var list = await query.OrderByDescending(o => o.FechaRegistro).ToListAsync();
        return list.Select(MapToOperacionDto).ToList();
    }

    public async Task<List<Auditoria>> GetAuditoriaAsync()
    {
        return await _context.Auditoria
            .OrderByDescending(a => a.FechaHora)
            .Take(100)
            .ToListAsync();
    }

    // Helper methods
    private async Task ProcesarDesgloseAsync(int operacionId, List<DetalleMovimientoInput> desglose, int cajaId, bool incrementar)
    {
        foreach (var item in desglose.Where(i => i.Cantidad > 0))
        {
            decimal valorUnitario = 0;
            if (item.DenominacionId.HasValue)
            {
                var den = await _context.Denominaciones.FindAsync(item.DenominacionId.Value);
                valorUnitario = den?.Valor ?? 0;
            }
            else if (item.TipoBolsaId.HasValue)
            {
                var bolsa = await _context.TiposBolsas.FindAsync(item.TipoBolsaId.Value);
                valorUnitario = bolsa?.ValorUnitario ?? 0;
            }

            var subtotal = valorUnitario * item.Cantidad;

            _context.DetalleOperaciones.Add(new DetalleOperacion
            {
                OperacionId = operacionId,
                TipoEfectivo = item.TipoEfectivo,
                DenominacionId = item.DenominacionId,
                TipoBolsaId = item.TipoBolsaId,
                ValorUnitarioHistorico = valorUnitario,
                Cantidad = item.Cantidad,
                Subtotal = subtotal
            });
        }

        await ActualizarEfectivoCajaAsync(cajaId, desglose, incrementar);
    }

    private async Task ActualizarEfectivoCajaAsync(int cajaId, List<DetalleMovimientoInput> desglose, bool incrementar)
    {
        var cajaEfectivo = await _context.CajasEfectivo.Where(e => e.CajaId == cajaId).ToListAsync();

        foreach (var item in desglose.Where(i => i.Cantidad > 0))
        {
            var existente = cajaEfectivo.FirstOrDefault(e =>
                e.TipoEfectivo == item.TipoEfectivo &&
                e.DenominacionId == item.DenominacionId &&
                e.TipoBolsaId == item.TipoBolsaId);

            if (existente != null)
            {
                if (incrementar)
                    existente.Cantidad += item.Cantidad;
                else
                    existente.Cantidad = Math.Max(0, existente.Cantidad - item.Cantidad);
            }
            else if (incrementar)
            {
                _context.CajasEfectivo.Add(new CajaEfectivo
                {
                    CajaId = cajaId,
                    TipoEfectivo = item.TipoEfectivo,
                    DenominacionId = item.DenominacionId,
                    TipoBolsaId = item.TipoBolsaId,
                    Cantidad = item.Cantidad
                });
            }
        }
    }

    private async Task<OperacionDto?> GetOperacionByIdAsync(int id)
    {
        var o = await _context.Operaciones
            .Include(o => o.CajaOrigen)
            .Include(o => o.CajaDestino)
            .Include(o => o.Detalles).ThenInclude(d => d.Denominacion)
            .Include(o => o.Detalles).ThenInclude(d => d.TipoBolsa)
            .FirstOrDefaultAsync(o => o.Id == id);

        return o == null ? null : MapToOperacionDto(o);
    }

    private static CajaDto MapToCajaDto(Caja c)
    {
        var desglose = c.EfectivoDisponible.Select(e =>
        {
            decimal unitVal = e.Denominacion?.Valor ?? e.TipoBolsa?.ValorUnitario ?? 0;
            return new CajaEfectivoItemDto(
                e.Id,
                e.TipoEfectivo,
                e.DenominacionId,
                e.Denominacion?.Nombre,
                unitVal,
                e.TipoBolsaId,
                e.TipoBolsa?.Nombre,
                e.Cantidad,
                unitVal * e.Cantidad
            );
        }).ToList();

        return new CajaDto(
            c.Id,
            c.Nombre,
            c.Descripcion,
            c.Finalidad,
            c.Activa,
            c.SaldoActual,
            c.FechaCreacion,
            c.CreadoPor,
            c.UltimoConteoFecha,
            c.EstadoVerificacion,
            desglose,
            c.Tipo ?? "EFECTIVO"
        );
    }

    private static OperacionDto MapToOperacionDto(Operacion o)
    {
        var detalles = o.Detalles.Select(d => new DetalleOperacionDto(
            d.Id,
            d.TipoEfectivo,
            d.DenominacionId,
            d.Denominacion?.Nombre,
            d.TipoBolsaId,
            d.TipoBolsa?.Nombre,
            d.ValorUnitarioHistorico,
            d.Cantidad,
            d.Subtotal
        )).ToList();

        return new OperacionDto(
            o.Id,
            o.TipoOperacion,
            o.CajaOrigenId,
            o.CajaOrigen?.Nombre,
            o.CajaDestinoId,
            o.CajaDestino?.Nombre,
            o.FechaOperacion,
            o.Importe,
            o.Concepto,
            o.Descripcion,
            o.Estado,
            o.UsuarioId,
            o.UsuarioNombre,
            o.FechaRegistro,
            o.OperacionRelacionadaId,
            o.Observaciones,
            detalles
        );
    }
}
