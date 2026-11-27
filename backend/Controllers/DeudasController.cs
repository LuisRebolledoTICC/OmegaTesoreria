using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.Constants;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DeudasController : ControllerBase
{
    private readonly IDeudasEventosService _service;
    private readonly IAuthService _authService;

    public DeudasController(IDeudasEventosService service, IAuthService authService)
    {
        _service = service;
        _authService = authService;
    }

    private string CurrentUserName => User.Identity?.Name ?? "Sistema";
    private int CurrentUserId
    {
        get
        {
            var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(val, out var id) ? id : 1;
        }
    }
    private bool IsAdmin => User.IsInRole("Administrador");

    private async Task<bool> HasAnyPermissionAsync(params string[] perms)
    {
        if (IsAdmin) return true;
        foreach (var p in perms)
        {
            if (await _authService.HasPermissionAsync(CurrentUserName, p))
                return true;
        }
        return false;
    }

    // ─── CONSULTAS PERSONALES (USUARIOS NORMALES DE OMEGA E INICIO) ───────────

    [HttpGet("mis-deudas")]
    public async Task<IActionResult> GetMisDeudas()
    {
        if (!await HasAnyPermissionAsync(
            Permissions.DeudasConsultarPropias,
            Permissions.DeudasConsultarTodos,
            Permissions.Inicio))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar tus deudas." });
        }

        var detalle = await _service.GetMisDeudasAsync(CurrentUserId);
        if (detalle == null) return NotFound(new { message = "Usuario no encontrado." });
        return Ok(detalle);
    }

    // ─── CONSULTAS GLOBALES Y DETALLE POR USUARIO ──────────────────────────────

    [HttpGet("usuarios")]
    public async Task<IActionResult> GetResumenUsuarios()
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasConsultarTodos))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar las deudas de todos los usuarios." });
        }

        var resumen = await _service.GetResumenGlobalAsync();
        return Ok(resumen);
    }

    [HttpGet("usuarios/{usuarioId}")]
    public async Task<IActionResult> GetDetalleUsuario(int usuarioId)
    {
        // Si es su propio usuario, permitir si tiene deudas_consultar_propias
        if (usuarioId == CurrentUserId && await HasAnyPermissionAsync(Permissions.DeudasConsultarPropias, Permissions.DeudasConsultarTodos, Permissions.DeudasConsultarDetalle))
        {
            var propio = await _service.GetDetalleUsuarioAsync(usuarioId);
            return propio == null ? NotFound() : Ok(propio);
        }

        if (!await HasAnyPermissionAsync(Permissions.DeudasConsultarDetalle, Permissions.DeudasConsultarTodos))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar el detalle de deudas de otros usuarios." });
        }

        var detalle = await _service.GetDetalleUsuarioAsync(usuarioId);
        if (detalle == null) return NotFound(new { message = "Usuario no encontrado." });
        return Ok(detalle);
    }

    // ─── ACTIVIDADES DE DEUDA ──────────────────────────────────────────────────

    [HttpGet("actividades")]
    public async Task<IActionResult> GetActividades()
    {
        if (!await HasAnyPermissionAsync(
            Permissions.DeudasConsultarTodos,
            Permissions.DeudasConsultarDetalle,
            Permissions.DeudasActividadesCrear,
            Permissions.DeudasActividadesEditar,
            Permissions.DeudasActividadesAsignar))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar las actividades de deuda." });
        }

        var list = await _service.GetActividadesAsync();
        return Ok(list);
    }

    [HttpPost("actividades")]
    public async Task<IActionResult> CreateActividad([FromBody] CreateActividadDeudaRequest request)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasActividadesCrear))
        {
            return StatusCode(403, new { message = "No tienes permiso para crear actividades de deuda." });
        }

        try
        {
            var created = await _service.CreateActividadAsync(request, CurrentUserName);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("actividades/{id}")]
    public async Task<IActionResult> UpdateActividad(int id, [FromBody] UpdateActividadDeudaRequest request)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasActividadesEditar))
        {
            return StatusCode(403, new { message = "No tienes permiso para editar actividades de deuda." });
        }

        try
        {
            var updated = await _service.UpdateActividadAsync(id, request, CurrentUserName);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("actividades/{id}/asignar-faltantes")]
    public async Task<IActionResult> AsignarFaltantes(int id)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasActividadesAsignar))
        {
            return StatusCode(403, new { message = "No tienes permiso para administrar asignaciones de actividades." });
        }

        try
        {
            int count = await _service.AsignarUsuariosFaltantesAsync(id, CurrentUserName);
            return Ok(new { asignados = count, message = count > 0 ? $"Se asignó la actividad a {count} usuario(s) nuevo(s) de Omega." : "Todos los usuarios elegibles de Omega ya tenían esta actividad asignada." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── PAGOS, CAMBIOS DE ESTADO Y REVERSIÓN ──────────────────────────────────

    [HttpPost("asignaciones/{asignacionId}/pagar")]
    public async Task<IActionResult> RegistrarPago(int asignacionId, [FromBody] RegistrarPagoDeudaRequest request)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasPagosRegistrar))
        {
            return StatusCode(403, new { message = "No tienes permiso para registrar pagos de deudas." });
        }

        try
        {
            var res = await _service.RegistrarPagoAsync(asignacionId, request, CurrentUserId, CurrentUserName, IsAdmin);
            return Ok(res);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("asignaciones/{asignacionId}/estado")]
    public async Task<IActionResult> CambiarEstado(int asignacionId, [FromBody] CambiarEstadoAsignacionRequest request)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasPagosRegistrar, Permissions.DeudasActividadesAsignar))
        {
            return StatusCode(403, new { message = "No tienes permiso para cambiar el estado de asistencia o deuda." });
        }

        try
        {
            var res = await _service.CambiarEstadoAsync(asignacionId, request, CurrentUserId, CurrentUserName, IsAdmin);
            return Ok(res);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("asignaciones/{asignacionId}/revertir-pago")]
    public async Task<IActionResult> RevertirPago(int asignacionId, [FromBody] RevertirPagoDeudaRequest request)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasPagosRevertir))
        {
            return StatusCode(403, new { message = "No tienes permiso para revertir pagos de deudas." });
        }

        try
        {
            var res = await _service.RevertirPagoAsync(asignacionId, request, CurrentUserId, CurrentUserName, IsAdmin);
            return Ok(res);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("pagos/historial")]
    public async Task<IActionResult> GetHistorialPagos([FromQuery] int? usuarioId, [FromQuery] int? actividadId)
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasPagosHistorial))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar el historial de pagos." });
        }

        var list = await _service.GetHistorialPagosAsync(usuarioId, actividadId);
        return Ok(list);
    }

    [HttpGet("movimientos-bancarios")]
    public async Task<IActionResult> GetMovimientosBancarios()
    {
        if (!await HasAnyPermissionAsync(Permissions.DeudasMovimientosBancarios))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar los movimientos bancarios relacionados con pagos." });
        }

        var list = await _service.GetMovimientosBancariosDeudasAsync();
        return Ok(list);
    }
}
