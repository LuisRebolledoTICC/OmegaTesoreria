namespace OmegaTesoreria.Api.DTOs;

public record PresupuestoAreaResumenDto(
    int AreaId,
    string AreaNombre,
    string? AreaDescripcion,
    bool AreaActiva,
    int? CoordinadorId,
    string? CoordinadorNombre,
    decimal TotalRecibido,
    decimal TotalGastado,
    decimal TotalDevuelto,
    decimal TotalAjustes,
    decimal SaldoDisponible,
    DateTime? UltimaActualizacion,
    int TotalMovimientos
);

public record PresupuestoEvidenciaDto(
    int Id,
    string NombreArchivo,
    string ContentType,
    string DatosBase64,
    DateTime FechaSubida
);

public record PresupuestoEvidenciaInput(
    string NombreArchivo,
    string ContentType,
    string DatosBase64
);

public record PresupuestoMovimientoHistorialDto(
    int Id,
    string Accion,
    string UsuarioNombre,
    DateTime FechaCambio,
    string? ValoresAnterioresJson,
    string? ValoresNuevosJson,
    string? Detalle
);

public record MovimientoPresupuestoDto(
    int Id,
    int AreaId,
    string AreaNombre,
    string TipoMovimiento,
    string Estado,
    decimal Importe,
    DateTime FechaMovimiento,
    string Concepto,
    string? Descripcion,
    int? CajaId,
    string? CajaNombre,
    int? OperacionTesoreriaId,
    int UsuarioId,
    string UsuarioNombre,
    DateTime FechaRegistro,
    string? EditadoPor,
    DateTime? FechaUltimaEdicion,
    string? CanceladoPor,
    DateTime? FechaCancelacion,
    string? MotivoCancelacion,
    List<PresupuestoEvidenciaDto> Evidencias,
    List<PresupuestoMovimientoHistorialDto> HistorialModificaciones
);

public record PresupuestoAreaDetalleDto(
    PresupuestoAreaResumenDto Resumen,
    List<MovimientoPresupuestoDto> Movimientos
);

public record AsignarPresupuestoRequest(
    int CajaOrigenId,
    int AreaDestinoId,
    decimal Importe,
    DateTime Fecha,
    string? Descripcion
);

public record RegistrarEgresoPresupuestoRequest(
    int AreaId,
    string Concepto,
    decimal Importe,
    DateTime Fecha,
    string? Descripcion,
    List<PresupuestoEvidenciaInput>? Evidencias
);

public record EditarEgresoPresupuestoRequest(
    string Concepto,
    decimal Importe,
    DateTime Fecha,
    string? Descripcion,
    List<int>? ConservarEvidenciaIds,
    List<PresupuestoEvidenciaInput>? NuevasEvidencias
);

public record CancelarEgresoPresupuestoRequest(
    string? Motivo
);

public record DevolverPresupuestoRequest(
    int AreaOrigenId,
    int CajaDestinoId,
    decimal Importe,
    DateTime Fecha,
    string? Descripcion
);

public record AjustePresupuestoRequest(
    int AreaId,
    decimal Importe,
    DateTime Fecha,
    string Motivo
);
