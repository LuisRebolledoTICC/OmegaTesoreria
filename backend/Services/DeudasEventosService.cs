using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Services;

public interface IDeudasEventosService
{
    // Deudas - Actividades
    Task<List<ActividadDeudaDto>> GetActividadesAsync();
    Task<ActividadDeudaDto> CreateActividadAsync(CreateActividadDeudaRequest request, string currentUserName);
    Task<ActividadDeudaDto> UpdateActividadAsync(int id, UpdateActividadDeudaRequest request, string currentUserName);
    Task<int> AsignarUsuariosFaltantesAsync(int actividadId, string currentUserName);

    // Deudas - Consultas
    Task<DeudasResumenGlobalDto> GetResumenGlobalAsync();
    Task<UsuarioDeudaDetalleDto?> GetDetalleUsuarioAsync(int usuarioId);
    Task<UsuarioDeudaDetalleDto?> GetMisDeudasAsync(int usuarioId);

    // Deudas - Cambios de estado y Pagos
    Task<AsignacionDeudaDto> RegistrarPagoAsync(int asignacionId, RegistrarPagoDeudaRequest request, int currentUserId, string currentUserName, bool isAdmin);
    Task<AsignacionDeudaDto> CambiarEstadoAsync(int asignacionId, CambiarEstadoAsignacionRequest request, int currentUserId, string currentUserName, bool isAdmin);
    Task<AsignacionDeudaDto> RevertirPagoAsync(int asignacionId, RevertirPagoDeudaRequest request, int currentUserId, string currentUserName, bool isAdmin);
    Task<List<HistorialPagoDeudaDto>> GetHistorialPagosAsync(int? usuarioId = null, int? actividadId = null);
    Task<List<OperacionDto>> GetMovimientosBancariosDeudasAsync();

    // Eventos
    Task<List<EventoOmegaDto>> GetEventosAsync();
    Task<List<EventoOmegaDto>> GetProximosEventosAsync();
    Task<EventoOmegaDto> CreateEventoAsync(CreateOrUpdateEventoRequest request, string currentUserName);
    Task<EventoOmegaDto> UpdateEventoAsync(int id, CreateOrUpdateEventoRequest request, string currentUserName);
    Task<EventoOmegaDto> CancelarEventoAsync(int id, CancelarEventoRequest request, string currentUserName);
    Task<bool> DeleteEventoAsync(int id, string currentUserName);
}

public class DeudasEventosService : IDeudasEventosService
{
    private readonly AppDbContext _context;

    public DeudasEventosService(AppDbContext context)
    {
        _context = context;
    }

    // ─── HELPERS DE ROLES ────────────────────────────────────────────────────────

