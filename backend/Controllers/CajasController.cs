using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CajasController : ControllerBase
{
    private readonly ITesoreriaService _tesoreriaService;

    public CajasController(ITesoreriaService tesoreriaService)
    {
        _tesoreriaService = tesoreriaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var cajas = await _tesoreriaService.GetCajasAsync(includeInactive);
        return Ok(cajas);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var caja = await _tesoreriaService.GetCajaByIdAsync(id);
        if (caja == null) return NotFound();
        return Ok(caja);
    }

    [HttpPost]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Create([FromBody] CreateCajaRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "1");
        var userName = User.Identity?.Name ?? "Admin";
        var caja = await _tesoreriaService.CreateCajaAsync(request, userId, userName);
        return CreatedAtAction(nameof(GetById), new { id = caja.Id }, caja);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCajaRequest request)
    {
        var userName = User.Identity?.Name ?? "Admin";
        var success = await _tesoreriaService.UpdateCajaAsync(id, request, userName);
        if (!success) return NotFound();
        return Ok(new { message = "Caja actualizada." });
    }

    [HttpPatch("{id}/toggle-status")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var userName = User.Identity?.Name ?? "Admin";
        var success = await _tesoreriaService.ToggleCajaStatusAsync(id, userName);
        if (!success) return NotFound();
        return Ok(new { message = "Estado actualizado." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Delete(int id)
    {
        var userName = User.Identity?.Name ?? "Admin";
        var success = await _tesoreriaService.DeleteCajaAsync(id, userName);
        if (!success) return NotFound();
        return Ok(new { message = "Caja eliminada permanentemente." });
    }
}
