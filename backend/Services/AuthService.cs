using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<List<UserDto>> GetUsersAsync();
    Task<UserDto?> CreateUserAsync(CreateUserRequest request, string currentUserName);
    Task<bool> UpdateUserAsync(int id, UpdateUserRequest request, string currentUserName);
    Task<bool> ToggleUserStatusAsync(int id, string currentUserName);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName.ToLower() == request.UserName.ToLower());
        if (user == null || !user.Activo)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        user.UltimoAcceso = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        return new LoginResponse(token, user.UserName, user.Nombre, user.Rol);
    }

    public async Task<List<UserDto>> GetUsersAsync()
    {
        return await _context.Users
            .OrderBy(u => u.UserName)
            .Select(u => new UserDto(u.Id, u.UserName, u.Nombre, u.Rol, u.Activo, u.FechaCreacion, u.UltimoAcceso))
            .ToListAsync();
    }

    public async Task<UserDto?> CreateUserAsync(CreateUserRequest request, string currentUserName)
    {
        if (await _context.Users.AnyAsync(u => u.UserName.ToLower() == request.UserName.ToLower()))
            return null;

        var user = new User
        {
            UserName = request.UserName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Nombre = request.Nombre.Trim(),
            Rol = request.Rol,
            Activo = true,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "CREAR_USUARIO",
            Entidad = "User",
            EntidadId = user.UserName,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Creación del usuario {user.UserName} con rol {user.Rol}"
        });

        await _context.SaveChangesAsync();
        return new UserDto(user.Id, user.UserName, user.Nombre, user.Rol, user.Activo, user.FechaCreacion, user.UltimoAcceso);
    }

    public async Task<bool> UpdateUserAsync(int id, UpdateUserRequest request, string currentUserName)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.Nombre = request.Nombre;
        user.Rol = request.Rol;
        user.Activo = request.Activo;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "EDITAR_USUARIO",
            Entidad = "User",
            EntidadId = user.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Actualización de datos para el usuario {user.UserName}"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleUserStatusAsync(int id, string currentUserName)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.Activo = !user.Activo;
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = user.Activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
            Entidad = "User",
            EntidadId = user.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Cambio de estado de usuario {user.UserName} a {(user.Activo ? "Activo" : "Inactivo")}"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? "OmegaSecretKeyForTreasuryManagementApplicationLocalSecure2026!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName),
            new Claim("FullName", user.Nombre),
            new Claim(ClaimTypes.Role, user.Rol)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "OmegaTesoreria",
            audience: _configuration["Jwt:Audience"] ?? "OmegaTesoreriaClients",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
