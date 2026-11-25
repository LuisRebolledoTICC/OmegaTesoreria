namespace OmegaTesoreria.Api.DTOs;

// ========== ÁREAS ==========

public record AreaDto(
    int Id,
    string Nombre,
    string? Descripcion,
    bool Activa,
    int? CoordinadorId,
    string? CoordinadorNombre,
    DateTime FechaCreacion,
    List<AreaIntegranteDto> Integrantes
);

public record AreaIntegranteDto(
    int Id,
    int UsuarioId,
    string UsuarioNombre,
    string UsuarioUserName,
    DateTime FechaAsignacion
);

public class CreateAreaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public int? CoordinadorId { get; set; }
}

public class UpdateAreaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activa { get; set; }
    public int? CoordinadorId { get; set; }
}

public class AddIntegranteRequest
{
    public int UsuarioId { get; set; }
    public bool ForzarCambio { get; set; } = false;
}

public class AddIntegrantesBatchRequest
{
    public List<int> UsuarioIds { get; set; } = new();
}

// ========== INVENTARIOS ==========

public record ProductoDto(
    int Id,
    int AreaId,
    string Nombre,
    string UnidadMedida,
    decimal CantidadActual,
    bool Activo,
    DateTime FechaCreacion
);

public class CreateProductoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal CantidadActual { get; set; } = 0;
}

public class UpdateProductoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal CantidadActual { get; set; } = 0;
}

public record InventarioResumenDto(
    int Id,
    int AreaId,
    string AreaNombre,
    DateTime FechaInventario,
    DateTime FechaRegistro,
    string UsuarioNombre,
    string? Observaciones,
    int TotalProductos
);

public record InventarioDetalleDto(
    int Id,
    int AreaId,
    string AreaNombre,
    DateTime FechaInventario,
    DateTime FechaRegistro,
    string UsuarioNombre,
    string? Observaciones,
    List<InventarioItemDto> Detalles
);

public record InventarioItemDto(
    int Id,
    int? ProductoId,
    string NombreProducto,
    string UnidadMedida,
    decimal Cantidad
);

public class CargarInventarioRequest
{
    public DateTime FechaInventario { get; set; }
    public string? Observaciones { get; set; }
    public List<CargarInventarioItemRequest> Items { get; set; } = new();
}

public class CargarInventarioItemRequest
{
    public string Producto { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string UnidadMedida { get; set; } = string.Empty;
}
