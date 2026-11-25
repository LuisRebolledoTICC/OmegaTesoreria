using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AreasController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public AreasController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    private string GetUserName() => User.Identity?.Name ?? "";
    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private bool IsAdmin() => User.IsInRole("Administrador");

    private static List<string> GetUserRoleNames(User user)
    {
        if (user.UsuarioRoles != null && user.UsuarioRoles.Count > 0)
        {
            var fromJoin = user.UsuarioRoles
                .Where(ur => ur.RolPersonalizado != null && !string.IsNullOrWhiteSpace(ur.RolPersonalizado.Nombre))
                .Select(ur => ur.RolPersonalizado!.Nombre)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (fromJoin.Count > 0) return fromJoin;
        }

        return (user.Rol ?? "")
            .Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static bool HasOmegaRole(User user)
    {
        return GetUserRoleNames(user).Any(p => p.Equals("Omega", StringComparison.OrdinalIgnoreCase));
    }

    // GET: api/areas
    [HttpGet]
    public async Task<IActionResult> GetAreas()
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "areas");
        if (!hasPermission) return Forbid();

        var query = _context.Areas
            .Include(a => a.Coordinador)
            .Include(a => a.Integrantes)
                .ThenInclude(i => i.Usuario)
            .AsQueryable();

        // Si no es admin, mostrar solo áreas activas
        if (!IsAdmin())
        {
            query = query.Where(a => a.Activa);
        }

        var areas = await query.OrderBy(a => a.Nombre).ToListAsync();

        var result = areas.Select(a => new AreaDto(
            a.Id,
            a.Nombre,
            a.Descripcion,
            a.Activa,
            a.CoordinadorId,
            a.Coordinador?.Nombre,
            a.FechaCreacion,
            a.Integrantes.Select(i => new AreaIntegranteDto(
                i.Id,
                i.UsuarioId,
                i.Usuario?.Nombre ?? "",
                i.Usuario?.UserName ?? "",
                i.FechaAsignacion
            )).OrderBy(i => i.UsuarioNombre).ToList()
        )).ToList();

        return Ok(result);
    }

    // GET: api/areas/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetArea(int id)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "areas");
        if (!hasPermission) return Forbid();

        var area = await _context.Areas
            .Include(a => a.Coordinador)
            .Include(a => a.Integrantes)
                .ThenInclude(i => i.Usuario)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (area == null) return NotFound(new { message = "Área no encontrada." });

        var dto = new AreaDto(
            area.Id,
            area.Nombre,
            area.Descripcion,
            area.Activa,
            area.CoordinadorId,
            area.Coordinador?.Nombre,
            area.FechaCreacion,
            area.Integrantes.Select(i => new AreaIntegranteDto(
                i.Id,
                i.UsuarioId,
                i.Usuario?.Nombre ?? "",
                i.Usuario?.UserName ?? "",
                i.FechaAsignacion
            )).OrderBy(i => i.UsuarioNombre).ToList()
        );

        return Ok(dto);
    }

    // POST: api/areas
    [HttpPost]
    public async Task<IActionResult> CreateArea([FromBody] CreateAreaRequest request)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "areas_crear");
        if (!hasPermission && !IsAdmin()) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre del área es obligatorio." });

        // Verificar nombre único
        if (await _context.Areas.AnyAsync(a => a.Nombre.ToLower() == request.Nombre.Trim().ToLower()))
            return BadRequest(new { message = "Ya existe un área con ese nombre." });

        // Verificar coordinador si se proporcionó
        if (request.CoordinadorId.HasValue)
        {
            var canAssignCoord = IsAdmin() || await _authService.HasPermissionAsync(userName, "areas_coordinador");
            if (!canAssignCoord) return Forbid();

            var coordinador = await _context.Users.FindAsync(request.CoordinadorId.Value);
            if (coordinador == null || !coordinador.Activo)
                return BadRequest(new { message = "El coordinador seleccionado no existe o no está activo." });
        }

        var area = new Area
        {
            Nombre = request.Nombre.Trim(),
            Descripcion = request.Descripcion?.Trim(),
            Activa = true,
            CoordinadorId = request.CoordinadorId,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Areas.Add(area);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "CREAR_AREA",
            Entidad = "Area",
            EntidadId = area.Nombre,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Creación del área '{area.Nombre}'"
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Área creada exitosamente.", id = area.Id });
    }

    // PUT: api/areas/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateArea(int id, [FromBody] UpdateAreaRequest request)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "areas_editar");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var area = await _context.Areas.FindAsync(id);
        if (area == null) return NotFound(new { message = "Área no encontrada." });

        // Verificar nombre único (excluyendo la actual)
        if (await _context.Areas.AnyAsync(a => a.Id != id && a.Nombre.ToLower() == request.Nombre.Trim().ToLower()))
            return BadRequest(new { message = "Ya existe otra área con ese nombre." });

        // Verificar coordinador si cambió
        if (request.CoordinadorId != area.CoordinadorId)
        {
            var canAssignCoord = IsAdmin() || await _authService.HasPermissionAsync(userName, "areas_coordinador");
            if (!canAssignCoord) return Forbid();
        }

        if (request.Activa != area.Activa)
        {
            var canToggle = IsAdmin() || await _authService.HasPermissionAsync(userName, "areas_desactivar");
            if (!canToggle) return Forbid();
        }

        if (request.CoordinadorId.HasValue)
        {
            var coordinador = await _context.Users.FindAsync(request.CoordinadorId.Value);
            if (coordinador == null || !coordinador.Activo)
                return BadRequest(new { message = "El coordinador seleccionado no existe o no está activo." });
        }

        area.Nombre = request.Nombre.Trim();
        area.Descripcion = request.Descripcion?.Trim();
        area.Activa = request.Activa;
        area.CoordinadorId = request.CoordinadorId;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "EDITAR_AREA",
            Entidad = "Area",
            EntidadId = id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Actualización del área '{area.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Área actualizada exitosamente." });
    }

    // PATCH: api/areas/{id}/toggle-status
    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "areas_desactivar");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var area = await _context.Areas.FindAsync(id);
        if (area == null) return NotFound(new { message = "Área no encontrada." });

        area.Activa = !area.Activa;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = area.Activa ? "ACTIVAR_AREA" : "DESACTIVAR_AREA",
            Entidad = "Area",
            EntidadId = id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Cambio de estado del área '{area.Nombre}' a {(area.Activa ? "Activa" : "Inactiva")}"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Área {(area.Activa ? "activada" : "desactivada")} exitosamente." });
    }

    // POST: api/areas/{id}/integrantes
    [HttpPost("{id}/integrantes")]
    public async Task<IActionResult> AddIntegrante(int id, [FromBody] AddIntegranteRequest request)
    {
        var userName = GetUserName();
        var userId = GetUserId();

        // Verificar permiso: admin o coordinador del área con permiso de administrar integrantes
        var area = await _context.Areas.Include(a => a.Integrantes).FirstOrDefaultAsync(a => a.Id == id);
        if (area == null) return NotFound(new { message = "Área no encontrada." });
        if (!area.Activa) return BadRequest(new { message = "No se pueden agregar integrantes a un área desactivada." });

        bool canManage = IsAdmin();
        if (!canManage)
        {
            // Coordinador de esta área con permiso
            if (area.CoordinadorId == userId)
            {
                canManage = await _authService.HasPermissionAsync(userName, "areas_integrantes");
            }
        }
        if (!canManage) return Forbid();

        // Verificar que el usuario existe y está activo
        var usuario = await _context.Users
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.RolPersonalizado)
            .FirstOrDefaultAsync(u => u.Id == request.UsuarioId);
        if (usuario == null || !usuario.Activo)
            return BadRequest(new { message = "El usuario seleccionado no existe o no está activo." });

        // Únicamente usuarios con rol Omega pueden agregarse como integrantes
        if (!HasOmegaRole(usuario))
            return BadRequest(new { message = $"El usuario '{usuario.Nombre}' no tiene el rol 'Omega' y no puede agregarse como integrante de un área." });

        // Verificar si ya pertenece a otra área (no se permite pertenecer a varias áreas simultáneamente)
        var existingAssignment = await _context.AreaIntegrantes
            .Include(ai => ai.Area)
            .FirstOrDefaultAsync(ai => ai.UsuarioId == request.UsuarioId);

        if (existingAssignment != null)
        {
            if (existingAssignment.AreaId == id)
                return BadRequest(new { message = $"El usuario '{usuario.Nombre}' ya es integrante de esta área." });

            return Conflict(new
            {
                message = $"El usuario '{usuario.Nombre}' ya pertenece al área '{existingAssignment.Area?.Nombre}'. Primero debe ser retirado de su área actual.",
                areaActual = existingAssignment.Area?.Nombre
            });
        }

        var integrante = new AreaIntegrante
        {
            AreaId = id,
            UsuarioId = request.UsuarioId,
            FechaAsignacion = DateTime.UtcNow
        };

        _context.AreaIntegrantes.Add(integrante);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "AGREGAR_INTEGRANTE",
            Entidad = "AreaIntegrante",
            EntidadId = $"{id}-{request.UsuarioId}",
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Agregar usuario '{usuario.Nombre}' al área '{area.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = $"'{usuario.Nombre}' agregado al área '{area.Nombre}'." });
    }

    // POST: api/areas/{id}/integrantes/batch
    [HttpPost("{id}/integrantes/batch")]
    public async Task<IActionResult> AddIntegrantesBatch(int id, [FromBody] AddIntegrantesBatchRequest request)
    {
        var userName = GetUserName();
        var userId = GetUserId();

        var area = await _context.Areas.Include(a => a.Integrantes).FirstOrDefaultAsync(a => a.Id == id);
        if (area == null) return NotFound(new { message = "Área no encontrada." });
        if (!area.Activa) return BadRequest(new { message = "No se pueden agregar integrantes a un área desactivada." });

        bool canManage = IsAdmin();
        if (!canManage && area.CoordinadorId == userId)
        {
            canManage = await _authService.HasPermissionAsync(userName, "areas_integrantes");
        }
        if (!canManage) return Forbid();

        var distinctIds = (request.UsuarioIds ?? new List<int>()).Distinct().ToList();
        if (distinctIds.Count == 0)
            return BadRequest(new { message = "Debes seleccionar al menos un usuario." });

        var usuarios = await _context.Users
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.RolPersonalizado)
            .Where(u => distinctIds.Contains(u.Id) && u.Activo)
            .ToListAsync();

        if (usuarios.Count != distinctIds.Count)
            return BadRequest(new { message = "Uno o más usuarios seleccionados no existen o no están activos." });

        var nonOmegaUser = usuarios.FirstOrDefault(u => !HasOmegaRole(u));
        if (nonOmegaUser != null)
            return BadRequest(new { message = $"Solo se pueden agregar usuarios con rol 'Omega'. El usuario '{nonOmegaUser.Nombre}' tiene rol '{nonOmegaUser.Rol}'." });

        var existingAssignments = await _context.AreaIntegrantes
            .Include(ai => ai.Area)
            .Include(ai => ai.Usuario)
            .Where(ai => distinctIds.Contains(ai.UsuarioId))
            .ToListAsync();

        if (existingAssignments.Count > 0)
        {
            var first = existingAssignments[0];
            var nombreUsuario = first.Usuario?.Nombre ?? $"ID {first.UsuarioId}";
            if (first.AreaId == id)
                return BadRequest(new { message = $"El usuario '{nombreUsuario}' ya es integrante de esta área." });

            return Conflict(new
            {
                message = $"El usuario '{nombreUsuario}' ya pertenece al área '{first.Area?.Nombre}'. Primero debe ser retirado de su área actual."
            });
        }

        foreach (var u in usuarios)
        {
            _context.AreaIntegrantes.Add(new AreaIntegrante
            {
                AreaId = id,
                UsuarioId = u.Id,
                FechaAsignacion = DateTime.UtcNow
            });

            _context.Auditoria.Add(new Auditoria
            {
                UsuarioNombre = userName,
                Accion = "AGREGAR_INTEGRANTE",
                Entidad = "AreaIntegrante",
                EntidadId = $"{id}-{u.Id}",
                FechaHora = DateTime.UtcNow,
                Descripcion = $"Agregar usuario '{u.Nombre}' al área '{area.Nombre}'"
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"{usuarios.Count} integrante(s) agregado(s) al área '{area.Nombre}'.", count = usuarios.Count });
    }

    // DELETE: api/areas/{areaId}/integrantes/{userId}
    [HttpDelete("{areaId}/integrantes/{userId}")]
    public async Task<IActionResult> RemoveIntegrante(int areaId, int userId)
    {
        var userName = GetUserName();
        var currentUserId = GetUserId();

        var area = await _context.Areas.FindAsync(areaId);
        if (area == null) return NotFound(new { message = "Área no encontrada." });

        bool canManage = IsAdmin();
        if (!canManage)
        {
            if (area.CoordinadorId == currentUserId)
                canManage = await _authService.HasPermissionAsync(userName, "areas_integrantes");
        }
        if (!canManage) return Forbid();

        var integrante = await _context.AreaIntegrantes
            .Include(ai => ai.Usuario)
            .FirstOrDefaultAsync(ai => ai.AreaId == areaId && ai.UsuarioId == userId);

        if (integrante == null)
            return NotFound(new { message = "El usuario no es integrante de esta área." });

        _context.AreaIntegrantes.Remove(integrante);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "RETIRAR_INTEGRANTE",
            Entidad = "AreaIntegrante",
            EntidadId = $"{areaId}-{userId}",
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Retirar usuario '{integrante.Usuario?.Nombre}' del área '{area.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Integrante retirado del área '{area.Nombre}'." });
    }

    // GET: api/areas/mi-area
    [HttpGet("mi-area")]
    public async Task<IActionResult> GetMiArea()
    {
        var userId = GetUserId();
        var areaIntegrante = await _context.AreaIntegrantes
            .Include(ai => ai.Area)
            .FirstOrDefaultAsync(ai => ai.UsuarioId == userId);

        if (areaIntegrante != null && areaIntegrante.Area != null && areaIntegrante.Area.Activa)
            return Ok(new { areaId = areaIntegrante.AreaId, areaNombre = areaIntegrante.Area.Nombre, esCoordinador = areaIntegrante.Area.CoordinadorId == userId });

        // También verificar si es coordinador de algún área activa aunque no esté en AreaIntegrantes
        var areaCoord = await _context.Areas
            .FirstOrDefaultAsync(a => a.CoordinadorId == userId && a.Activa);

        if (areaCoord != null)
            return Ok(new { areaId = areaCoord.Id, areaNombre = areaCoord.Nombre, esCoordinador = true });

        return Ok(new { areaId = (int?)null, areaNombre = (string?)null, esCoordinador = false });
    }

    // GET: api/areas/usuarios-disponibles
    [HttpGet("usuarios-disponibles")]
    public async Task<IActionResult> GetUsuariosDisponibles([FromQuery] bool soloSinArea = false, [FromQuery] bool soloOmega = false)
    {
        var userName = GetUserName();
        var userId = GetUserId();

        bool canList = IsAdmin()
            || await _authService.HasPermissionAsync(userName, "areas_crear")
            || await _authService.HasPermissionAsync(userName, "areas_editar")
            || await _authService.HasPermissionAsync(userName, "areas_coordinador")
            || await _authService.HasPermissionAsync(userName, "areas_integrantes");

        if (!canList)
        {
            // También permitir si es coordinador de alguna área activa y tiene permiso areas_integrantes
            var isCoord = await _context.Areas.AnyAsync(a => a.CoordinadorId == userId && a.Activa);
            if (!isCoord) return Forbid();
        }

        var users = await _context.Users
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.RolPersonalizado)
            .Where(u => u.Activo)
            .OrderBy(u => u.Nombre)
            .ToListAsync();

        var asignaciones = await _context.AreaIntegrantes
            .Include(ai => ai.Area)
            .ToDictionaryAsync(ai => ai.UsuarioId, ai => new { ai.AreaId, AreaNombre = ai.Area != null ? ai.Area.Nombre : "" });

        var result = users
            .Where(u => (!soloSinArea || !asignaciones.ContainsKey(u.Id)) && (!soloOmega || HasOmegaRole(u)))
            .Select(u =>
            {
                var roles = GetUserRoleNames(u);
                return new
                {
                    u.Id,
                    u.Nombre,
                    u.UserName,
                    Rol = roles.Count > 0 ? string.Join(", ", roles) : u.Rol,
                    Roles = roles,
                    AreaActualId = asignaciones.ContainsKey(u.Id) ? (int?)asignaciones[u.Id].AreaId : null,
                    AreaActualNombre = asignaciones.ContainsKey(u.Id) ? asignaciones[u.Id].AreaNombre : null
                };
            });

        return Ok(result);
    }
}
