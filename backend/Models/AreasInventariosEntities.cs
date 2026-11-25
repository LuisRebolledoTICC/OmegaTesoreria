namespace OmegaTesoreria.Api.Models;

// ========== MÓDULO ÁREAS ==========

public class Area
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activa { get; set; } = true;
    public int? CoordinadorId { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public User? Coordinador { get; set; }
    public ICollection<AreaIntegrante> Integrantes { get; set; } = new List<AreaIntegrante>();
    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
    public ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();
}

public class AreaIntegrante
{
    public int Id { get; set; }
    public int AreaId { get; set; }
    public int UsuarioId { get; set; }
    public DateTime FechaAsignacion { get; set; } = DateTime.UtcNow;

    public Area? Area { get; set; }
    public User? Usuario { get; set; }
}

// ========== MÓDULO INVENTARIOS ==========

public class Producto
{
    public int Id { get; set; }
    public int AreaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal CantidadActual { get; set; } = 0;
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Area? Area { get; set; }
}

public class Inventario
{
    public int Id { get; set; }
    public int AreaId { get; set; }
    public DateTime FechaInventario { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? Observaciones { get; set; }

    public Area? Area { get; set; }
    public ICollection<InventarioDetalle> Detalles { get; set; } = new List<InventarioDetalle>();
}

public class InventarioDetalle
{
    public int Id { get; set; }
    public int InventarioId { get; set; }
    public int? ProductoId { get; set; }
    public string NombreProducto { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }

    public Inventario? Inventario { get; set; }
    public Producto? Producto { get; set; }
}
