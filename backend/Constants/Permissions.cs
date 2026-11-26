namespace OmegaTesoreria.Api.Constants;

/// <summary>
/// Constantes de cadenas de permisos usados en el sistema.
/// Los permisos se almacenan en ModulosPermitidosJson de RolPersonalizado.
/// </summary>
public static class Permissions
{
    // ── Presupuestos: permisos de CONSULTA (solo lectura) ──────────────────────
    /// <summary>Permite consultar únicamente el saldo y movimientos del área propia.</summary>
    public const string PresupuestosConsultarMiArea = "presupuestos_consultar_mi_area";

    /// <summary>Permite consultar los saldos de TODAS las áreas (solo lectura).</summary>
    public const string PresupuestosConsultarTodos = "presupuestos_consultar_todos";

    // ── Presupuestos: permisos de ADMINISTRACIÓN ───────────────────────────────
    public const string PresupuestosAdministrar = "presupuestos_administrar";

    // ── Cajas: permisos ────────────────────────────────────────────────────────
    /// <summary>Permite editar movimientos existentes de caja y recalcular saldos.</summary>
    public const string CajasEditarMovimientos = "cajas_editar_movimientos";
}
