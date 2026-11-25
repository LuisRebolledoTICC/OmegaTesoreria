using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Services;

public interface IPresupuestosService
{
    Task<List<PresupuestoAreaResumenDto>> GetResumenAreasAsync(int userId, string userName, bool isAdmin);
    Task<PresupuestoAreaDetalleDto> GetDetalleAreaAsync(int areaId, int userId, string userName, bool isAdmin);
    Task<MovimientoPresupuestoDto> AsignarPresupuestoAsync(AsignarPresupuestoRequest request, int userId, string userName);
    Task<MovimientoPresupuestoDto> RegistrarEgresoAsync(RegistrarEgresoPresupuestoRequest request, int userId, string userName, bool isAdmin);
    Task<MovimientoPresupuestoDto> EditarEgresoAsync(int movimientoId, EditarEgresoPresupuestoRequest request, int userId, string userName, bool isAdmin);
    Task<MovimientoPresupuestoDto> CancelarEgresoAsync(int movimientoId, CancelarEgresoPresupuestoRequest request, int userId, string userName, bool isAdmin);
    Task<MovimientoPresupuestoDto> DevolverPresupuestoAsync(DevolverPresupuestoRequest request, int userId, string userName);
    Task<MovimientoPresupuestoDto> RegistrarAjusteAsync(AjustePresupuestoRequest request, int userId, string userName);
}

