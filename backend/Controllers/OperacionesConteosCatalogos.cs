using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ConteosController : ControllerBase
{
    private readonly ITesoreriaService _tesoreriaService;

    public ConteosController(ITesoreriaService tesoreriaService)
    {
        _tesoreriaService = tesoreriaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? cajaId)
    {
        var conteos = await _tesoreriaService.GetConteosAsync(cajaId);
        return Ok(conteos);
    }

    [HttpPost]
    [Authorize(Roles = "Administrador,Tesorero")]
    public async Task<IActionResult> Registrar([FromBody] SaveConteoRequest request)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1");
            var userName = User.Identity?.Name ?? "Usuario";
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Tesorero";

            // Si solicita ajuste y no es administrador, verificar permisos
            if (request.AplicarAjuste && userRole != "Administrador")
            {
                return Forbid();
            }

            var conteo = await _tesoreriaService.RegistrarConteoAsync(request, userId, userName);
            return Ok(conteo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OperacionesController : ControllerBase
{
    private readonly ITesoreriaService _tesoreriaService;
    private readonly IAuthService _authService;

    public OperacionesController(ITesoreriaService tesoreriaService, IAuthService authService)
    {
        _tesoreriaService = tesoreriaService;
        _authService = authService;
    }

    [HttpGet]
    public async Task<IActionResult> GetHistorial(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin,
        [FromQuery] int? cajaId,
        [FromQuery] string? tipo,
        [FromQuery] string? usuario)
    {
        var ops = await _tesoreriaService.GetHistorialOperacionesAsync(fechaInicio, fechaFin, cajaId, tipo, usuario);
        return Ok(ops);
    }

    [HttpPost("entrada")]
    [Authorize]
    public async Task<IActionResult> RegistrarEntrada([FromBody] EntradaRequest request)
    {
        try
        {
            var userName = User.Identity?.Name ?? "Usuario";
            if (!await _authService.HasPermissionAsync(userName, "entradas"))
            {
                return StatusCode(403, new { message = "No tienes permiso para realizar entradas en Tesorería." });
            }

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1");
            var op = await _tesoreriaService.RegistrarEntradaAsync(request, userId, userName);
            return Ok(op);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("salida")]
    [Authorize(Roles = "Administrador,Tesorero")]
    public async Task<IActionResult> RegistrarSalida([FromBody] SalidaRequest request)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1");
            var userName = User.Identity?.Name ?? "Usuario";
            var op = await _tesoreriaService.RegistrarSalidaAsync(request, userId, userName);
            return Ok(op);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("transferencia")]
    [Authorize(Roles = "Administrador,Tesorero")]
    public async Task<IActionResult> RegistrarTransferencia([FromBody] TransferenciaRequest request)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1");
            var userName = User.Identity?.Name ?? "Usuario";
            var op = await _tesoreriaService.RegistrarTransferenciaAsync(request, userId, userName);
            return Ok(op);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public record AnularRequest(string Motivo);

    [HttpPost("{id}/anular")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Anular(int id, [FromBody] AnularRequest req)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1");
            var userName = User.Identity?.Name ?? "Administrador";
            var op = await _tesoreriaService.AnularOperacionAsync(id, req.Motivo, userId, userName);
            return Ok(op);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogosController : ControllerBase
{
    private readonly ITesoreriaService _tesoreriaService;

    public CatalogosController(ITesoreriaService tesoreriaService)
    {
        _tesoreriaService = tesoreriaService;
    }

    [HttpGet("denominaciones")]
    public async Task<IActionResult> GetDenominaciones()
    {
        var list = await _tesoreriaService.GetDenominacionesAsync();
        return Ok(list);
    }

    [HttpGet("tipos-bolsas")]
    public async Task<IActionResult> GetTiposBolsas([FromQuery] int? cajaId)
    {
        var list = await _tesoreriaService.GetTiposBolsasAsync(cajaId);
        return Ok(list);
    }

    [HttpPost("tipos-bolsas")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CreateTipoBolsa([FromBody] CreateTipoBolsaRequest request)
    {
        var userName = User.Identity?.Name ?? "Sistema";
        var created = await _tesoreriaService.CreateTipoBolsaAsync(request, userName);
        return Ok(created);
    }

    [HttpPut("tipos-bolsas/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateTipoBolsa(int id, [FromBody] UpdateTipoBolsaRequest request)
    {
        var userName = User.Identity?.Name ?? "Sistema";
        var ok = await _tesoreriaService.UpdateTipoBolsaAsync(id, request, userName);
        if (!ok) return NotFound(new { mensaje = "Tipo de bolsa no encontrado." });
        return Ok(new { mensaje = "Tipo de bolsa actualizado correctamente." });
    }

    [HttpDelete("tipos-bolsas/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> DeleteTipoBolsa(int id)
    {
        var userName = User.Identity?.Name ?? "Sistema";
        var ok = await _tesoreriaService.DeleteTipoBolsaAsync(id, userName);
        if (!ok) return NotFound(new { mensaje = "Tipo de bolsa no encontrado." });
        return Ok(new { mensaje = "Tipo de bolsa eliminado correctamente." });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ITesoreriaService _tesoreriaService;

    public DashboardController(ITesoreriaService tesoreriaService)
    {
        _tesoreriaService = tesoreriaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _tesoreriaService.GetDashboardSummaryAsync();
        return Ok(summary);
    }

    [HttpGet("auditoria")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> GetAuditoria()
    {
        var auditoria = await _tesoreriaService.GetAuditoriaAsync();
        return Ok(auditoria);
    }
}
