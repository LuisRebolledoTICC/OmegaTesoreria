namespace OmegaTesoreria.Api.DTOs;

// ─── DEUDAS ────────────────────────────────────────────────────────────────────

public record ActividadDeudaDto(
    int Id,
    string Nombre,
    decimal Importe,
    DateTime FechaActividad,
    string? Descripcion,
    bool Activa,
    string CreadoPor,
    DateTime FechaCreacion,
    int TotalAsignados,
    int TotalPendientes,
    int TotalPagados,
    int TotalNoAsistio,
    decimal TotalRecaudado,
    decimal TotalPorCobrar
);

public record CreateActividadDeudaRequest(
    string Nombre,
    decimal Importe,
    DateTime FechaActividad,
    string? Descripcion
);

public record UpdateActividadDeudaRequest(
    string Nombre,
    decimal Importe,
    DateTime FechaActividad,
    string? Descripcion
);

public record UsuarioDeudaResumenDto(
    int UsuarioId,
    string UserName,
    string Nombre,
    string Rol,
    decimal DeudaTotal,
    decimal TotalPagado,
    int ActividadesPendientes,
    int ActividadesPagadas,
    int ActividadesNoAsistio,
    int TotalActividades
);

public record AsignacionDeudaDto(
    int Id,
    int ActividadDeudaId,
    string ActividadNombre,
    DateTime FechaActividad,
    string? ActividadDescripcion,
    decimal ImporteOriginal,
    int UsuarioId,
    string UsuarioNombre,
    string Estado,
    decimal TotalAbonado,
    decimal SaldoPendiente,
    decimal DeudaCorrespondiente,
    string? FormaPago,
    int? CajaId,
    string? CajaNombre,
    int? OperacionTesoreriaId,
    DateTime? FechaPago,
    string? RegistradoPagoPor,
    DateTime FechaAsignacion,
    List<HistorialPagoDeudaDto>? Abonos = null
);

public record UsuarioDeudaDetalleDto(
    UsuarioDeudaResumenDto Resumen,
    List<AsignacionDeudaDto> Actividades
);

public record RegistrarPagoDeudaRequest(
    decimal? Importe, // Opcional: si es null o <= 0, abona el saldo pendiente completo
    string FormaPago, // EFECTIVO | TRANSFERENCIA
    int CajaId,
    DateTime? FechaPago
);

public record CambiarEstadoAsignacionRequest(
    string NuevoEstado, // PENDIENTE | NO_ASISTIO
    string? Motivo
);

public record RevertirPagoDeudaRequest(
    string Motivo,
    int? HistorialPagoId = null // Opcional: id específico del abono a revertir
);

public record HistorialPagoDeudaDto(
    int Id,
    int AsignacionActividadDeudaId,
    int ActividadDeudaId,
    string ActividadNombre,
    int UsuarioId,
    string UsuarioNombre,
    decimal Importe,
    string FormaPago,
    int CajaId,
    string CajaNombre,
    int OperacionTesoreriaId,
    int? OperacionReversaId,
    string Estado,
    DateTime FechaPago,
    string RegistradoPor,
    DateTime? FechaReversion,
    string? RevertidoPor,
    string? MotivoReversion
);

public record DeudasResumenGlobalDto(
    decimal TotalDeudaPendiente,
    decimal TotalRecaudado,
    int UsuariosConDeuda,
    List<UsuarioDeudaResumenDto> Usuarios
);

// ─── EVENTOS ───────────────────────────────────────────────────────────────────

public record EventoOmegaDto(
    int Id,
    string Nombre,
    DateTime FechaHora,
    string? Ubicacion,
    string? Descripcion,
    string Estado,
    string CreadoPor,
    DateTime FechaCreacion,
    string? CanceladoPor,
    DateTime? FechaCancelacion,
    string? MotivoCancelacion
);

public record CreateOrUpdateEventoRequest(
    string Nombre,
    DateTime FechaHora,
    string? Ubicacion,
    string? Descripcion
);

public record CancelarEventoRequest(
    string? Motivo
);

// ─── VENTAS Y PEDIDOS: CAMBIO RÁPIDO MÉTODO DE PAGO ────────────────────────────

public record UpdateMetodoPagoRapidoRequest(
    string MetodoPago // PENDIENTE | EFECTIVO | TRANSFERENCIA
);
