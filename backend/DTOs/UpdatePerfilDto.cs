using System.ComponentModel.DataAnnotations;

namespace OmegaTesoreria.Api.DTOs;

public class UpdatePerfilDto
{
    // Fields for profile update. Password fields are optional.
    [Required]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    public string UserName { get; set; } = string.Empty;

    // If the user wants to change the password, they must send the current password
    // and the new password (and confirmation). These fields are optional – if they are
    // null/empty the password will not be changed.
    public string? PasswordActual { get; set; }

    [MinLength(8)]
    public string? NuevaPassword { get; set; }
}
