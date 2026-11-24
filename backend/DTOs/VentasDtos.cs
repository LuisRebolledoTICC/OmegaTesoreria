namespace OmegaTesoreria.Api.DTOs;

public record VentaResumenDto(
    int Id,
    string Nombre,
    DateTime FechaVenta,
    string Estado,
    DateTime FechaCreacion,
    string CreadoPor,
    DateTime? FechaCierre,
    string? CerradoPor,
    int TotalPedidos,
    int PedidosPendientes,
    int PedidosEntregados,
    int PedidosCancelados,
    decimal TotalVendido,
    decimal TotalEfectivo,
    decimal TotalTransferencia,
    decimal TotalPendientePago,
    int? EntradaEfectivoOperacionId,
    int? EntradaTransferenciaOperacionId
);

public record CreateVentaRequest(string Nombre, DateTime FechaVenta);
public record UpdateVentaRequest(string Nombre, DateTime FechaVenta);

public record VentaDetalleDto(
    int Id,
    string Nombre,
    DateTime FechaVenta,
    string Estado,
    DateTime FechaCreacion,
    string CreadoPor,
    DateTime? FechaCierre,
    string? CerradoPor,
    int? EntradaEfectivoOperacionId,
    int? EntradaTransferenciaOperacionId,
    decimal TotalEfectivoIngresado,
    decimal TotalTransferenciaIngresado,
    VentaMetricasDto Metricas,
    List<VentaProductoDto> Productos,
    List<PedidoDto> Pedidos
);

public record VentaMetricasDto(
    int TotalPedidos,
    int PedidosPendientes,
    int PedidosEntregados,
    int PedidosCancelados,
    decimal TotalVendido,
    decimal TotalEfectivo,
    decimal TotalTransferencia,
    decimal TotalPendientePago
);

// Productos y Presentaciones
public record VentaProductoDto(
    int Id,
    int VentaId,
    string Nombre,
    string? Descripcion,
    int Orden,
    List<VentaPresentacionDto> Presentaciones
);

public record VentaPresentacionDto(
    int Id,
    int VentaProductoId,
    string Nombre,
    decimal Precio,
    int Orden
);

public record CreateOrUpdateProductoRequest(
    string Nombre,
    string? Descripcion,
    int Orden,
    List<CreateOrUpdatePresentacionRequest> Presentaciones
);

public record CreateOrUpdatePresentacionRequest(
    int? Id,
    string Nombre,
    decimal Precio,
    int Orden
);

// Pedidos
public record PedidoDto(
    int Id,
    int VentaId,
    int Folio,
    string? NombreCliente,
    DateTime FechaHora,
    decimal TotalPedido,
    string EstadoEntrega,
    string EstadoPago,
    string? Observaciones,
    string RegistradoPor,
    List<PedidoDetalleDto> Detalles,
    List<PedidoPagoDto> Pagos
);

public record PedidoDetalleDto(
    int Id,
    int PedidoId,
    int? VentaPresentacionId,
    string ProductoNombre,
    string PresentacionNombre,
    int Cantidad,
    decimal PrecioUnitario,
    decimal Subtotal
);

public record PedidoPagoDto(
    int Id,
    int PedidoId,
    string MetodoPago,
    decimal Importe,
    string? Referencia,
    DateTime FechaPago
);

public record CreatePedidoRequest(
    string? NombreCliente,
    string? Observaciones,
    string EstadoEntrega, // "PENDIENTE", "ENTREGADO"
    List<ItemPedidoRequest> Items,
    List<PagoPedidoRequest> Pagos
);

public record ItemPedidoRequest(
    int VentaPresentacionId,
    int Cantidad
);

public record PagoPedidoRequest(
    string MetodoPago, // "EFECTIVO", "TRANSFERENCIA", "PENDIENTE"
    decimal Importe,
    string? Referencia
);

public record UpdateEstadoEntregaRequest(string EstadoEntrega); // "PENDIENTE", "ENTREGADO", "CANCELADO"

public record RealizarEntradaVentaRequest(
    int CajaEfectivoId // Caja de destino para los pagos en efectivo
);

public record RealizarEntradaVentaResultDto(
    bool Exito,
    string Mensaje,
    int? OperacionEfectivoId,
    decimal ImporteEfectivo,
    int? OperacionTransferenciaId,
    decimal ImporteTransferencia
);
