using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PresupuestosController : ControllerBase
{
    private readonly IPresupuestosService _presupuestosService;
    private readonly IAuthService _authService;

    public PresupuestosController(IPresupuestosService presupuestosService, IAuthService authService)
    {
        _presupuestosService = presupuestosService;
        _authService = authService;
    }

    private string GetUserName() => User.Identity?.Name ?? "";
    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private bool IsAdmin() => User.IsInRole("Administrador");

    private async Task<bool> HasAnyPermissionAsync(params string[] permisos)
    {
        if (IsAdmin()) return true;
        var userName = GetUserName();
        foreach (var p in permisos)
        {
            if (await _authService.HasPermissionAsync(userName, p))
                return true;
        }
        return false;
    }

    // GET: api/presupuestos
    [HttpGet]
    public async Task<IActionResult> GetResumen()
    {
        if (!await HasAnyPermissionAsync("presupuestos", "presupuestos_ver_todos", "presupuestos_administrar"))
            return Forbid();

        var data = await _presupuestosService.GetResumenAreasAsync(GetUserId(), GetUserName(), IsAdmin());
        return Ok(data);
    }

    // GET: api/presupuestos/areas-activas
    [HttpGet("areas-activas")]
    public async Task<IActionResult> GetAreasActivas([FromServices] OmegaTesoreria.Api.Data.AppDbContext db)
    {
        if (!await HasAnyPermissionAsync("presupuestos", "presupuestos_ver_todos", "presupuestos_asignar", "presupuestos_devolver", "presupuestos_ajustes", "presupuestos_administrar"))
            return Forbid();

        var areas = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
            db.Areas
                .Where(a => a.Activa)
                .OrderBy(a => a.Nombre)
                .Select(a => new { a.Id, a.Nombre })
        );
        return Ok(areas);
    }

    // GET: api/presupuestos/area/{areaId}
    [HttpGet("area/{areaId}")]
    public async Task<IActionResult> GetDetalleArea(int areaId)
    {
        if (!await HasAnyPermissionAsync("presupuestos", "presupuestos_ver_todos", "presupuestos_historial", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var data = await _presupuestosService.GetDetalleAreaAsync(areaId, GetUserId(), GetUserName(), IsAdmin());
            return Ok(data);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    // POST: api/presupuestos/asignar
    [HttpPost("asignar")]
    public async Task<IActionResult> Asignar([FromBody] AsignarPresupuestoRequest request)
    {
        if (!await HasAnyPermissionAsync("presupuestos_asignar", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var mov = await _presupuestosService.AsignarPresupuestoAsync(request, GetUserId(), GetUserName());
            return Ok(mov);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/presupuestos/egresos
    [HttpPost("egresos")]
    public async Task<IActionResult> RegistrarEgreso([FromBody] RegistrarEgresoPresupuestoRequest request)
    {
        if (!await HasAnyPermissionAsync("presupuestos_egresos_registrar", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var mov = await _presupuestosService.RegistrarEgresoAsync(request, GetUserId(), GetUserName(), IsAdmin());
            return Ok(mov);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT: api/presupuestos/egresos/{id}
    [HttpPut("egresos/{id}")]
    public async Task<IActionResult> EditarEgreso(int id, [FromBody] EditarEgresoPresupuestoRequest request)
    {
        if (!await HasAnyPermissionAsync("presupuestos_egresos_editar", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var mov = await _presupuestosService.EditarEgresoAsync(id, request, GetUserId(), GetUserName(), IsAdmin());
            return Ok(mov);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/presupuestos/egresos/{id}/cancelar
    [HttpPost("egresos/{id}/cancelar")]
    public async Task<IActionResult> CancelarEgreso(int id, [FromBody] CancelarEgresoPresupuestoRequest? request)
    {
        if (!await HasAnyPermissionAsync("presupuestos_egresos_cancelar", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var mov = await _presupuestosService.CancelarEgresoAsync(
                id,
                request ?? new CancelarEgresoPresupuestoRequest(null),
                GetUserId(),
                GetUserName(),
                IsAdmin()
            );
            return Ok(mov);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/presupuestos/devolver
    [HttpPost("devolver")]
    public async Task<IActionResult> Devolver([FromBody] DevolverPresupuestoRequest request)
    {
        if (!await HasAnyPermissionAsync("presupuestos_devolver", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var mov = await _presupuestosService.DevolverPresupuestoAsync(request, GetUserId(), GetUserName());
            return Ok(mov);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/presupuestos/ajustes
    [HttpPost("ajustes")]
    public async Task<IActionResult> RegistrarAjuste([FromBody] AjustePresupuestoRequest request)
    {
        if (!await HasAnyPermissionAsync("presupuestos_ajustes", "presupuestos_administrar"))
            return Forbid();

        try
        {
            var mov = await _presupuestosService.RegistrarAjusteAsync(request, GetUserId(), GetUserName());
            return Ok(mov);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
