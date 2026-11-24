using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        if (response == null)
            return Unauthorized(new { message = "Credenciales incorrectas o usuario inactivo." });

        return Ok(response);
    }

    [HttpGet("users")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _authService.GetUsersAsync();
        return Ok(users);
    }

    [HttpPost("users")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var user = await _authService.CreateUserAsync(request, currentUser);
        if (user == null)
            return BadRequest(new { message = "El nombre de usuario ya está en uso." });

        return Ok(user);
    }

    [HttpPut("users/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var success = await _authService.UpdateUserAsync(id, request, currentUser);
        if (!success) return NotFound();
        return Ok(new { message = "Usuario actualizado." });
    }

    [HttpPatch("users/{id}/toggle-status")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var success = await _authService.ToggleUserStatusAsync(id, currentUser);
        if (!success) return NotFound();
        return Ok(new { message = "Estado actualizado." });
    }
}
