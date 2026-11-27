namespace OmegaTesoreria.Api.Models;

/// <summary>
/// Actividad o concepto de deuda general asignado a los usuarios de Omega.
/// </summary>
public class ActividadDeuda
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal Importe { get; set; }
    public DateTime FechaActividad { get; set; } = DateTime.UtcNow;
    public string? Descripcion { get; set; }
    public bool Activa { get; set; } = true;
    public string CreadoPor { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public string? ModificadoPor { get; set; }
    public DateTime? FechaModificacion { get; set; }

    public ICollection<AsignacionActividadDeuda> Asignaciones { get; set; } = new List<AsignacionActividadDeuda>();
}

/// <summary>
/// Registro individual de una actividad de deuda para un usuario específico.
/// Estados posibles: PENDIENTE, PAGADO, NO_ASISTIO
/// </summary>
public class AsignacionActividadDeuda
{
    public int Id { get; set; }
    public int ActividadDeudaId { get; set; }
    public int UsuarioId { get; set; }

    /// <summary>PENDIENTE | PAGADO | NO_ASISTIO</summary>
    public string Estado { get; set; } = "PENDIENTE";

    /// <summary>EFECTIVO | TRANSFERENCIA (solo cuando Estado == PAGADO)</summary>
    public string? FormaPago { get; set; }
    public int? CajaId { get; set; }
    public int? OperacionTesoreriaId { get; set; }
    public DateTime? FechaPago { get; set; }
    public string? RegistradoPagoPor { get; set; }

    public DateTime FechaAsignacion { get; set; } = DateTime.UtcNow;
    public DateTime UltimaActualizacion { get; set; } = DateTime.UtcNow;
    public string? ActualizadoPor { get; set; }

    public ActividadDeuda? ActividadDeuda { get; set; }
    public User? Usuario { get; set; }
    public Caja? Caja { get; set; }
    public Operacion? OperacionTesoreria { get; set; }
    public ICollection<HistorialPagoDeuda> HistorialPagos { get; set; } = new List<HistorialPagoDeuda>();
}

/// <summary>
/// Historial inmutable de pagos registrados y sus posibles reversiones.
/// </summary>
public class HistorialPagoDeuda
{
    public int Id { get; set; }
    public int AsignacionActividadDeudaId { get; set; }
    public int ActividadDeudaId { get; set; }
    public int UsuarioId { get; set; }
    public decimal Importe { get; set; }

    /// <summary>EFECTIVO | TRANSFERENCIA</summary>
    public string FormaPago { get; set; } = string.Empty;
    public int CajaId { get; set; }
    public string CajaNombre { get; set; } = string.Empty;
    public int OperacionTesoreriaId { get; set; }
    public int? OperacionReversaId { get; set; }

    /// <summary>CONFIRMADO | REVERTIDO</summary>
    public string Estado { get; set; } = "CONFIRMADO";
    public DateTime FechaPago { get; set; } = DateTime.UtcNow;
    public string RegistradoPor { get; set; } = string.Empty;

    public DateTime? FechaReversion { get; set; }
    public string? RevertidoPor { get; set; }
    public string? MotivoReversion { get; set; }

    public AsignacionActividadDeuda? Asignacion { get; set; }
    public ActividadDeuda? ActividadDeuda { get; set; }
    public User? Usuario { get; set; }
    public Caja? Caja { get; set; }
}

/// <summary>
/// Eventos próximos e históricos de Omega.
/// </summary>
public class EventoOmega
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
    public string? Ubicacion { get; set; }
    public string? Descripcion { get; set; }

    /// <summary>ACTIVO | CANCELADO</summary>
    public string Estado { get; set; } = "ACTIVO";
    public string CreadoPor { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public string? ModificadoPor { get; set; }
    public DateTime? FechaModificacion { get; set; }
    public string? CanceladoPor { get; set; }
    public DateTime? FechaCancelacion { get; set; }
    public string? MotivoCancelacion { get; set; }
}