    private static List<string> ExtractRoleNames(User u)
    {
        var list = new List<string>();
        if (u.UsuarioRoles != null && u.UsuarioRoles.Count > 0)
        {
            list.AddRange(u.UsuarioRoles
                .Where(ur => ur.RolPersonalizado != null && !string.IsNullOrWhiteSpace(ur.RolPersonalizado.Nombre))
                .Select(ur => ur.RolPersonalizado!.Nombre.Trim()));
        }
        if (!string.IsNullOrWhiteSpace(u.Rol))
        {
            list.AddRange(u.Rol.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }
        return list.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static bool IsUserAdmin(User u)
    {
        var roles = ExtractRoleNames(u);
        return roles.Any(r =>
            r.Equals("Administrador", StringComparison.OrdinalIgnoreCase) ||
            r.Equals("Admin", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsUserOmega(User u)
    {
        var roles = ExtractRoleNames(u);
        return roles.Any(r => r.Equals("Omega", StringComparison.OrdinalIgnoreCase));
    }

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind == DateTimeKind.Utc ? dt : DateTime.SpecifyKind(dt, DateTimeKind.Utc);

    // ─── ACTIVIDADES DE DEUDA ────────────────────────────────────────────────────

    public async Task<List<ActividadDeudaDto>> GetActividadesAsync()
    {
        var actividades = await _context.ActividadesDeuda
            .Include(a => a.Asignaciones)
                .ThenInclude(asig => asig.HistorialPagos)
            .OrderByDescending(a => a.FechaActividad)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        return actividades.Select(MapActividadDto).ToList();
    }

    private static ActividadDeudaDto MapActividadDto(ActividadDeuda a)
    {
        var activas = a.Asignaciones.ToList();
        var pendientes = activas.Count(x => x.Estado == "PENDIENTE");
        var pagados = activas.Count(x => x.Estado == "PAGADO");
        var noAsistio = activas.Count(x => x.Estado == "NO_ASISTIO");

        decimal recaudado = activas
            .SelectMany(x => x.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
            .Where(h => h.Estado == "CONFIRMADO")
            .Sum(h => h.Importe);

        decimal pendiente = activas
            .Where(x => x.Estado != "NO_ASISTIO")
            .Sum(x =>
            {
                var abonado = (x.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
                    .Where(h => h.Estado == "CONFIRMADO")
                    .Sum(h => h.Importe);
                return Math.Max(0m, a.Importe - abonado);
            });

        return new ActividadDeudaDto(
            a.Id,
            a.Nombre,
            a.Importe,
            a.FechaActividad,
            a.Descripcion,
            a.Activa,
            a.CreadoPor,
            a.FechaCreacion,
            activas.Count,
            pendientes,
            pagados,
            noAsistio,
            recaudado,
            pendiente
        );
    }

    public async Task<ActividadDeudaDto> CreateActividadAsync(CreateActividadDeudaRequest request, string currentUserName)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            throw new InvalidOperationException("El nombre de la actividad es obligatorio.");
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe de la actividad debe ser mayor a cero.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var actividad = new ActividadDeuda
            {
                Nombre = request.Nombre.Trim(),
                Importe = request.Importe,
                FechaActividad = EnsureUtc(request.FechaActividad),
                Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
                Activa = true,
                CreadoPor = currentUserName,
                FechaCreacion = DateTime.UtcNow
            };

            _context.ActividadesDeuda.Add(actividad);
            await _context.SaveChangesAsync();

            // Asignar automáticamente a todos los usuarios activos con rol Omega, excluyendo Admin/Administrador
            var allActiveUsers = await _context.Users
                .Include(u => u.UsuarioRoles)
                    .ThenInclude(ur => ur.RolPersonalizado)
                .Where(u => u.Activo)
                .ToListAsync();

            var omegaUsers = allActiveUsers
                .Where(u => IsUserOmega(u) && !IsUserAdmin(u))
                .ToList();

            var now = DateTime.UtcNow;
            var asignaciones = omegaUsers.Select(u => new AsignacionActividadDeuda
            {
                ActividadDeudaId = actividad.Id,
                UsuarioId = u.Id,
                Estado = "PENDIENTE",
                FechaAsignacion = now,
                UltimaActualizacion = now,
                ActualizadoPor = currentUserName
            }).ToList();

            if (asignaciones.Count > 0)
            {
                await _context.AsignacionesActividadDeuda.AddRangeAsync(asignaciones);
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioNombre = currentUserName,
                Accion = "CREAR_ACTIVIDAD_DEUDA",
                Entidad = "ActividadDeuda",
                EntidadId = actividad.Id.ToString(),
                FechaHora = now,
                Descripcion = $"Creación de actividad '{actividad.Nombre}' por ${actividad.Importe:N2} MXN. Asignada a {asignaciones.Count} usuarios de Omega."
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            var loaded = await _context.ActividadesDeuda
                .Include(a => a.Asignaciones)
                .FirstAsync(a => a.Id == actividad.Id);

            return MapActividadDto(loaded);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<ActividadDeudaDto> UpdateActividadAsync(int id, UpdateActividadDeudaRequest request, string currentUserName)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            throw new InvalidOperationException("El nombre de la actividad es obligatorio.");
        if (request.Importe <= 0)
            throw new InvalidOperationException("El importe de la actividad debe ser mayor a cero.");

        var actividad = await _context.ActividadesDeuda
            .Include(a => a.Asignaciones)
            .FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Actividad no encontrada.");

        // Si ya hay pagos registrados, no permitir cambiar el importe para no descuadrar los movimientos bancarios históricos
        bool tienePagos = actividad.Asignaciones.Any(x => x.Estado == "PAGADO");
        if (tienePagos && actividad.Importe != request.Importe)
        {
            throw new InvalidOperationException("No se puede modificar el importe de una actividad que ya tiene pagos registrados.");
        }

        actividad.Nombre = request.Nombre.Trim();
        actividad.Importe = request.Importe;
        actividad.FechaActividad = EnsureUtc(request.FechaActividad);
        actividad.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        actividad.ModificadoPor = currentUserName;
        actividad.FechaModificacion = DateTime.UtcNow;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "EDITAR_ACTIVIDAD_DEUDA",
            Entidad = "ActividadDeuda",
            EntidadId = actividad.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Edición de actividad '{actividad.Nombre}' (${actividad.Importe:N2} MXN)."
        });

        await _context.SaveChangesAsync();
        return MapActividadDto(actividad);
    }

    public async Task<int> AsignarUsuariosFaltantesAsync(int actividadId, string currentUserName)
    {
        var actividad = await _context.ActividadesDeuda
            .Include(a => a.Asignaciones)
            .FirstOrDefaultAsync(a => a.Id == actividadId)
            ?? throw new KeyNotFoundException("Actividad no encontrada.");

        var existentesIds = actividad.Asignaciones.Select(a => a.UsuarioId).ToHashSet();

        var allActiveUsers = await _context.Users
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.RolPersonalizado)
            .Where(u => u.Activo)
            .ToListAsync();

        var faltantes = allActiveUsers
            .Where(u => IsUserOmega(u) && !IsUserAdmin(u) && !existentesIds.Contains(u.Id))
            .ToList();

        if (faltantes.Count == 0) return 0;

        var now = DateTime.UtcNow;
        var nuevas = faltantes.Select(u => new AsignacionActividadDeuda
        {
            ActividadDeudaId = actividad.Id,
            UsuarioId = u.Id,
            Estado = "PENDIENTE",
            FechaAsignacion = now,
            UltimaActualizacion = now,
            ActualizadoPor = currentUserName
        }).ToList();

        await _context.AsignacionesActividadDeuda.AddRangeAsync(nuevas);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "ASIGNAR_ACTIVIDAD_FALTANTES",
            Entidad = "ActividadDeuda",
            EntidadId = actividad.Id.ToString(),
            FechaHora = now,
            Descripcion = $"Asignación explícita de actividad '{actividad.Nombre}' a {nuevas.Count} usuario(s) faltante(s) de Omega."
        });

        await _context.SaveChangesAsync();
        return nuevas.Count;
    }

    // ─── CONSULTAS DE DEUDAS ─────────────────────────────────────────────────────

    public async Task<DeudasResumenGlobalDto> GetResumenGlobalAsync()
    {
        var allUsers = await _context.Users
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.RolPersonalizado)
            .Where(u => u.Activo)
            .OrderBy(u => u.Nombre)
            .ToListAsync();

        var asignaciones = await _context.AsignacionesActividadDeuda
            .Include(a => a.ActividadDeuda)
            .Include(a => a.HistorialPagos)
            .Where(a => a.ActividadDeuda != null && a.ActividadDeuda.Activa)
            .ToListAsync();

        var asignacionesPorUsuario = asignaciones
            .GroupBy(a => a.UsuarioId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Mostrar usuarios de Omega (excluyendo Admin), más cualquier usuario no-Admin que tenga asignaciones históricas
        var usuariosElegibles = allUsers
            .Where(u => !IsUserAdmin(u) && (IsUserOmega(u) || asignacionesPorUsuario.ContainsKey(u.Id)))
            .ToList();

        var resumenes = new List<UsuarioDeudaResumenDto>();
        foreach (var u in usuariosElegibles)
        {
            var list = asignacionesPorUsuario.TryGetValue(u.Id, out var l) ? l : new List<AsignacionActividadDeuda>();
            resumenes.Add(BuildUsuarioResumen(u, list));
        }

        return new DeudasResumenGlobalDto(
            resumenes.Sum(r => r.DeudaTotal),
            resumenes.Sum(r => r.TotalPagado),
            resumenes.Count(r => r.DeudaTotal > 0),
            resumenes.OrderByDescending(r => r.DeudaTotal).ThenBy(r => r.Nombre).ToList()
        );
    }

    public async Task<UsuarioDeudaDetalleDto?> GetDetalleUsuarioAsync(int usuarioId)
    {
        var user = await _context.Users
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.RolPersonalizado)
            .FirstOrDefaultAsync(u => u.Id == usuarioId);

        if (user == null) return null;

        var asignaciones = await _context.AsignacionesActividadDeuda
            .Include(a => a.ActividadDeuda)
            .Include(a => a.Caja)
            .Include(a => a.HistorialPagos)
            .Where(a => a.UsuarioId == usuarioId && a.ActividadDeuda != null && a.ActividadDeuda.Activa)
            .OrderByDescending(a => a.ActividadDeuda!.FechaActividad)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        var resumen = BuildUsuarioResumen(user, asignaciones);
        var items = asignaciones.Select(a => MapAsignacionDto(a, user.Nombre)).ToList();

        return new UsuarioDeudaDetalleDto(resumen, items);
    }

    public Task<UsuarioDeudaDetalleDto?> GetMisDeudasAsync(int usuarioId) => GetDetalleUsuarioAsync(usuarioId);

    private static UsuarioDeudaResumenDto BuildUsuarioResumen(User u, List<AsignacionActividadDeuda> list)
    {
        decimal deudaTotal = 0m;
        decimal totalPagado = 0m;
        int pend = 0;
        int pag = 0;
        int noAsist = 0;

        foreach (var a in list)
        {
            var importeOriginal = a.ActividadDeuda?.Importe ?? 0m;
            var abonosValidos = (a.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
                .Where(h => h.Estado == "CONFIRMADO")
                .Sum(h => h.Importe);

            totalPagado += abonosValidos;

            if (a.Estado == "NO_ASISTIO")
            {
                noAsist++;
            }
            else if (a.Estado == "PAGADO")
            {
                pag++;
            }
            else
            {
                pend++;
                var saldo = Math.Max(0m, importeOriginal - abonosValidos);
                deudaTotal += saldo;
            }
        }

        return new UsuarioDeudaResumenDto(
            u.Id,
            u.UserName,
            u.Nombre,
            u.Rol,
            deudaTotal,
            totalPagado,
            pend,
            pag,
            noAsist,
            list.Count
        );
    }

    private static AsignacionDeudaDto MapAsignacionDto(AsignacionActividadDeuda a, string usuarioNombre)
    {
        decimal importeOriginal = a.ActividadDeuda?.Importe ?? 0m;
        var abonosConfirmados = (a.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
            .Where(h => h.Estado == "CONFIRMADO")
            .ToList();

        decimal totalAbonado = abonosConfirmados.Sum(h => h.Importe);
        decimal saldoPendiente = a.Estado == "NO_ASISTIO" ? 0m : Math.Max(0m, importeOriginal - totalAbonado);
        decimal deuda = a.Estado == "PENDIENTE" ? saldoPendiente : 0m;

        var abonosDtos = (a.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
            .OrderByDescending(h => h.FechaPago)
            .ThenByDescending(h => h.Id)
            .Select(h => new HistorialPagoDeudaDto(
                h.Id,
                h.AsignacionActividadDeudaId,
                h.ActividadDeudaId,
                a.ActividadDeuda?.Nombre ?? "Actividad",
                h.UsuarioId,
                usuarioNombre,
                h.Importe,
                h.FormaPago,
                h.CajaId,
                h.CajaNombre,
                h.OperacionTesoreriaId,
                h.OperacionReversaId,
                h.Estado,
                h.FechaPago,
                h.RegistradoPor,
                h.FechaReversion,
                h.RevertidoPor,
                h.MotivoReversion
            ))
            .ToList();

        // Si hay un abono confirmado más reciente, usar su forma de pago y caja
        var ultimoAbono = abonosConfirmados.OrderByDescending(h => h.FechaPago).ThenByDescending(h => h.Id).FirstOrDefault();
        var formaPago = a.FormaPago ?? ultimoAbono?.FormaPago;
        var cajaId = a.CajaId ?? ultimoAbono?.CajaId;
        var cajaNombre = a.Caja?.Nombre ?? ultimoAbono?.CajaNombre;
        var operacionId = a.OperacionTesoreriaId ?? ultimoAbono?.OperacionTesoreriaId;
        var fechaPago = a.FechaPago ?? ultimoAbono?.FechaPago;
        var registradoPor = a.RegistradoPagoPor ?? ultimoAbono?.RegistradoPor;

        return new AsignacionDeudaDto(
            a.Id,
            a.ActividadDeudaId,
            a.ActividadDeuda?.Nombre ?? "Actividad",
            a.ActividadDeuda?.FechaActividad ?? a.FechaAsignacion,
            a.ActividadDeuda?.Descripcion,
            importeOriginal,
            a.UsuarioId,
            usuarioNombre,
            a.Estado,
            totalAbonado,
            saldoPendiente,
            deuda,
            formaPago,
            cajaId,
            cajaNombre,
            operacionId,
            fechaPago,
            registradoPor,
            a.FechaAsignacion,
            abonosDtos
        );
    }

    // ─── PAGOS, CAMBIOS DE ESTADO Y REVERSIÓN ────────────────────────────────────

    public async Task<AsignacionDeudaDto> RegistrarPagoAsync(
        int asignacionId,
        RegistrarPagoDeudaRequest request,
        int currentUserId,
        string currentUserName,
        bool isAdmin)
    {
        var formaPago = (request.FormaPago ?? "").Trim().ToUpperInvariant();
        if (formaPago != "EFECTIVO" && formaPago != "TRANSFERENCIA")
            throw new InvalidOperationException("La forma de pago únicamente puede ser EFECTIVO o TRANSFERENCIA.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var asignacion = await _context.AsignacionesActividadDeuda
                .Include(a => a.ActividadDeuda)
                .Include(a => a.HistorialPagos)
                .Include(a => a.Usuario!)
                    .ThenInclude(u => u.UsuarioRoles)
                        .ThenInclude(ur => ur.RolPersonalizado)
                .FirstOrDefaultAsync(a => a.Id == asignacionId)
                ?? throw new KeyNotFoundException("Registro de deuda no encontrado.");

            if (asignacion.Usuario != null && IsUserAdmin(asignacion.Usuario) && !isAdmin)
                throw new InvalidOperationException("No tienes permiso para modificar deudas de usuarios administradores.");

            if (asignacion.Estado == "NO_ASISTIO")
                throw new InvalidOperationException("No se pueden registrar abonos a una actividad marcada como 'No asistió'. Cámbiala a Pendiente primero.");

            decimal importeOriginal = asignacion.ActividadDeuda?.Importe ?? 0m;
            if (importeOriginal <= 0)
                throw new InvalidOperationException("El importe original de la actividad debe ser mayor a cero.");

            decimal abonadoPrevio = (asignacion.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
                .Where(h => h.Estado == "CONFIRMADO")
                .Sum(h => h.Importe);

            decimal saldoPendiente = Math.Max(0m, importeOriginal - abonadoPrevio);
            if (saldoPendiente <= 0)
                throw new InvalidOperationException("Esta actividad ya está liquidada en su totalidad ($0.00 de saldo pendiente).");

            decimal montoAbono = request.Importe.HasValue && request.Importe.Value > 0
                ? request.Importe.Value
                : saldoPendiente;

            if (montoAbono <= 0)
                throw new InvalidOperationException("El importe del abono debe ser mayor a cero.");

            if (montoAbono > saldoPendiente)
                throw new InvalidOperationException($"El importe del abono (${montoAbono:N2}) supera el saldo pendiente de la actividad (${saldoPendiente:N2}).");

            var caja = await _context.Cajas.FirstOrDefaultAsync(c => c.Id == request.CajaId)
                ?? throw new InvalidOperationException("La caja seleccionada no existe.");

            if (!caja.Activa)
                throw new InvalidOperationException($"La caja '{caja.Nombre}' no está activa.");

            // Validar compatibilidad estricta FormaPago <-> TipoCaja
            if (formaPago == "EFECTIVO" && !string.Equals(caja.Tipo, "EFECTIVO", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Los pagos en EFECTIVO deben registrarse únicamente en una caja de efectivo (no en la caja de Transferencias).");

            if (formaPago == "TRANSFERENCIA" && !string.Equals(caja.Tipo, "TRANSFERENCIAS", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Los pagos por TRANSFERENCIA deben registrarse obligatoriamente en la caja de Transferencias.");

            var fechaPago = request.FechaPago.HasValue ? EnsureUtc(request.FechaPago.Value) : DateTime.UtcNow;
            var usuarioNombre = asignacion.Usuario?.Nombre ?? $"Usuario #{asignacion.UsuarioId}";
            var actividadNombre = asignacion.ActividadDeuda?.Nombre ?? "Actividad";

            // 1. Actualizar saldo de la caja seleccionada
            caja.SaldoActual += montoAbono;

            // 2. Generar movimiento en Movimientos Bancarios (Operaciones)
            var operacion = new Operacion
            {
                TipoOperacion = "ENTRADA",
                CajaDestinoId = caja.Id,
                FechaOperacion = fechaPago,
                Importe = montoAbono,
                Concepto = $"Abono a deuda: {actividadNombre} - {usuarioNombre}",
                Descripcion = $"Abono de ${montoAbono:N2} en {formaPago} para '{actividadNombre}' ({usuarioNombre})",
                Estado = "CONFIRMADA",
                UsuarioId = currentUserId,
                UsuarioNombre = currentUserName,
                FechaRegistro = DateTime.UtcNow,
                Observaciones = $"DeudaActividadId:{asignacion.ActividadDeudaId}|AsignacionId:{asignacion.Id}|UsuarioId:{asignacion.UsuarioId}|FormaPago:{formaPago}"
            };

            _context.Operaciones.Add(operacion);
            await _context.SaveChangesAsync();

            // 3. Registrar en historial de pagos de deuda
            var historial = new HistorialPagoDeuda
            {
                AsignacionActividadDeudaId = asignacion.Id,
                ActividadDeudaId = asignacion.ActividadDeudaId,
                UsuarioId = asignacion.UsuarioId,
                Importe = montoAbono,
                FormaPago = formaPago,
                CajaId = caja.Id,
                CajaNombre = caja.Nombre,
                OperacionTesoreriaId = operacion.Id,
                Estado = "CONFIRMADO",
                FechaPago = fechaPago,
                RegistradoPor = currentUserName
            };
            _context.HistorialPagosDeuda.Add(historial);

            // 4. Evaluar nuevo saldo pendiente y estado
            decimal nuevoAbonado = abonadoPrevio + montoAbono;
            decimal nuevoSaldo = Math.Max(0m, importeOriginal - nuevoAbonado);

            if (nuevoSaldo == 0m)
            {
                asignacion.Estado = "PAGADO";
            }
            else
            {
                asignacion.Estado = "PENDIENTE";
            }

            asignacion.FormaPago = formaPago;
            asignacion.CajaId = caja.Id;
            asignacion.OperacionTesoreriaId = operacion.Id;
            asignacion.FechaPago = fechaPago;
            asignacion.RegistradoPagoPor = currentUserName;
            asignacion.UltimaActualizacion = DateTime.UtcNow;
            asignacion.ActualizadoPor = currentUserName;

            // 5. Auditoría
            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = currentUserId,
                UsuarioNombre = currentUserName,
                Accion = "PAGO_DEUDA",
                Entidad = "AsignacionActividadDeuda",
                EntidadId = asignacion.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Abono de ${montoAbono:N2} MXN ({formaPago}) en '{caja.Nombre}' para '{actividadNombre}' de {usuarioNombre}. Saldo restante: ${nuevoSaldo:N2}. Movimiento #{operacion.Id}."
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            asignacion.Caja = caja;
            return MapAsignacionDto(asignacion, usuarioNombre);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<AsignacionDeudaDto> CambiarEstadoAsync(
        int asignacionId,
        CambiarEstadoAsignacionRequest request,
        int currentUserId,
        string currentUserName,
        bool isAdmin)
    {
        var nuevoEstado = (request.NuevoEstado ?? "").Trim().ToUpperInvariant();
        if (nuevoEstado != "PENDIENTE" && nuevoEstado != "NO_ASISTIO")
            throw new InvalidOperationException("El estado destino debe ser PENDIENTE o NO_ASISTIO. Para marcar como PAGADO utiliza el registro de abono/pago.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var asignacion = await _context.AsignacionesActividadDeuda
                .Include(a => a.ActividadDeuda)
                .Include(a => a.Caja)
                .Include(a => a.HistorialPagos)
                .Include(a => a.Usuario!)
                    .ThenInclude(u => u.UsuarioRoles)
                        .ThenInclude(ur => ur.RolPersonalizado)
                .FirstOrDefaultAsync(a => a.Id == asignacionId)
                ?? throw new KeyNotFoundException("Registro de deuda no encontrado.");

            if (asignacion.Usuario != null && IsUserAdmin(asignacion.Usuario) && !isAdmin)
                throw new InvalidOperationException("No tienes permiso para modificar deudas de usuarios administradores.");

            var usuarioNombre = asignacion.Usuario?.Nombre ?? $"Usuario #{asignacion.UsuarioId}";
            var estadoAnterior = asignacion.Estado;

            // Si se marca como NO_ASISTIO y existen abonos confirmados, se deben revertir automáticamente
            // todos los abonos activos para garantizar que recaudación neta sea $0 y deuda pendiente $0.
            if (nuevoEstado == "NO_ASISTIO")
            {
                var abonosConfirmados = (asignacion.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
                    .Where(h => h.Estado == "CONFIRMADO")
                    .OrderByDescending(h => h.Id)
                    .ToList();

                var motivoReversion = string.IsNullOrWhiteSpace(request.Motivo)
                    ? "Reversión por cambio de estado a No asistió"
                    : $"No asistió: {request.Motivo.Trim()}";

                foreach (var abono in abonosConfirmados)
                {
                    await RevertirAbonoInternoAsync(abono, asignacion, motivoReversion, currentUserId, currentUserName);
                }
            }

            asignacion.Estado = nuevoEstado;
            asignacion.UltimaActualizacion = DateTime.UtcNow;
            asignacion.ActualizadoPor = currentUserName;

            // Si volvió a PENDIENTE, calcular si con abonos activos previos (si existieran) queda PAGADO o PENDIENTE
            if (nuevoEstado == "PENDIENTE")
            {
                decimal importeOriginal = asignacion.ActividadDeuda?.Importe ?? 0m;
                decimal abonado = (asignacion.HistorialPagos ?? Enumerable.Empty<HistorialPagoDeuda>())
                    .Where(h => h.Estado == "CONFIRMADO")
                    .Sum(h => h.Importe);
                if (importeOriginal > 0 && abonado >= importeOriginal)
                {
                    asignacion.Estado = "PAGADO";
                }
            }

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioId = currentUserId,
                UsuarioNombre = currentUserName,
                Accion = "CAMBIO_ESTADO_DEUDA",
                Entidad = "AsignacionActividadDeuda",
                EntidadId = asignacion.Id.ToString(),
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Cambio de estado de '{asignacion.ActividadDeuda?.Nombre}' ({usuarioNombre}): {estadoAnterior} -> {asignacion.Estado}."
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return MapAsignacionDto(asignacion, usuarioNombre);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<AsignacionDeudaDto> RevertirPagoAsync(
        int asignacionId,
        RevertirPagoDeudaRequest request,
        int currentUserId,
        string currentUserName,
        bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.Motivo))
            throw new InvalidOperationException("Debes indicar el motivo de la reversión del pago.");

        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var asignacion = await _context.AsignacionesActividadDeuda
                .Include(a => a.ActividadDeuda)
                .Include(a => a.Caja)
                .Include(a => a.HistorialPagos)
                .Include(a => a.Usuario!)
                    .ThenInclude(u => u.UsuarioRoles)
                        .ThenInclude(ur => ur.RolPersonalizado)
                .FirstOrDefaultAsync(a => a.Id == asignacionId)
                ?? throw new KeyNotFoundException("Registro de deuda no encontrado.");

            if (asignacion.Usuario != null && IsUserAdmin(asignacion.Usuario) && !isAdmin)
                throw new InvalidOperationException("No tienes permiso para modificar deudas de usuarios administradores.");

            HistorialPagoDeuda? abonoARevertir = null;
            if (request.HistorialPagoId.HasValue && request.HistorialPagoId.Value > 0)
            {
                abonoARevertir = asignacion.HistorialPagos
                    .FirstOrDefault(h => h.Id == request.HistorialPagoId.Value && h.Estado == "CONFIRMADO");

                if (abonoARevertir == null)
                    throw new InvalidOperationException("No se encontró el abono confirmado especificado para revertir.");
            }
            else
            {
                // Revertir el último abono confirmado
                abonoARevertir = asignacion.HistorialPagos
                    .Where(h => h.Estado == "CONFIRMADO")
                    .OrderByDescending(h => h.FechaPago)
                    .ThenByDescending(h => h.Id)
                    .FirstOrDefault();

                if (abonoARevertir == null)
                    throw new InvalidOperationException("Esta actividad no tiene abonos confirmados para revertir.");
            }

            await RevertirAbonoInternoAsync(abonoARevertir, asignacion, request.Motivo.Trim(), currentUserId, currentUserName);

            // Recalcular saldo pendiente tras la reversión
            decimal importeOriginal = asignacion.ActividadDeuda?.Importe ?? 0m;
            decimal abonadoRestante = asignacion.HistorialPagos
                .Where(h => h.Estado == "CONFIRMADO")
                .Sum(h => h.Importe);

            if (abonadoRestante < importeOriginal)
            {
                asignacion.Estado = "PENDIENTE";
            }

            var ultimoAbonoActivo = asignacion.HistorialPagos
                .Where(h => h.Estado == "CONFIRMADO")
                .OrderByDescending(h => h.FechaPago)
                .ThenByDescending(h => h.Id)
                .FirstOrDefault();

            if (ultimoAbonoActivo != null)
            {
                asignacion.FormaPago = ultimoAbonoActivo.FormaPago;
                asignacion.CajaId = ultimoAbonoActivo.CajaId;
                asignacion.OperacionTesoreriaId = ultimoAbonoActivo.OperacionTesoreriaId;
                asignacion.FechaPago = ultimoAbonoActivo.FechaPago;
                asignacion.RegistradoPagoPor = ultimoAbonoActivo.RegistradoPor;
            }
            else
            {
                asignacion.FormaPago = null;
                asignacion.CajaId = null;
                asignacion.OperacionTesoreriaId = null;
                asignacion.FechaPago = null;
                asignacion.RegistradoPagoPor = null;
            }

            asignacion.UltimaActualizacion = DateTime.UtcNow;
            asignacion.ActualizadoPor = currentUserName;

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            var usuarioNombre = asignacion.Usuario?.Nombre ?? $"Usuario #{asignacion.UsuarioId}";
            return MapAsignacionDto(asignacion, usuarioNombre);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private async Task RevertirAbonoInternoAsync(
        HistorialPagoDeuda abono,
        AsignacionActividadDeuda asignacion,
        string motivo,
        int currentUserId,
        string currentUserName)
    {
        var opOriginal = await _context.Operaciones
            .FirstOrDefaultAsync(o => o.Id == abono.OperacionTesoreriaId)
            ?? throw new InvalidOperationException($"El movimiento bancario original #{abono.OperacionTesoreriaId} no existe.");

        if (opOriginal.Estado == "ANULADA")
            throw new InvalidOperationException($"El movimiento bancario #{opOriginal.Id} ya fue revertido con anterioridad.");

        var caja = await _context.Cajas.FirstOrDefaultAsync(c => c.Id == opOriginal.CajaDestinoId)
            ?? throw new InvalidOperationException("La caja asociada al pago ya no existe.");

        if (caja.SaldoActual < opOriginal.Importe)
            throw new InvalidOperationException($"No se puede revertir el abono: la caja '{caja.Nombre}' tiene saldo insuficiente (${caja.SaldoActual:N2} MXN) para descontar ${opOriginal.Importe:N2} MXN.");

        // 1. Marcar operación original como ANULADA (se conserva en histórico de Operaciones)
        opOriginal.Estado = "ANULADA";

        // 2. Descontar saldo de la caja correspondiente
        caja.SaldoActual -= opOriginal.Importe;

        // 3. Registrar operación REVERSA vinculada en Movimientos Bancarios
        var opReversa = new Operacion
        {
            TipoOperacion = "REVERSA",
            OperacionRelacionadaId = opOriginal.Id,
            CajaOrigenId = caja.Id,
            FechaOperacion = DateTime.UtcNow,
            Importe = opOriginal.Importe,
            Concepto = $"Reversión de abono #{opOriginal.Id}: {asignacion.ActividadDeuda?.Nombre ?? "Deuda"}",
            Descripcion = motivo,
            Estado = "CONFIRMADA",
            UsuarioId = currentUserId,
            UsuarioNombre = currentUserName,
            FechaRegistro = DateTime.UtcNow,
            Observaciones = $"Reversa de abono de deuda (AsignacionId:{asignacion.Id}|HistorialPagoId:{abono.Id})"
        };
        _context.Operaciones.Add(opReversa);
        await _context.SaveChangesAsync();

        // 4. Actualizar historial de pago
        abono.Estado = "REVERTIDO";
        abono.OperacionReversaId = opReversa.Id;
        abono.FechaReversion = DateTime.UtcNow;
        abono.RevertidoPor = currentUserName;
        abono.MotivoReversion = motivo;

        // 5. Auditoría
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioId = currentUserId,
            UsuarioNombre = currentUserName,
            Accion = "REVERTIR_ABONO_DEUDA",
            Entidad = "HistorialPagoDeuda",
            EntidadId = abono.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Reversión de abono de ${opOriginal.Importe:N2} MXN (Op #{opOriginal.Id} -> Reversa #{opReversa.Id}) de '{asignacion.ActividadDeuda?.Nombre}'. Motivo: {motivo}"
        });
    }

    public async Task<List<HistorialPagoDeudaDto>> GetHistorialPagosAsync(int? usuarioId = null, int? actividadId = null)
    {
        var query = _context.HistorialPagosDeuda
            .Include(h => h.ActividadDeuda)
            .Include(h => h.Usuario)
            .AsQueryable();

        if (usuarioId.HasValue)
            query = query.Where(h => h.UsuarioId == usuarioId.Value);

        if (actividadId.HasValue)
            query = query.Where(h => h.ActividadDeudaId == actividadId.Value);

        var items = await query
            .OrderByDescending(h => h.FechaPago)
            .ThenByDescending(h => h.Id)
            .ToListAsync();

        return items.Select(h => new HistorialPagoDeudaDto(
            h.Id,
            h.AsignacionActividadDeudaId,
            h.ActividadDeudaId,
            h.ActividadDeuda?.Nombre ?? "Actividad",
            h.UsuarioId,
            h.Usuario?.Nombre ?? $"Usuario #{h.UsuarioId}",
            h.Importe,
            h.FormaPago,
            h.CajaId,
            h.CajaNombre,
            h.OperacionTesoreriaId,
            h.OperacionReversaId,
            h.Estado,
            h.FechaPago,
            h.RegistradoPor,
            h.FechaReversion,
            h.RevertidoPor,
            h.MotivoReversion
        )).ToList();
    }

    public async Task<List<OperacionDto>> GetMovimientosBancariosDeudasAsync()
    {
        var opIds = await _context.HistorialPagosDeuda
            .Select(h => h.OperacionTesoreriaId)
            .ToListAsync();

        var revIds = await _context.HistorialPagosDeuda
            .Where(h => h.OperacionReversaId.HasValue)
            .Select(h => h.OperacionReversaId!.Value)
            .ToListAsync();

        var allIds = opIds.Concat(revIds).Distinct().ToList();
        if (allIds.Count == 0) return new List<OperacionDto>();

        var ops = await _context.Operaciones
            .Include(o => o.CajaOrigen)
            .Include(o => o.CajaDestino)
            .Include(o => o.Detalles)
            .Where(o => allIds.Contains(o.Id))
            .OrderByDescending(o => o.FechaRegistro)
            .ToListAsync();

        return ops.Select(o => new OperacionDto(
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
            new List<DetalleOperacionDto>()
        )).ToList();
    }

    // ─── EVENTOS DE OMEGA ────────────────────────────────────────────────────────

    public async Task<List<EventoOmegaDto>> GetEventosAsync()
    {
        var list = await _context.EventosOmega
            .OrderBy(e => e.FechaHora)
            .ToListAsync();

        return list.Select(MapEventoDto).ToList();
    }

    public async Task<List<EventoOmegaDto>> GetProximosEventosAsync()
    {
        var now = DateTime.UtcNow;
        var list = await _context.EventosOmega
            .Where(e => e.Estado == "ACTIVO" && e.FechaHora >= now)
            .OrderBy(e => e.FechaHora)
            .ToListAsync();

        return list.Select(MapEventoDto).ToList();
    }

    public async Task<EventoOmegaDto> CreateEventoAsync(CreateOrUpdateEventoRequest request, string currentUserName)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            throw new InvalidOperationException("El nombre del evento es obligatorio.");

        var ev = new EventoOmega
        {
            Nombre = request.Nombre.Trim(),
            FechaHora = EnsureUtc(request.FechaHora),
            Ubicacion = string.IsNullOrWhiteSpace(request.Ubicacion) ? null : request.Ubicacion.Trim(),
            Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
            Estado = "ACTIVO",
            CreadoPor = currentUserName,
            FechaCreacion = DateTime.UtcNow
        };

        _context.EventosOmega.Add(ev);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "CREAR_EVENTO",
            Entidad = "EventoOmega",
            EntidadId = ev.Nombre,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Creación del evento '{ev.Nombre}' para el {ev.FechaHora:dd/MM/yyyy HH:mm}."
        });

        await _context.SaveChangesAsync();
        return MapEventoDto(ev);
    }

    public async Task<EventoOmegaDto> UpdateEventoAsync(int id, CreateOrUpdateEventoRequest request, string currentUserName)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            throw new InvalidOperationException("El nombre del evento es obligatorio.");

        var ev = await _context.EventosOmega.FindAsync(id)
            ?? throw new KeyNotFoundException("Evento no encontrado.");

        ev.Nombre = request.Nombre.Trim();
        ev.FechaHora = EnsureUtc(request.FechaHora);
        ev.Ubicacion = string.IsNullOrWhiteSpace(request.Ubicacion) ? null : request.Ubicacion.Trim();
        ev.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        ev.ModificadoPor = currentUserName;
        ev.FechaModificacion = DateTime.UtcNow;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "EDITAR_EVENTO",
            Entidad = "EventoOmega",
            EntidadId = ev.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Edición del evento '{ev.Nombre}'."
        });

        await _context.SaveChangesAsync();
        return MapEventoDto(ev);
    }

    public async Task<EventoOmegaDto> CancelarEventoAsync(int id, CancelarEventoRequest request, string currentUserName)
    {
        var ev = await _context.EventosOmega.FindAsync(id)
            ?? throw new KeyNotFoundException("Evento no encontrado.");

        if (ev.Estado == "CANCELADO")
            throw new InvalidOperationException("El evento ya está cancelado.");

        ev.Estado = "CANCELADO";
        ev.CanceladoPor = currentUserName;
        ev.FechaCancelacion = DateTime.UtcNow;
        ev.MotivoCancelacion = string.IsNullOrWhiteSpace(request.Motivo) ? "Cancelado por administración" : request.Motivo.Trim();

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "CANCELAR_EVENTO",
            Entidad = "EventoOmega",
            EntidadId = ev.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Cancelación del evento '{ev.Nombre}'. Motivo: {ev.MotivoCancelacion}"
        });

        await _context.SaveChangesAsync();
        return MapEventoDto(ev);
    }

    public async Task<bool> DeleteEventoAsync(int id, string currentUserName)
    {
        var ev = await _context.EventosOmega.FindAsync(id);
        if (ev == null) return false;

        // No eliminar eventos pasados que ya ocurrieron para conservar historial, sugerir cancelación o solo permitir eliminar futuros/borradores
        if (ev.FechaHora < DateTime.UtcNow && ev.Estado == "ACTIVO")
        {
            throw new InvalidOperationException("No se pueden eliminar eventos históricos pasados para conservar la trazabilidad.");
        }

        _context.EventosOmega.Remove(ev);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "ELIMINAR_EVENTO",
            Entidad = "EventoOmega",
            EntidadId = id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Eliminación del evento '{ev.Nombre}' (Fecha: {ev.FechaHora:dd/MM/yyyy HH:mm})."
        });

        await _context.SaveChangesAsync();
        return true;
    }

    private static EventoOmegaDto MapEventoDto(EventoOmega e) => new(
        e.Id,
        e.Nombre,
        e.FechaHora,
        e.Ubicacion,
        e.Descripcion,
        e.Estado,
        e.CreadoPor,
        e.FechaCreacion,
        e.CanceladoPor,
        e.FechaCancelacion,
        e.MotivoCancelacion
    );
}
