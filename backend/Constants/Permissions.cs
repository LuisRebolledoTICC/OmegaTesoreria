namespace OmegaTesoreria.Api.Constants;

/// <summary>
/// Constantes de cadenas de permisos usados en el sistema.
/// Los permisos se almacenan en ModulosPermitidosJson de RolPersonalizado.
/// </summary>
public static class Permissions
{
    // ── Inicio ─────────────────────────────────────────────────────────────────
    public const string Inicio = "inicio";

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

    // ── Deudas: permisos ───────────────────────────────────────────────────────
    public const string DeudasConsultarPropias = "deudas_consultar_propias";
    public const string DeudasConsultarTodos = "deudas_consultar_todos";
    public const string DeudasConsultarDetalle = "deudas_consultar_detalle";
    public const string DeudasActividadesCrear = "deudas_actividades_crear";
    public const string DeudasActividadesEditar = "deudas_actividades_editar";
    public const string DeudasActividadesAsignar = "deudas_actividades_asignar";
    public const string DeudasPagosRegistrar = "deudas_pagos_registrar";
    public const string DeudasPagosRevertir = "deudas_pagos_revertir";
    public const string DeudasPagosHistorial = "deudas_pagos_historial";
    public const string DeudasMovimientosBancarios = "deudas_movimientos_bancarios";

    // ── Deudas: ajustes sin afectar cajas ───────────────────────────────────────
    public const string DeudasAjustesSaldoPrevio = "deudas_ajustes_saldo_previo";
    public const string DeudasAjustesPerdonar = "deudas_ajustes_perdonar";
    public const string DeudasAjustesCorregir = "deudas_ajustes_corregir";
    public const string DeudasAjustesRevertir = "deudas_ajustes_revertir";

    // ── Eventos: permisos ──────────────────────────────────────────────────────
    public const string EventosConsultar = "eventos_consultar";
    public const string EventosCrear = "eventos_crear";
    public const string EventosEditar = "eventos_editar";
    public const string EventosCancelar = "eventos_cancelar";
    public const string EventosEliminar = "eventos_eliminar";
}
