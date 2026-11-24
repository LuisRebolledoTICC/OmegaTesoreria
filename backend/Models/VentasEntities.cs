namespace OmegaTesoreria.Api.Models;

public class Venta
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public DateTime FechaVenta { get; set; } = DateTime.UtcNow;
    public string Estado { get; set; } = "ABIERTA"; // ABIERTA, CERRADA
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public string CreadoPor { get; set; } = string.Empty;
    public DateTime? FechaCierre { get; set; }
    public string? CerradoPor { get; set; }

    // Enlace a ingresos generados en Tesorería cuando se hace "Realizar Entrada"
    public int? EntradaEfectivoOperacionId { get; set; }
    public int? EntradaTransferenciaOperacionId { get; set; }
    public decimal TotalEfectivoIngresado { get; set; } = 0.00m;
    public decimal TotalTransferenciaIngresado { get; set; } = 0.00m;

    public ICollection<VentaProducto> Productos { get; set; } = new List<VentaProducto>();
    public ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
}

public class VentaProducto
{
    public int Id { get; set; }
    public int VentaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public int Orden { get; set; } = 0;

    public Venta? Venta { get; set; }
    public ICollection<VentaPresentacion> Presentaciones { get; set; } = new List<VentaPresentacion>();
}

public class VentaPresentacion
{
    public int Id { get; set; }
    public int VentaProductoId { get; set; }
    public string Nombre { get; set; } = string.Empty; // ej. "Combo", "Individual", "Vaso grande", "Única"
    public decimal Precio { get; set; } = 0.00m;
    public int Orden { get; set; } = 0;

    public VentaProducto? VentaProducto { get; set; }
}

public class Pedido
{
    public int Id { get; set; }
    public int VentaId { get; set; }
    public int Folio { get; set; } // 1, 2, 3... correlativo dentro de la venta
    public string? NombreCliente { get; set; }
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public decimal TotalPedido { get; set; } = 0.00m;
    
    // Estado de entrega: "PENDIENTE", "ENTREGADO", "CANCELADO"
    public string EstadoEntrega { get; set; } = "PENDIENTE";

    // Estado de pago: "PAGADO", "PARCIAL", "PENDIENTE"
    public string EstadoPago { get; set; } = "PENDIENTE";

    public string? Observaciones { get; set; }
    public string RegistradoPor { get; set; } = string.Empty;

    public Venta? Venta { get; set; }
    public ICollection<PedidoDetalle> Detalles { get; set; } = new List<PedidoDetalle>();
    public ICollection<PedidoPago> Pagos { get; set; } = new List<PedidoPago>();
}

public class PedidoDetalle
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public int? VentaPresentacionId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string PresentacionNombre { get; set; } = string.Empty;
    public int Cantidad { get; set; } = 1;
    public decimal PrecioUnitario { get; set; } = 0.00m; // Congelado al momento del pedido
    public decimal Subtotal { get; set; } = 0.00m;

    public Pedido? Pedido { get; set; }
}

public class PedidoPago
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    // Metodo: "EFECTIVO", "TRANSFERENCIA", "PENDIENTE"
    public string MetodoPago { get; set; } = "EFECTIVO";
    public decimal Importe { get; set; } = 0.00m;
    public string? Referencia { get; set; }
    public DateTime FechaPago { get; set; } = DateTime.UtcNow;

    public Pedido? Pedido { get; set; }
}
