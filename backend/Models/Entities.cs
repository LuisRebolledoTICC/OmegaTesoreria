namespace OmegaTesoreria.Api.Models;

public class User
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = "Consulta"; // Administrador, Tesorero, Consulta
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime? UltimoAcceso { get; set; }
}

public class Caja
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Finalidad { get; set; } = string.Empty;
    public string Tipo { get; set; } = "EFECTIVO"; // EFECTIVO, TRANSFERENCIAS
    public bool Activa { get; set; } = true;
    public decimal SaldoActual { get; set; } = 0.00m;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public string CreadoPor { get; set; } = string.Empty;
    public DateTime? UltimoConteoFecha { get; set; }
    public string EstadoVerificacion { get; set; } = "Verificado"; // Verificado, Pendiente, Diferencia

    public ICollection<CajaEfectivo> EfectivoDisponible { get; set; } = new List<CajaEfectivo>();
}

public class Denominacion
{
    public int Id { get; set; }
    public string Tipo { get; set; } = "Moneda"; // Moneda, Billete
    public decimal Valor { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activa { get; set; } = true;
    public int OrdenVisualizacion { get; set; }
}

public class TipoBolsa
{
    public int Id { get; set; }
    public int? CajaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public int? DenominacionAsociadaId { get; set; }
    public decimal ValorUnitario { get; set; }
    public bool Activa { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Caja? Caja { get; set; }
    public Denominacion? DenominacionAsociada { get; set; }
}

public class CajaEfectivo
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string TipoEfectivo { get; set; } = "Moneda"; // Moneda, Billete, Bolsa
    public int? DenominacionId { get; set; }
    public int? TipoBolsaId { get; set; }
    public int Cantidad { get; set; } = 0;

    public Caja? Caja { get; set; }
    public Denominacion? Denominacion { get; set; }
    public TipoBolsa? TipoBolsa { get; set; }
}

public class Operacion
{
    public int Id { get; set; }
    public string TipoOperacion { get; set; } = string.Empty; // CONTEO, ENTRADA, SALIDA, TRANSFERENCIA, AJUSTE, REVERSA
    public int? CajaOrigenId { get; set; }
    public int? CajaDestinoId { get; set; }
    public DateTime FechaOperacion { get; set; } = DateTime.UtcNow;
    public decimal Importe { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Estado { get; set; } = "CONFIRMADA"; // CONFIRMADA, ANULADA
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public int? OperacionRelacionadaId { get; set; }
    public string? Observaciones { get; set; }

    public Caja? CajaOrigen { get; set; }
    public Caja? CajaDestino { get; set; }
    public ICollection<DetalleOperacion> Detalles { get; set; } = new List<DetalleOperacion>();
}

public class DetalleOperacion
{
    public int Id { get; set; }
    public int OperacionId { get; set; }
    public string TipoEfectivo { get; set; } = "Moneda"; // Moneda, Billete, Bolsa
    public int? DenominacionId { get; set; }
    public int? TipoBolsaId { get; set; }
    public decimal ValorUnitarioHistorico { get; set; }
    public int Cantidad { get; set; }
    public decimal Subtotal { get; set; }

    public Operacion? Operacion { get; set; }
    public Denominacion? Denominacion { get; set; }
    public TipoBolsa? TipoBolsa { get; set; }
}

public class Conteo
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string CajaNombre { get; set; } = string.Empty;
    public DateTime FechaConteo { get; set; } = DateTime.UtcNow;
    public decimal SaldoEsperado { get; set; }
    public decimal SaldoContado { get; set; }
    public decimal Diferencia { get; set; }
    public string Estado { get; set; } = "VERIFICADO"; // VERIFICADO, CON_DIFERENCIA, AJUSTADO
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? Observaciones { get; set; }
    public decimal TotalMonedas { get; set; }
    public decimal TotalBilletes { get; set; }
    public decimal TotalBolsas { get; set; }
    public string DesgloseJson { get; set; } = "{}";

    public Caja? Caja { get; set; }
}

public class Auditoria
{
    public int Id { get; set; }
    public int? UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public string EntidadId { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public string Descripcion { get; set; } = string.Empty;
}
