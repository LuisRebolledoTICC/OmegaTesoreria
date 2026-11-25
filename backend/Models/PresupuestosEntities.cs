namespace OmegaTesoreria.Api.Models;

// ========== MÓDULO PRESUPUESTOS POR ÁREA ==========

public class PresupuestoArea
{
    public int Id { get; set; }
    public int AreaId { get; set; }
    public decimal SaldoDisponible { get; set; } = 0.00m;
    public decimal TotalRecibido { get; set; } = 0.00m;
    public decimal TotalGastado { get; set; } = 0.00m;
    public decimal TotalDevuelto { get; set; } = 0.00m;
    public decimal TotalAjustes { get; set; } = 0.00m;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

    public Area? Area { get; set; }
    public ICollection<MovimientoPresupuesto> Movimientos { get; set; } = new List<MovimientoPresupuesto>();
}

public class MovimientoPresupuesto
{
    public int Id { get; set; }
    public int PresupuestoAreaId { get; set; }
    public int AreaId { get; set; }

    /// <summary>
    /// ENTREGA, EGRESO, DEVOLUCION, AJUSTE
    /// </summary>
    public string TipoMovimiento { get; set; } = string.Empty;

    /// <summary>
    /// VIGENTE, CANCELADO
    /// </summary>
    public string Estado { get; set; } = "VIGENTE";

    /// <summary>
    /// Importe del movimiento. Positivo para ENTREGA, EGRESO, DEVOLUCION; positivo o negativo para AJUSTE.
    /// </summary>
    public decimal Importe { get; set; }

    public DateTime FechaMovimiento { get; set; } = DateTime.UtcNow;
    public string Concepto { get; set; } = string.Empty;
    public string? Descripcion { get; set; }

    public int? CajaId { get; set; }
    public string? CajaNombre { get; set; }
    public int? OperacionTesoreriaId { get; set; }

    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;

    public string? EditadoPor { get; set; }
    public DateTime? FechaUltimaEdicion { get; set; }

    public string? CanceladoPor { get; set; }
    public DateTime? FechaCancelacion { get; set; }
    public string? MotivoCancelacion { get; set; }

    public PresupuestoArea? PresupuestoArea { get; set; }
    public Area? Area { get; set; }
    public Caja? Caja { get; set; }
    public Operacion? OperacionTesoreria { get; set; }
    public ICollection<PresupuestoEvidencia> Evidencias { get; set; } = new List<PresupuestoEvidencia>();
    public ICollection<PresupuestoMovimientoHistorial> HistorialModificaciones { get; set; } = new List<PresupuestoMovimientoHistorial>();
}

public class PresupuestoEvidencia
{
    public int Id { get; set; }
    public int MovimientoPresupuestoId { get; set; }
    public string NombreArchivo { get; set; } = string.Empty;
    public string ContentType { get; set; } = "image/jpeg";
    public string DatosBase64 { get; set; } = string.Empty;
    public DateTime FechaSubida { get; set; } = DateTime.UtcNow;

    public MovimientoPresupuesto? MovimientoPresupuesto { get; set; }
}

public class PresupuestoMovimientoHistorial
{
    public int Id { get; set; }
    public int MovimientoPresupuestoId { get; set; }
    public string Accion { get; set; } = "EDICION"; // EDICION, CANCELACION
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public DateTime FechaCambio { get; set; } = DateTime.UtcNow;
    public string? ValoresAnterioresJson { get; set; }
    public string? ValoresNuevosJson { get; set; }
    public string? Detalle { get; set; }

    public MovimientoPresupuesto? MovimientoPresupuesto { get; set; }
}
