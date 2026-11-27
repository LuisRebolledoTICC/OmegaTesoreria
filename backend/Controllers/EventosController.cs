using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.Constants;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EventosController : ControllerBase
{
    private readonly IDeudasEventosService _service;
    private readonly IAuthService _authService;

    public EventosController(IDeudasEventosService service, IAuthService authService)
    {
        _service = service;
        _authService = authService;
    }

    private string CurrentUserName => User.Identity?.Name ?? "Sistema";
    private bool IsAdmin => User.IsInRole("Administrador");

    private async Task<bool> HasPermissionAsync(string perm)
    {
        if (IsAdmin) return true;
        return await _authService.HasPermissionAsync(CurrentUserName, perm);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (!await HasPermissionAsync(Permissions.EventosConsultar) && !await HasPermissionAsync(Permissions.Inicio))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar eventos." });
        }
        return Ok(await _service.GetEventosAsync());
    }

    [HttpGet("proximos")]
    public async Task<IActionResult> GetProximos()
    {
        if (!await HasPermissionAsync(Permissions.EventosConsultar) && !await HasPermissionAsync(Permissions.Inicio))
        {
            return StatusCode(403, new { message = "No tienes permiso para consultar los próximos eventos." });
        }
        return Ok(await _service.GetProximosEventosAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrUpdateEventoRequest request)
    {
        if (!await HasPermissionAsync(Permissions.EventosCrear))
        {
            return StatusCode(403, new { message = "No tienes permiso para crear eventos." });
        }

        try
        {
            var created = await _service.CreateEventoAsync(request, CurrentUserName);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateOrUpdateEventoRequest request)
    {
        if (!await HasPermissionAsync(Permissions.EventosEditar))
        {
            return StatusCode(403, new { message = "No tienes permiso para editar eventos." });
        }

        try
        {
            var updated = await _service.UpdateEventoAsync(id, request, CurrentUserName);
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

    [HttpPost("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(int id, [FromBody] CancelarEventoRequest request)
    {
        if (!await HasPermissionAsync(Permissions.EventosCancelar))
        {
            return StatusCode(403, new { message = "No tienes permiso para cancelar eventos." });
        }

        try
        {
            var updated = await _service.CancelarEventoAsync(id, request, CurrentUserName);
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await HasPermissionAsync(Permissions.EventosEliminar))
        {
            return StatusCode(403, new { message = "No tienes permiso para eliminar eventos." });
        }

        try
        {
            var ok = await _service.DeleteEventoAsync(id, CurrentUserName);
            if (!ok) return NotFound(new { message = "Evento no encontrado." });
            return Ok(new { message = "Evento eliminado exitosamente." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
