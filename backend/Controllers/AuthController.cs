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

    [HttpGet("perfil")]
    [Authorize]
    public async Task<IActionResult> GetPerfil()
    {
        var userName = User.Identity?.Name ?? "";
        var perfil = await _authService.GetPerfilAsync(userName);
        if (perfil == null) return NotFound();
        return Ok(perfil);
    }

    [HttpPut("perfil")]
    [Authorize]
    public async Task<IActionResult> UpdatePerfil([FromBody] UpdatePerfilDto request)
    {
        var userName = User.Identity?.Name ?? "";
        var result = await _authService.UpdatePerfilAsync(userName, request);
        if (!result.Success) return BadRequest(new { message = result.ErrorMessage });
        return Ok(result.Session);
    }

    [HttpDelete("users/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var (success, errorMessage) = await _authService.DeleteUserAsync(id, currentUser);
        if (!success) return BadRequest(new { message = errorMessage ?? "No se pudo eliminar el usuario." });
        return Ok(new { message = "Usuario eliminado permanentemente." });
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
            return BadRequest(new { message = "El nombre de usuario ya está en uso o no se asignaron roles válidos." });

        return Ok(user);
    }

    [HttpPut("users/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var (success, errorMessage) = await _authService.UpdateUserAsync(id, request, currentUser);
        if (!success)
        {
            if (errorMessage == "Usuario no encontrado.") return NotFound(new { message = errorMessage });
            return BadRequest(new { message = errorMessage ?? "No se pudo actualizar el usuario." });
        }
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

    [HttpGet("roles")]
    [Authorize]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _authService.GetRolesAsync();
        return Ok(roles);
    }

    [HttpPost("roles")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CreateRol([FromBody] CreateOrUpdateRolRequest request)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var rol = await _authService.CreateRolAsync(request, currentUser);
        if (rol == null)
            return BadRequest(new { message = "Ya existe un rol con ese nombre." });

        return Ok(rol);
    }

    [HttpPut("roles/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateRol(int id, [FromBody] CreateOrUpdateRolRequest request)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var success = await _authService.UpdateRolAsync(id, request, currentUser);
        if (!success) return NotFound();

        return Ok(new { message = "Rol actualizado exitosamente." });
    }

    [HttpDelete("roles/{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> DeleteRol(int id)
    {
        var currentUser = User.Identity?.Name ?? "Sistema";
        var success = await _authService.DeleteRolAsync(id, currentUser);
        if (!success)
            return BadRequest(new { message = "No se puede eliminar un rol del sistema o que tenga usuarios asignados." });

        return Ok(new { message = "Rol eliminado." });
    }
}