public class PresupuestosService : IPresupuestosService
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public PresupuestosService(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    private async Task<bool> CanViewAllAreasAsync(string userName, bool isAdmin)
    {
        if (isAdmin) return true;
        return await _authService.HasPermissionAsync(userName, "presupuestos_ver_todos")
            || await _authService.HasPermissionAsync(userName, "presupuestos_administrar");
    }

    private async Task<bool> UserBelongsToAreaAsync(int areaId, int userId)
    {
        var isCoord = await _context.Areas.AnyAsync(a => a.Id == areaId && a.CoordinadorId == userId);
        if (isCoord) return true;
        return await _context.AreaIntegrantes.AnyAsync(ai => ai.AreaId == areaId && ai.UsuarioId == userId);
    }

    private async Task<PresupuestoArea> GetOrCreatePresupuestoAreaAsync(int areaId)
    {
        var p = await _context.PresupuestosArea.FirstOrDefaultAsync(x => x.AreaId == areaId);
        if (p != null) return p;

        p = new PresupuestoArea
        {
            AreaId = areaId,
            SaldoDisponible = 0.00m,
            TotalRecibido = 0.00m,
            TotalGastado = 0.00m,
            TotalDevuelto = 0.00m,
            TotalAjustes = 0.00m,
            FechaCreacion = DateTime.UtcNow,
            FechaActualizacion = DateTime.UtcNow
        };
        _context.PresupuestosArea.Add(p);
        await _context.SaveChangesAsync();
        return p;
    }

    private static MovimientoPresupuestoDto MapMovimientoDto(MovimientoPresupuesto m, string areaNombre, bool ocultarDetalleEntrega)
    {
        bool hideEntrega = ocultarDetalleEntrega && m.TipoMovimiento == "ENTREGA";
        return new MovimientoPresupuestoDto(
            m.Id,
            m.AreaId,
            areaNombre,
            m.TipoMovimiento,
            m.Estado,
            m.Importe,
            m.FechaMovimiento,
            hideEntrega ? "Entrega de presupuesto" : m.Concepto,
            hideEntrega ? null : m.Descripcion,
            hideEntrega ? null : m.CajaId,
            hideEntrega ? null : m.CajaNombre,
            hideEntrega ? null : m.OperacionTesoreriaId,
            hideEntrega ? 0 : m.UsuarioId,
            hideEntrega ? "" : m.UsuarioNombre,
            m.FechaRegistro,
            m.EditadoPor,
            m.FechaUltimaEdicion,
            m.CanceladoPor,
            m.FechaCancelacion,
            m.MotivoCancelacion,
            m.Evidencias
                .OrderBy(e => e.Id)
                .Select(e => new PresupuestoEvidenciaDto(e.Id, e.NombreArchivo, e.ContentType, e.DatosBase64, e.FechaSubida))
                .ToList(),
            m.HistorialModificaciones
                .OrderByDescending(h => h.FechaCambio)
                .Select(h => new PresupuestoMovimientoHistorialDto(h.Id, h.Accion, h.UsuarioNombre, h.FechaCambio, h.ValoresAnterioresJson, h.ValoresNuevosJson, h.Detalle))
                .ToList()
        );
    }

    public async Task<List<PresupuestoAreaResumenDto>> GetResumenAreasAsync(int userId, string userName, bool isAdmin)
    {
        bool canViewAll = await CanViewAllAreasAsync(userName, isAdmin);

        var areasQuery = _context.Areas
            .Include(a => a.Coordinador)
            .Include(a => a.Integrantes)
            .Where(a => a.Activa);

        if (!canViewAll)
        {
            areasQuery = areasQuery.Where(a => a.CoordinadorId == userId || a.Integrantes.Any(i => i.UsuarioId == userId));
        }

        var areas = await areasQuery.OrderBy(a => a.Nombre).ToListAsync();
        var areaIds = areas.Select(a => a.Id).ToList();

        var presupuestos = await _context.PresupuestosArea
            .Where(p => areaIds.Contains(p.AreaId))
            .ToDictionaryAsync(p => p.AreaId);

        var counts = await _context.MovimientosPresupuesto
            .Where(m => areaIds.Contains(m.AreaId))
            .GroupBy(m => m.AreaId)
            .Select(g => new { AreaId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AreaId, x => x.Count);

        return areas.Select(a =>
        {
            presupuestos.TryGetValue(a.Id, out var p);
            counts.TryGetValue(a.Id, out var movCount);
            return new PresupuestoAreaResumenDto(
                a.Id,
                a.Nombre,
                a.Descripcion,
                a.Activa,
                a.CoordinadorId,
                a.Coordinador?.Nombre,
                p?.TotalRecibido ?? 0m,
                p?.TotalGastado ?? 0m,
                p?.TotalDevuelto ?? 0m,
                p?.TotalAjustes ?? 0m,
                p?.SaldoDisponible ?? 0m,
                p?.FechaActualizacion,
                movCount
            );
        }).ToList();
    }

    public async Task<PresupuestoAreaDetalleDto> GetDetalleAreaAsync(int areaId, int userId, string userName, bool isAdmin)
    {
        var area = await _context.Areas
            .Include(a => a.Coordinador)
            .FirstOrDefaultAsync(a => a.Id == areaId)
            ?? throw new KeyNotFoundException("Área no encontrada.");

        bool canViewAll = await CanViewAllAreasAsync(userName, isAdmin);
        if (!canViewAll)
        {
            if (!area.Activa)
                throw new UnauthorizedAccessException("El área no se encuentra activa.");
            bool belongs = await UserBelongsToAreaAsync(areaId, userId);
            if (!belongs)
                throw new UnauthorizedAccessException("No tienes acceso al presupuesto de otra área.");
        }

        var p = await _context.PresupuestosArea.FirstOrDefaultAsync(x => x.AreaId == areaId);

        bool canViewHistorial = isAdmin
            || await _authService.HasPermissionAsync(userName, "presupuestos_historial")
            || await _authService.HasPermissionAsync(userName, "presupuestos_administrar");

        var movimientos = new List<MovimientoPresupuesto>();
        if (canViewHistorial)
        {
            movimientos = await _context.MovimientosPresupuesto
                .Where(m => m.AreaId == areaId)
                .Include(m => m.Evidencias)
                .Include(m => m.HistorialModificaciones)
                .OrderByDescending(m => m.FechaMovimiento)
                .ThenByDescending(m => m.Id)
                .ToListAsync();
        }

        // En el historial del área, las entregas realizadas desde Tesorería muestran únicamente fecha e importe para usuarios no administradores
        bool ocultarDetalleEntrega = !isAdmin && !await _authService.HasPermissionAsync(userName, "presupuestos_administrar");

        var resumen = new PresupuestoAreaResumenDto(
            area.Id,
            area.Nombre,
            area.Descripcion,
            area.Activa,
            area.CoordinadorId,
            area.Coordinador?.Nombre,
            p?.TotalRecibido ?? 0m,
            p?.TotalGastado ?? 0m,
            p?.TotalDevuelto ?? 0m,
            p?.TotalAjustes ?? 0m,
            p?.SaldoDisponible ?? 0m,
            p?.FechaActualizacion,
            movimientos.Count
        );

        var movDtos = movimientos.Select(m => MapMovimientoDto(m, area.Nombre, ocultarDetalleEntrega)).ToList();
        return new PresupuestoAreaDetalleDto(resumen, movDtos);
    }

    public async Task<MovimientoPresupuestoDto> AsignarPresupuestoAsync(AsignarPresupuestoRequest request, int userId, string userName)
    {
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe a asignar debe ser mayor a cero.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var caja = await _context.Cajas.FirstOrDefaultAsync(c => c.Id == request.CajaOrigenId)
                ?? throw new InvalidOperationException("Caja de origen no encontrada.");
            if (!caja.Activa)
                throw new InvalidOperationException("No se puede asignar presupuesto desde una caja inactiva.");
            if (caja.SaldoActual < request.Importe)
                throw new InvalidOperationException($"Saldo insuficiente en '{caja.Nombre}'. Disponible: ${caja.SaldoActual:N2} MXN.");

            var area = await _context.Areas.FirstOrDefaultAsync(a => a.Id == request.AreaDestinoId)
                ?? throw new InvalidOperationException("Área de destino no encontrada.");
            if (!area.Activa)
                throw new InvalidOperationException("No se puede asignar presupuesto a un área desactivada.");

            var fechaUtc = request.Fecha.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.Fecha, DateTimeKind.Utc)
                : request.Fecha.ToUniversalTime();

            // 1. Descontar de la caja
            caja.SaldoActual -= request.Importe;

            // 2. Registrar operación interna en Tesorería (tipo TRANSFERENCIA para no contabilizarse como gasto definitivo)
            var descOperacion = string.IsNullOrWhiteSpace(request.Descripcion)
                ? $"Transferencia interna de Tesorería al presupuesto del área '{area.Nombre}'."
                : request.Descripcion.Trim();

            var opTesoreria = new Operacion
            {
                TipoOperacion = "TRANSFERENCIA",
                CajaOrigenId = caja.Id,
                CajaDestinoId = null,
                FechaOperacion = fechaUtc,
                Importe = request.Importe,
                Concepto = $"Asignación de presupuesto a {area.Nombre}",
                Descripcion = descOperacion,
                Estado = "CONFIRMADA",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = $"Transferencia interna hacia presupuesto del área '{area.Nombre}'"
            };
            _context.Operaciones.Add(opTesoreria);
            await _context.SaveChangesAsync();

            // 3. Actualizar saldo presupuestal del área
            var presupuesto = await GetOrCreatePresupuestoAreaAsync(area.Id);
            presupuesto.TotalRecibido += request.Importe;
            presupuesto.SaldoDisponible += request.Importe;
            presupuesto.FechaActualizacion = DateTime.UtcNow;

            // 4. Registrar movimiento en el presupuesto del área
            var mov = new MovimientoPresupuesto
            {
                PresupuestoAreaId = presupuesto.Id,
                AreaId = area.Id,
                TipoMovimiento = "ENTREGA",
                Estado = "VIGENTE",
                Importe = request.Importe,
                FechaMovimiento = fechaUtc,
                Concepto = $"Entrega de presupuesto desde {caja.Nombre}",
                Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
                CajaId = caja.Id,
                CajaNombre = caja.Nombre,
                OperacionTesoreriaId = opTesoreria.Id,
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow
            };
            _context.MovimientosPresupuesto.Add(mov);

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "ASIGNAR_PRESUPUESTO",
                Entidad = "PresupuestoArea",
                EntidadId = area.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Asignación de ${request.Importe:N2} MXN desde caja '{caja.Nombre}' al presupuesto del área '{area.Nombre}'"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapMovimientoDto(mov, area.Nombre, ocultarDetalleEntrega: false);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<MovimientoPresupuestoDto> RegistrarEgresoAsync(RegistrarEgresoPresupuestoRequest request, int userId, string userName, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.Concepto))
            throw new InvalidOperationException("El concepto del egreso es obligatorio.");
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe del egreso debe ser mayor a cero.");

        var area = await _context.Areas.FirstOrDefaultAsync(a => a.Id == request.AreaId)
            ?? throw new InvalidOperationException("Área no encontrada.");
        if (!area.Activa)
            throw new InvalidOperationException("No se pueden registrar egresos en un área desactivada.");

        bool canOperateAll = isAdmin
            || await _authService.HasPermissionAsync(userName, "presupuestos_administrar")
            || await _authService.HasPermissionAsync(userName, "presupuestos_ver_todos");

        if (!canOperateAll && !await UserBelongsToAreaAsync(request.AreaId, userId))
            throw new UnauthorizedAccessException("No tienes permiso para registrar egresos en esta área.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var presupuesto = await GetOrCreatePresupuestoAreaAsync(area.Id);
            if (presupuesto.SaldoDisponible < request.Importe)
                throw new InvalidOperationException($"Saldo disponible insuficiente en '{area.Nombre}'. Disponible: ${presupuesto.SaldoDisponible:N2} MXN.");

            var fechaUtc = request.Fecha.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.Fecha, DateTimeKind.Utc)
                : request.Fecha.ToUniversalTime();

            presupuesto.TotalGastado += request.Importe;
            presupuesto.SaldoDisponible -= request.Importe;
            presupuesto.FechaActualizacion = DateTime.UtcNow;

            var mov = new MovimientoPresupuesto
            {
                PresupuestoAreaId = presupuesto.Id,
                AreaId = area.Id,
                TipoMovimiento = "EGRESO",
                Estado = "VIGENTE",
                Importe = request.Importe,
                FechaMovimiento = fechaUtc,
                Concepto = request.Concepto.Trim(),
                Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow
            };

            if (request.Evidencias != null && request.Evidencias.Count > 0)
            {
                foreach (var ev in request.Evidencias)
                {
                    if (string.IsNullOrWhiteSpace(ev.DatosBase64)) continue;
                    if (ev.DatosBase64.Length > 7_500_000)
                        throw new InvalidOperationException($"La imagen '{ev.NombreArchivo}' excede el tamaño máximo permitido.");
                    mov.Evidencias.Add(new PresupuestoEvidencia
                    {
                        NombreArchivo = string.IsNullOrWhiteSpace(ev.NombreArchivo) ? "evidencia.jpg" : ev.NombreArchivo.Trim(),
                        ContentType = string.IsNullOrWhiteSpace(ev.ContentType) ? "image/jpeg" : ev.ContentType.Trim(),
                        DatosBase64 = ev.DatosBase64,
                        FechaSubida = DateTime.UtcNow
                    });
                }
            }

            _context.MovimientosPresupuesto.Add(mov);
            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "EGRESO_PRESUPUESTO",
                Entidad = "MovimientoPresupuesto",
                EntidadId = area.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Egreso de ${request.Importe:N2} MXN en '{area.Nombre}': {mov.Concepto}"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapMovimientoDto(mov, area.Nombre, ocultarDetalleEntrega: false);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<MovimientoPresupuestoDto> EditarEgresoAsync(int movimientoId, EditarEgresoPresupuestoRequest request, int userId, string userName, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.Concepto))
            throw new InvalidOperationException("El concepto del egreso es obligatorio.");
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe del egreso debe ser mayor a cero.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var mov = await _context.MovimientosPresupuesto
                .Include(m => m.Area)
                .Include(m => m.PresupuestoArea)
                .Include(m => m.Evidencias)
                .Include(m => m.HistorialModificaciones)
                .FirstOrDefaultAsync(m => m.Id == movimientoId)
                ?? throw new KeyNotFoundException("Movimiento no encontrado.");

            if (mov.TipoMovimiento != "EGRESO")
                throw new InvalidOperationException("Solo se pueden editar movimientos de tipo EGRESO.");
            if (mov.Estado == "CANCELADO")
                throw new InvalidOperationException("No se puede editar un egreso que ya fue cancelado.");

            bool canOperateAll = isAdmin
                || await _authService.HasPermissionAsync(userName, "presupuestos_administrar")
                || await _authService.HasPermissionAsync(userName, "presupuestos_ver_todos");

            if (!canOperateAll && !await UserBelongsToAreaAsync(mov.AreaId, userId))
                throw new UnauthorizedAccessException("No tienes permiso para editar egresos de esta área.");

            var presupuesto = mov.PresupuestoArea
                ?? throw new InvalidOperationException("Presupuesto del área no encontrado.");

            decimal diferencia = request.Importe - mov.Importe;
            if (diferencia > 0 && presupuesto.SaldoDisponible < diferencia)
            {
                throw new InvalidOperationException(
                    $"Saldo disponible insuficiente para incrementar el egreso. Disponible: ${presupuesto.SaldoDisponible:N2} MXN, diferencia requerida: ${diferencia:N2} MXN."
                );
            }

            var valoresAnteriores = JsonSerializer.Serialize(new
            {
                fecha = mov.FechaMovimiento,
                concepto = mov.Concepto,
                importe = mov.Importe,
                descripcion = mov.Descripcion,
                evidenciasCount = mov.Evidencias.Count
            });

            var fechaUtc = request.Fecha.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.Fecha, DateTimeKind.Utc)
                : request.Fecha.ToUniversalTime();

            // Recalcular saldo
            presupuesto.TotalGastado += diferencia;
            presupuesto.SaldoDisponible -= diferencia;
            presupuesto.FechaActualizacion = DateTime.UtcNow;

            mov.Concepto = request.Concepto.Trim();
            mov.Importe = request.Importe;
            mov.FechaMovimiento = fechaUtc;
            mov.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
            mov.EditadoPor = userName;
            mov.FechaUltimaEdicion = DateTime.UtcNow;

            // Actualizar evidencias si se especificaron
            if (request.ConservarEvidenciaIds != null)
            {
                var toRemove = mov.Evidencias.Where(e => !request.ConservarEvidenciaIds.Contains(e.Id)).ToList();
                foreach (var rem in toRemove)
                {
                    _context.PresupuestoEvidencias.Remove(rem);
                }
            }

            if (request.NuevasEvidencias != null)
            {
                foreach (var ev in request.NuevasEvidencias)
                {
                    if (string.IsNullOrWhiteSpace(ev.DatosBase64)) continue;
                    if (ev.DatosBase64.Length > 7_500_000)
                        throw new InvalidOperationException($"La imagen '{ev.NombreArchivo}' excede el tamaño máximo permitido.");
                    mov.Evidencias.Add(new PresupuestoEvidencia
                    {
                        NombreArchivo = string.IsNullOrWhiteSpace(ev.NombreArchivo) ? "evidencia.jpg" : ev.NombreArchivo.Trim(),
                        ContentType = string.IsNullOrWhiteSpace(ev.ContentType) ? "image/jpeg" : ev.ContentType.Trim(),
                        DatosBase64 = ev.DatosBase64,
                        FechaSubida = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            var valoresNuevos = JsonSerializer.Serialize(new
            {
                fecha = mov.FechaMovimiento,
                concepto = mov.Concepto,
                importe = mov.Importe,
                descripcion = mov.Descripcion,
                evidenciasCount = mov.Evidencias.Count
            });

            mov.HistorialModificaciones.Add(new PresupuestoMovimientoHistorial
            {
                Accion = "EDICION",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaCambio = DateTime.UtcNow,
                ValoresAnterioresJson = valoresAnteriores,
                ValoresNuevosJson = valoresNuevos,
                Detalle = $"Edición de egreso #{mov.Id} (diferencia en saldo: {(diferencia >= 0 ? "-" : "+")}${Math.Abs(diferencia):N2})"
            });

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "EDITAR_EGRESO_PRESUPUESTO",
                Entidad = "MovimientoPresupuesto",
                EntidadId = mov.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                ValoresAnteriores = valoresAnteriores,
                ValoresNuevos = valoresNuevos,
                Descripcion = $"Edición de egreso #{mov.Id} en '{mov.Area?.Nombre}'"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapMovimientoDto(mov, mov.Area?.Nombre ?? "", ocultarDetalleEntrega: false);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<MovimientoPresupuestoDto> CancelarEgresoAsync(int movimientoId, CancelarEgresoPresupuestoRequest request, int userId, string userName, bool isAdmin)
    {
        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var mov = await _context.MovimientosPresupuesto
                .Include(m => m.Area)
                .Include(m => m.PresupuestoArea)
                .Include(m => m.Evidencias)
                .Include(m => m.HistorialModificaciones)
                .FirstOrDefaultAsync(m => m.Id == movimientoId)
                ?? throw new KeyNotFoundException("Movimiento no encontrado.");

            if (mov.TipoMovimiento != "EGRESO")
                throw new InvalidOperationException("Solo se pueden cancelar movimientos de tipo EGRESO.");
            if (mov.Estado == "CANCELADO")
                throw new InvalidOperationException("Este egreso ya se encuentra cancelado.");

            bool canOperateAll = isAdmin
                || await _authService.HasPermissionAsync(userName, "presupuestos_administrar")
                || await _authService.HasPermissionAsync(userName, "presupuestos_ver_todos");

            if (!canOperateAll && !await UserBelongsToAreaAsync(mov.AreaId, userId))
                throw new UnauthorizedAccessException("No tienes permiso para cancelar egresos de esta área.");

            var presupuesto = mov.PresupuestoArea
                ?? throw new InvalidOperationException("Presupuesto del área no encontrado.");

            var motivo = string.IsNullOrWhiteSpace(request.Motivo) ? "Cancelación de egreso" : request.Motivo.Trim();

            mov.Estado = "CANCELADO";
            mov.CanceladoPor = userName;
            mov.FechaCancelacion = DateTime.UtcNow;
            mov.MotivoCancelacion = motivo;

            presupuesto.TotalGastado -= mov.Importe;
            presupuesto.SaldoDisponible += mov.Importe;
            presupuesto.FechaActualizacion = DateTime.UtcNow;

            mov.HistorialModificaciones.Add(new PresupuestoMovimientoHistorial
            {
                Accion = "CANCELACION",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaCambio = DateTime.UtcNow,
                ValoresAnterioresJson = JsonSerializer.Serialize(new { estado = "VIGENTE", importe = mov.Importe }),
                ValoresNuevosJson = JsonSerializer.Serialize(new { estado = "CANCELADO", importeDevuelto = mov.Importe }),
                Detalle = motivo
            });

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "CANCELAR_EGRESO_PRESUPUESTO",
                Entidad = "MovimientoPresupuesto",
                EntidadId = mov.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Cancelación de egreso #{mov.Id} por ${mov.Importe:N2} MXN en '{mov.Area?.Nombre}'. Motivo: {motivo}"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapMovimientoDto(mov, mov.Area?.Nombre ?? "", ocultarDetalleEntrega: false);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<MovimientoPresupuestoDto> DevolverPresupuestoAsync(DevolverPresupuestoRequest request, int userId, string userName)
    {
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe a devolver debe ser mayor a cero.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var area = await _context.Areas.FirstOrDefaultAsync(a => a.Id == request.AreaOrigenId)
                ?? throw new InvalidOperationException("Área de origen no encontrada.");

            var caja = await _context.Cajas.FirstOrDefaultAsync(c => c.Id == request.CajaDestinoId)
                ?? throw new InvalidOperationException("Caja de destino no encontrada.");
            if (!caja.Activa)
                throw new InvalidOperationException("No se puede devolver dinero a una caja inactiva.");

            var presupuesto = await GetOrCreatePresupuestoAreaAsync(area.Id);
            if (presupuesto.SaldoDisponible < request.Importe)
                throw new InvalidOperationException($"El área '{area.Nombre}' no cuenta con saldo disponible suficiente para devolver. Disponible: ${presupuesto.SaldoDisponible:N2} MXN.");

            var fechaUtc = request.Fecha.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.Fecha, DateTimeKind.Utc)
                : request.Fecha.ToUniversalTime();

            // 1. Descontar del saldo del área y sumar a la caja
            presupuesto.TotalDevuelto += request.Importe;
            presupuesto.SaldoDisponible -= request.Importe;
            presupuesto.FechaActualizacion = DateTime.UtcNow;

            caja.SaldoActual += request.Importe;

            // 2. Registrar en historial de Operaciones de Tesorería (como transferencia interna, no ingreso/gasto ordinario)
            var descOperacion = string.IsNullOrWhiteSpace(request.Descripcion)
                ? $"Devolución de presupuesto del área '{area.Nombre}' a caja '{caja.Nombre}'."
                : request.Descripcion.Trim();

            var opTesoreria = new Operacion
            {
                TipoOperacion = "TRANSFERENCIA",
                CajaOrigenId = null,
                CajaDestinoId = caja.Id,
                FechaOperacion = fechaUtc,
                Importe = request.Importe,
                Concepto = $"Devolución de presupuesto desde {area.Nombre}",
                Descripcion = descOperacion,
                Estado = "CONFIRMADA",
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = $"Devolución interna desde presupuesto del área '{area.Nombre}'"
            };
            _context.Operaciones.Add(opTesoreria);
            await _context.SaveChangesAsync();

            // 3. Registrar en historial del presupuesto del área
            var mov = new MovimientoPresupuesto
            {
                PresupuestoAreaId = presupuesto.Id,
                AreaId = area.Id,
                TipoMovimiento = "DEVOLUCION",
                Estado = "VIGENTE",
                Importe = request.Importe,
                FechaMovimiento = fechaUtc,
                Concepto = $"Devolución de presupuesto a {caja.Nombre}",
                Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
                CajaId = caja.Id,
                CajaNombre = caja.Nombre,
                OperacionTesoreriaId = opTesoreria.Id,
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow
            };
            _context.MovimientosPresupuesto.Add(mov);

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "DEVOLVER_PRESUPUESTO",
                Entidad = "PresupuestoArea",
                EntidadId = area.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Devolución de ${request.Importe:N2} MXN desde área '{area.Nombre}' hacia caja '{caja.Nombre}'"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapMovimientoDto(mov, area.Nombre, ocultarDetalleEntrega: false);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<MovimientoPresupuestoDto> RegistrarAjusteAsync(AjustePresupuestoRequest request, int userId, string userName)
    {
        if (request.Importe == 0)
            throw new InvalidOperationException("El importe del ajuste debe ser distinto de cero.");
        if (string.IsNullOrWhiteSpace(request.Motivo))
            throw new InvalidOperationException("El motivo del ajuste es obligatorio.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var area = await _context.Areas.FirstOrDefaultAsync(a => a.Id == request.AreaId)
                ?? throw new InvalidOperationException("Área no encontrada.");
            if (!area.Activa)
                throw new InvalidOperationException("No se pueden registrar ajustes en un área desactivada.");

            var presupuesto = await GetOrCreatePresupuestoAreaAsync(area.Id);
            if (presupuesto.SaldoDisponible + request.Importe < 0)
            {
                throw new InvalidOperationException(
                    $"El ajuste negativo (${request.Importe:N2} MXN) dejaría el saldo disponible por debajo de $0.00 MXN. Saldo actual: ${presupuesto.SaldoDisponible:N2} MXN."
                );
            }

            var fechaUtc = request.Fecha.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.Fecha, DateTimeKind.Utc)
                : request.Fecha.ToUniversalTime();

            presupuesto.TotalAjustes += request.Importe;
            presupuesto.SaldoDisponible += request.Importe;
            presupuesto.FechaActualizacion = DateTime.UtcNow;

            var mov = new MovimientoPresupuesto
            {
                PresupuestoAreaId = presupuesto.Id,
                AreaId = area.Id,
                TipoMovimiento = "AJUSTE",
                Estado = "VIGENTE",
                Importe = request.Importe,
                FechaMovimiento = fechaUtc,
                Concepto = request.Importe > 0 ? "Ajuste positivo de saldo" : "Ajuste negativo de saldo",
                Descripcion = request.Motivo.Trim(),
                UsuarioId = userId,
                UsuarioNombre = userName,
                FechaRegistro = DateTime.UtcNow
            };
            _context.MovimientosPresupuesto.Add(mov);

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = userId,
                UsuarioNombre = userName,
                Accion = "AJUSTE_PRESUPUESTO",
                Entidad = "PresupuestoArea",
                EntidadId = area.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Ajuste de saldo ({(request.Importe > 0 ? "+" : "")}${request.Importe:N2} MXN) en área '{area.Nombre}'. Motivo: {request.Motivo.Trim()}"
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapMovimientoDto(mov, area.Nombre, ocultarDetalleEntrega: false);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
