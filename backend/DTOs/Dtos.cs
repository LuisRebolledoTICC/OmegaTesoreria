namespace OmegaTesoreria.Api.DTOs;

public record LoginRequest(string UserName, string Password);
public record LoginResponse(string Token, string UserName, string Nombre, string Rol);

public record UserDto(int Id, string UserName, string Nombre, string Rol, bool Activo, DateTime FechaCreacion, DateTime? UltimoAcceso);
public record CreateUserRequest(string UserName, string Password, string Nombre, string Rol);
public record UpdateUserRequest(string Nombre, string Rol, bool Activo, string? NewPassword);

public record CajaDto(
    int Id,
    string Nombre,
    string Descripcion,
    string Finalidad,
    bool Activa,
    decimal SaldoActual,
    DateTime FechaCreacion,
    string CreadoPor,
    DateTime? UltimoConteoFecha,
    string EstadoVerificacion,
    List<CajaEfectivoItemDto> DesgloseEfectivo,
    string Tipo = "EFECTIVO"
);

public record CajaEfectivoItemDto(
    int Id,
    string TipoEfectivo,
    int? DenominacionId,
    string? DenominacionNombre,
    decimal? ValorUnitario,
    int? TipoBolsaId,
    string? TipoBolsaNombre,
    int Cantidad,
    decimal Subtotal
);

public record CreateCajaRequest(string Nombre, string Descripcion, string Finalidad, decimal SaldoInicial, string? Tipo = "EFECTIVO");
public record UpdateCajaRequest(string Nombre, string Descripcion, string Finalidad, bool Activa, string? Tipo = "EFECTIVO");

public class ConteoItemDto
{
    public string TipoEfectivo { get; set; } = "Moneda";
    public int? DenominacionId { get; set; }
    public int? TipoBolsaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal ValorUnitario { get; set; }
    public int Cantidad { get; set; }
    public decimal Subtotal { get; set; }
}

public class SaveConteoRequest
{
    public int CajaId { get; set; }
    public List<ConteoItemDto> Items { get; set; } = new();
    public string? Observaciones { get; set; }
    public bool AplicarAjuste { get; set; } = false;
    public string? MotivoAjuste { get; set; }
    public string? TipoMovimientoDiferencia { get; set; } // "ENTRADA", "SALIDA", "AJUSTE"
    public string? ConceptoDiferencia { get; set; }
}

public class DetalleMovimientoInput
{
    public string TipoEfectivo { get; set; } = "Moneda";
    public int? DenominacionId { get; set; }
    public int? TipoBolsaId { get; set; }
    public int Cantidad { get; set; } = 0;
}

public class EntradaRequest
{
    public int CajaId { get; set; }
    public decimal Importe { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Observaciones { get; set; }
    public List<DetalleMovimientoInput>? Desglose { get; set; }
}

public class SalidaRequest
{
    public int CajaId { get; set; }
    public decimal Importe { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Observaciones { get; set; }
    public List<DetalleMovimientoInput>? Desglose { get; set; }
}

public class TransferenciaRequest
{
    public int CajaOrigenId { get; set; }
    public int CajaDestinoId { get; set; }
    public decimal Importe { get; set; }
    public string? Observaciones { get; set; }
    public List<DetalleMovimientoInput>? Desglose { get; set; }
}

public record OperacionDto(
    int Id,
    string TipoOperacion,
    int? CajaOrigenId,
    string? CajaOrigenNombre,
    int? CajaDestinoId,
    string? CajaDestinoNombre,
    DateTime FechaOperacion,
    decimal Importe,
    string Concepto,
    string Descripcion,
    string Estado,
    int UsuarioId,
    string UsuarioNombre,
    DateTime FechaRegistro,
    int? OperacionRelacionadaId,
    string? Observaciones,
    List<DetalleOperacionDto> Detalles
);

public record DetalleOperacionDto(
    int Id,
    string TipoEfectivo,
    int? DenominacionId,
    string? DenominacionNombre,
    int? TipoBolsaId,
    string? TipoBolsaNombre,
    decimal ValorUnitarioHistorico,
    int Cantidad,
    decimal Subtotal
);

public record DashboardSummaryDto(
    decimal SaldoTotal,
    int TotalCajas,
    int CajasActivas,
    decimal TotalEntradas,
    decimal TotalSalidas,
    decimal TotalTransferencias,
    DateTime? UltimoConteoGeneral,
    int CajasPendientesVerificacion,
    List<CajaDto> Cajas,
    List<OperacionDto> UltimasOperaciones,
    List<GraficaDistribucionItem> DistribucionCajas
);

public record GraficaDistribucionItem(string Nombre, decimal Saldo, decimal Porcentaje);

public class UpdateTipoBolsaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal ValorUnitario { get; set; }
    public int? DenominacionAsociadaId { get; set; }
    public int? CajaId { get; set; }
}

public class CreateTipoBolsaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal ValorUnitario { get; set; }
    public int? DenominacionAsociadaId { get; set; }
    public int? CajaId { get; set; }
}
