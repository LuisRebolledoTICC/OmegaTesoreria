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
    Task<(bool Success, string? ErrorMessage)> UpdateUserAsync(int id, UpdateUserRequest request, string currentUserName);
    Task<bool> ToggleUserStatusAsync(int id, string currentUserName);
    Task<List<RolPersonalizadoDto>> GetRolesAsync();
    Task<RolPersonalizadoDto?> CreateRolAsync(CreateOrUpdateRolRequest request, string currentUserName);
    Task<bool> UpdateRolAsync(int id, CreateOrUpdateRolRequest request, string currentUserName);
    Task<bool> DeleteRolAsync(int id, string currentUserName);
    Task<bool> HasPermissionAsync(string userName, string modulo);
    Task<UserDto?> GetPerfilAsync(string userName);
    Task<(bool Success, string? ErrorMessage, LoginResponse? Session)> UpdatePerfilAsync(string userName, UpdatePerfilDto dto);
    Task<(bool Success, string? ErrorMessage)> DeleteUserAsync(int id, string currentUserName);
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

        // Obtener permisos/módulos según el rol
        var modulos = await GetModulosForRolAsync(user.Rol);
        var token = GenerateJwtToken(user);
        return new LoginResponse(token, user.UserName, user.Nombre, user.Rol, modulos, user.Id);
    }

    private async Task<List<string>> GetModulosForRolAsync(string rolNombre)
    {
        var rolDb = await _context.RolesPersonalizados.FirstOrDefaultAsync(r => r.Nombre == rolNombre);
        if (rolDb != null)
        {
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<string>>(rolDb.ModulosPermitidosJson) ?? new();
            }
            catch { }
        }

        if (rolNombre == "Administrador")
        {
            return new List<string> { "dashboard", "cajas", "conteo", "operaciones", "ventas", "reportes", "usuarios", "entradas" };
        }
        if (rolNombre == "Tesorero")
        {
            return new List<string> { "dashboard", "cajas", "conteo", "operaciones", "ventas", "reportes", "entradas" };
        }
        return new List<string> { "dashboard", "cajas", "ventas", "reportes" };
    }

    public async Task<List<UserDto>> GetUsersAsync()
    {
        return await _context.Users
            .OrderBy(u => u.Nombre.ToLower())
            .ThenBy(u => u.UserName.ToLower())
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

    public async Task<(bool Success, string? ErrorMessage)> UpdateUserAsync(int id, UpdateUserRequest request, string currentUserName)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return (false, "Usuario no encontrado.");

        if (string.IsNullOrWhiteSpace(request.Nombre))
            return (false, "El nombre completo es obligatorio.");

        if (!string.IsNullOrWhiteSpace(request.UserName))
        {
            var newUserName = request.UserName.Trim();
            if (!string.Equals(user.UserName, newUserName, StringComparison.OrdinalIgnoreCase))
            {
                var exists = await _context.Users.AnyAsync(u => u.UserName.ToLower() == newUserName.ToLower() && u.Id != id);
                if (exists)
                    return (false, "El nombre de usuario ya está en uso por otra cuenta.");
                user.UserName = newUserName;
            }
        }

        user.Nombre = request.Nombre.Trim();
        user.Rol = request.Rol;
        user.Activo = request.Activo;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Trim().Length < 6)
                return (false, "La contraseña debe tener al menos 6 caracteres.");
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword.Trim());
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
        return (true, null);
    }

    public async Task<UserDto?> GetPerfilAsync(string userName)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName.ToLower() == userName.ToLower() && u.Activo);
        if (user == null) return null;
        return new UserDto(user.Id, user.UserName, user.Nombre, user.Rol, user.Activo, user.FechaCreacion, user.UltimoAcceso);
    }

    public async Task<(bool Success, string? ErrorMessage, LoginResponse? Session)> UpdatePerfilAsync(string userName, UpdatePerfilDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName.ToLower() == userName.ToLower() && u.Activo);
        if (user == null) return (false, "Usuario no encontrado.", null);

        var newNombre = dto.Nombre?.Trim() ?? "";
        var newUserName = dto.UserName?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(newNombre))
            return (false, "El nombre completo es obligatorio.", null);
        if (string.IsNullOrWhiteSpace(newUserName))
            return (false, "El nombre de usuario es obligatorio.", null);

        if (!string.Equals(user.UserName, newUserName, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await _context.Users.AnyAsync(u => u.UserName.ToLower() == newUserName.ToLower() && u.Id != user.Id);
            if (exists)
                return (false, "El nombre de usuario ya está registrado por otra cuenta.", null);
        }

        if (!string.IsNullOrWhiteSpace(dto.PasswordActual) || !string.IsNullOrWhiteSpace(dto.NuevaPassword))
        {
            if (string.IsNullOrWhiteSpace(dto.PasswordActual))
                return (false, "Debes ingresar tu contraseña actual para cambiarla.", null);
            if (string.IsNullOrWhiteSpace(dto.NuevaPassword))
                return (false, "Debes ingresar la nueva contraseña.", null);

            if (!BCrypt.Net.BCrypt.Verify(dto.PasswordActual, user.PasswordHash))
                return (false, "La contraseña actual es incorrecta.", null);

            var pw = dto.NuevaPassword.Trim();
            if (pw.Length < 6)
                return (false, "La nueva contraseña debe tener al menos 6 caracteres.", null);

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(pw);
        }

        user.Nombre = newNombre;
        user.UserName = newUserName;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioId = user.Id,
            UsuarioNombre = newUserName,
            Accion = "ACTUALIZAR_PERFIL",
            Entidad = "User",
            EntidadId = user.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"El usuario {user.UserName} actualizó su perfil personal"
        });

        await _context.SaveChangesAsync();

        var modulos = await GetModulosForRolAsync(user.Rol);
        var token = GenerateJwtToken(user);
        var session = new LoginResponse(token, user.UserName, user.Nombre, user.Rol, modulos, user.Id);
        return (true, null, session);
    }

    public async Task<(bool Success, string? ErrorMessage)> DeleteUserAsync(int id, string currentUserName)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return (false, "Usuario no encontrado.");

        if (user.UserName.Equals(currentUserName, StringComparison.OrdinalIgnoreCase))
            return (false, "No puedes eliminar tu propia cuenta.");

        if (user.Rol == "Administrador" && user.Activo)
        {
            var otherActiveAdmins = await _context.Users.CountAsync(u => u.Rol == "Administrador" && u.Activo && u.Id != id);
            if (otherActiveAdmins == 0)
                return (false, "No se puede eliminar al último administrador activo del sistema.");
        }

        // Remover membresías actuales de áreas y desasignar como coordinador si aplica,
        // conservando íntegramente inventarios, operaciones, conteos y auditorías históricas.
        var asignaciones = await _context.AreaIntegrantes.Where(ai => ai.UsuarioId == id).ToListAsync();
        if (asignaciones.Count > 0)
            _context.AreaIntegrantes.RemoveRange(asignaciones);

        var areasCoordinadas = await _context.Areas.Where(a => a.CoordinadorId == id).ToListAsync();
        foreach (var area in areasCoordinadas)
            area.CoordinadorId = null;

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "ELIMINAR_USUARIO",
            Entidad = "User",
            EntidadId = user.Id.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Eliminación permanente de la cuenta '{user.UserName}' ({user.Nombre})"
        });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return (true, null);
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

    public async Task<List<RolPersonalizadoDto>> GetRolesAsync()
    {
        var roles = await _context.RolesPersonalizados.OrderBy(r => r.Nombre).ToListAsync();
        return roles.Select(r =>
        {
            List<string> mods;
            try
            {
                mods = System.Text.Json.JsonSerializer.Deserialize<List<string>>(r.ModulosPermitidosJson) ?? new();
            }
            catch
            {
                mods = new();
            }
            return new RolPersonalizadoDto(r.Id, r.Nombre, r.Descripcion, r.EsSistema, mods);
        }).ToList();
    }

    public async Task<RolPersonalizadoDto?> CreateRolAsync(CreateOrUpdateRolRequest request, string currentUserName)
    {
        if (await _context.RolesPersonalizados.AnyAsync(r => r.Nombre.ToLower() == request.Nombre.Trim().ToLower()))
        {
            return null;
        }

        var jsonMods = System.Text.Json.JsonSerializer.Serialize(request.ModulosPermitidos ?? new());
        var rol = new RolPersonalizado
        {
            Nombre = request.Nombre.Trim(),
            Descripcion = request.Descripcion.Trim(),
            EsSistema = false,
            ModulosPermitidosJson = jsonMods,
            FechaCreacion = DateTime.UtcNow
        };

        _context.RolesPersonalizados.Add(rol);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "CREAR_ROL",
            Entidad = "RolPersonalizado",
            EntidadId = rol.Nombre,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Creación de rol personalizado '{rol.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return new RolPersonalizadoDto(rol.Id, rol.Nombre, rol.Descripcion, rol.EsSistema, request.ModulosPermitidos ?? new());
    }

    public async Task<bool> UpdateRolAsync(int id, CreateOrUpdateRolRequest request, string currentUserName)
    {
        var rol = await _context.RolesPersonalizados.FindAsync(id);
        if (rol == null) return false;

        // Si es de sistema, no se permite cambiar el nombre para no romper roles base, pero sí sus módulos y descripción
        if (!rol.EsSistema)
        {
            rol.Nombre = request.Nombre.Trim();
        }
        rol.Descripcion = request.Descripcion.Trim();
        rol.ModulosPermitidosJson = System.Text.Json.JsonSerializer.Serialize(request.ModulosPermitidos ?? new());

        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "ACTUALIZAR_ROL",
            Entidad = "RolPersonalizado",
            EntidadId = rol.Nombre,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Actualización de permisos y módulos del rol '{rol.Nombre}'"
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRolAsync(int id, string currentUserName)
    {
        var rol = await _context.RolesPersonalizados.FindAsync(id);
        if (rol == null || rol.EsSistema) return false;

        // No borrar si hay usuarios asignados a este rol
        if (await _context.Users.AnyAsync(u => u.Rol == rol.Nombre))
        {
            return false;
        }

        _context.RolesPersonalizados.Remove(rol);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = currentUserName,
            Accion = "ELIMINAR_ROL",
            Entidad = "RolPersonalizado",
            EntidadId = rol.Nombre,
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Eliminación del rol '{rol.Nombre}'"
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

    public async Task<bool> HasPermissionAsync(string userName, string modulo)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName.ToLower() == userName.ToLower() && u.Activo);
        if (user == null) return false;
        if (user.Rol == "Administrador") return true;

        var rol = await _context.RolesPersonalizados.FirstOrDefaultAsync(r => r.Nombre == user.Rol);
        if (rol != null)
        {
            try
            {
                var modulos = System.Text.Json.JsonSerializer.Deserialize<List<string>>(rol.ModulosPermitidosJson) ?? new();
                return modulos.Contains(modulo, StringComparer.OrdinalIgnoreCase);
            }
            catch { }
        }

        if (user.Rol == "Tesorero" && (modulo == "entradas" || modulo == "operaciones" || modulo == "conteo" || modulo == "ventas"))
        {
            return true;
        }

        return false;
    }
}
