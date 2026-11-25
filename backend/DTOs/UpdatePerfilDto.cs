using System.ComponentModel.DataAnnotations;

namespace OmegaTesoreria.Api.DTOs;

public class UpdatePerfilDto
{
    [Required]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    public string UserName { get; set; } = string.Empty;

    public string? PasswordActual { get; set; }

    public string? NuevaPassword { get; set; }
}
