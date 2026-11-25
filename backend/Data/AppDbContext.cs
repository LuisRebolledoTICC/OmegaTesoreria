using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Data;

public class AppDbContext : DbContext, IDataProtectionKeyContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Caja> Cajas => Set<Caja>();
    public DbSet<Denominacion> Denominaciones => Set<Denominacion>();
    public DbSet<TipoBolsa> TiposBolsas => Set<TipoBolsa>();
    public DbSet<CajaEfectivo> CajasEfectivo => Set<CajaEfectivo>();
    public DbSet<Operacion> Operaciones => Set<Operacion>();
    public DbSet<DetalleOperacion> DetalleOperaciones => Set<DetalleOperacion>();
    public DbSet<Conteo> Conteos => Set<Conteo>();
    public DbSet<Auditoria> Auditoria => Set<Auditoria>();
    public DbSet<RolPersonalizado> RolesPersonalizados => Set<RolPersonalizado>();
    public DbSet<UsuarioRol> UsuarioRoles => Set<UsuarioRol>();

    // Módulo Ventas
    public DbSet<Venta> Ventas => Set<Venta>();
    public DbSet<VentaProducto> VentaProductos => Set<VentaProducto>();
    public DbSet<VentaPresentacion> VentaPresentaciones => Set<VentaPresentacion>();
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<PedidoDetalle> PedidoDetalles => Set<PedidoDetalle>();
    public DbSet<PedidoPago> PedidoPagos => Set<PedidoPago>();

    // Módulo Áreas e Inventarios
    public DbSet<Area> Areas => Set<Area>();
    public DbSet<AreaIntegrante> AreaIntegrantes => Set<AreaIntegrante>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Inventario> Inventarios => Set<Inventario>();
    public DbSet<InventarioDetalle> InventarioDetalles => Set<InventarioDetalle>();

    // Módulo Presupuestos por Área
    public DbSet<PresupuestoArea> PresupuestosArea => Set<PresupuestoArea>();
    public DbSet<MovimientoPresupuesto> MovimientosPresupuesto => Set<MovimientoPresupuesto>();
    public DbSet<PresupuestoEvidencia> PresupuestoEvidencias => Set<PresupuestoEvidencia>();
    public DbSet<PresupuestoMovimientoHistorial> PresupuestoMovimientosHistorial => Set<PresupuestoMovimientoHistorial>();

    // Persistencia de claves criptográficas de ASP.NET Core Data Protection
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        bool isSqlite = Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true;

        if (isSqlite)
        {
            // En SQLite usamos conversión a double debido a limitaciones históricas del motor de SQLite con decimales
            modelBuilder.Entity<Caja>().Property(c => c.SaldoActual).HasConversion<double>();
            modelBuilder.Entity<Denominacion>().Property(d => d.Valor).HasConversion<double>();
            modelBuilder.Entity<TipoBolsa>().Property(b => b.ValorUnitario).HasConversion<double>();
            modelBuilder.Entity<Operacion>().Property(o => o.Importe).HasConversion<double>();
            modelBuilder.Entity<DetalleOperacion>().Property(d => d.ValorUnitarioHistorico).HasConversion<double>();
            modelBuilder.Entity<DetalleOperacion>().Property(d => d.Subtotal).HasConversion<double>();
            modelBuilder.Entity<Conteo>().Property(c => c.SaldoEsperado).HasConversion<double>();
            modelBuilder.Entity<Conteo>().Property(c => c.SaldoContado).HasConversion<double>();
            modelBuilder.Entity<Conteo>().Property(c => c.Diferencia).HasConversion<double>();
            modelBuilder.Entity<Conteo>().Property(c => c.TotalMonedas).HasConversion<double>();
            modelBuilder.Entity<Conteo>().Property(c => c.TotalBilletes).HasConversion<double>();
            modelBuilder.Entity<Conteo>().Property(c => c.TotalBolsas).HasConversion<double>();

            // Ventas en SQLite
            modelBuilder.Entity<Venta>().Property(v => v.TotalEfectivoIngresado).HasConversion<double>();
            modelBuilder.Entity<Venta>().Property(v => v.TotalTransferenciaIngresado).HasConversion<double>();
            modelBuilder.Entity<VentaPresentacion>().Property(p => p.Precio).HasConversion<double>();
            modelBuilder.Entity<Pedido>().Property(p => p.TotalPedido).HasConversion<double>();
            modelBuilder.Entity<PedidoDetalle>().Property(d => d.PrecioUnitario).HasConversion<double>();
            modelBuilder.Entity<PedidoDetalle>().Property(d => d.Subtotal).HasConversion<double>();
            modelBuilder.Entity<PedidoPago>().Property(p => p.Importe).HasConversion<double>();

            // Inventarios en SQLite
            modelBuilder.Entity<Producto>().Property(p => p.CantidadActual).HasConversion<double>();
            modelBuilder.Entity<InventarioDetalle>().Property(d => d.Cantidad).HasConversion<double>();

            // Presupuestos en SQLite
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.SaldoDisponible).HasConversion<double>();
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalRecibido).HasConversion<double>();
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalGastado).HasConversion<double>();
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalDevuelto).HasConversion<double>();
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalAjustes).HasConversion<double>();
            modelBuilder.Entity<MovimientoPresupuesto>().Property(m => m.Importe).HasConversion<double>();
        }
        else
        {
            // En PostgreSQL usamos precisión numérica financiera nativa decimal(18,2)
            modelBuilder.Entity<Caja>().Property(c => c.SaldoActual).HasPrecision(18, 2);
            modelBuilder.Entity<Denominacion>().Property(d => d.Valor).HasPrecision(18, 2);
            modelBuilder.Entity<TipoBolsa>().Property(b => b.ValorUnitario).HasPrecision(18, 2);
            modelBuilder.Entity<Operacion>().Property(o => o.Importe).HasPrecision(18, 2);
            modelBuilder.Entity<DetalleOperacion>().Property(d => d.ValorUnitarioHistorico).HasPrecision(18, 2);
            modelBuilder.Entity<DetalleOperacion>().Property(d => d.Subtotal).HasPrecision(18, 2);
            modelBuilder.Entity<Conteo>().Property(c => c.SaldoEsperado).HasPrecision(18, 2);
            modelBuilder.Entity<Conteo>().Property(c => c.SaldoContado).HasPrecision(18, 2);
            modelBuilder.Entity<Conteo>().Property(c => c.Diferencia).HasPrecision(18, 2);
            modelBuilder.Entity<Conteo>().Property(c => c.TotalMonedas).HasPrecision(18, 2);
            modelBuilder.Entity<Conteo>().Property(c => c.TotalBilletes).HasPrecision(18, 2);
            modelBuilder.Entity<Conteo>().Property(c => c.TotalBolsas).HasPrecision(18, 2);

            // Ventas en PostgreSQL
            modelBuilder.Entity<Venta>().Property(v => v.TotalEfectivoIngresado).HasPrecision(18, 2);
            modelBuilder.Entity<Venta>().Property(v => v.TotalTransferenciaIngresado).HasPrecision(18, 2);
            modelBuilder.Entity<VentaPresentacion>().Property(p => p.Precio).HasPrecision(18, 2);
            modelBuilder.Entity<Pedido>().Property(p => p.TotalPedido).HasPrecision(18, 2);
            modelBuilder.Entity<PedidoDetalle>().Property(d => d.PrecioUnitario).HasPrecision(18, 2);
            modelBuilder.Entity<PedidoDetalle>().Property(d => d.Subtotal).HasPrecision(18, 2);
            modelBuilder.Entity<PedidoPago>().Property(p => p.Importe).HasPrecision(18, 2);

            // Inventarios en PostgreSQL
            modelBuilder.Entity<Producto>().Property(p => p.CantidadActual).HasPrecision(18, 4);
            modelBuilder.Entity<InventarioDetalle>().Property(d => d.Cantidad).HasPrecision(18, 4);

            // Presupuestos en PostgreSQL
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.SaldoDisponible).HasPrecision(18, 2);
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalRecibido).HasPrecision(18, 2);
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalGastado).HasPrecision(18, 2);
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalDevuelto).HasPrecision(18, 2);
            modelBuilder.Entity<PresupuestoArea>().Property(p => p.TotalAjustes).HasPrecision(18, 2);
            modelBuilder.Entity<MovimientoPresupuesto>().Property(m => m.Importe).HasPrecision(18, 2);
        }

        // Relaciones
        modelBuilder.Entity<Venta>()
            .HasMany(v => v.Productos)
            .WithOne(p => p.Venta)
            .HasForeignKey(p => p.VentaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Venta>()
            .HasMany(v => v.Pedidos)
            .WithOne(p => p.Venta)
            .HasForeignKey(p => p.VentaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<VentaProducto>()
            .HasMany(p => p.Presentaciones)
            .WithOne(pr => pr.VentaProducto)
            .HasForeignKey(pr => pr.VentaProductoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Pedido>()
            .HasMany(p => p.Detalles)
            .WithOne(d => d.Pedido)
            .HasForeignKey(d => d.PedidoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Pedido>()
            .HasMany(p => p.Pagos)
            .WithOne(pg => pg.Pedido)
            .HasForeignKey(pg => pg.PedidoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Operacion>()
            .HasOne(o => o.CajaOrigen)
            .WithMany()
            .HasForeignKey(o => o.CajaOrigenId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Operacion>()
            .HasOne(o => o.CajaDestino)
            .WithMany()
            .HasForeignKey(o => o.CajaDestinoId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Operacion>()
            .HasMany(o => o.Detalles)
            .WithOne(d => d.Operacion)
            .HasForeignKey(d => d.OperacionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Caja>()
            .HasMany(c => c.EfectivoDisponible)
            .WithOne(e => e.Caja)
            .HasForeignKey(e => e.CajaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Conteo>()
            .HasOne(c => c.Caja)
            .WithMany()
            .HasForeignKey(c => c.CajaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TipoBolsa>()
            .HasOne(b => b.Caja)
            .WithMany()
            .HasForeignKey(b => b.CajaId)
            .OnDelete(DeleteBehavior.Cascade);

        // ========== Relaciones Áreas e Inventarios ==========

        // Area -> Coordinador
        modelBuilder.Entity<Area>()
            .HasOne(a => a.Coordinador)
            .WithMany()
            .HasForeignKey(a => a.CoordinadorId)
            .OnDelete(DeleteBehavior.SetNull);

        // Area -> Integrantes
        modelBuilder.Entity<Area>()
            .HasMany(a => a.Integrantes)
            .WithOne(i => i.Area)
            .HasForeignKey(i => i.AreaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AreaIntegrante>()
            .HasOne(i => i.Usuario)
            .WithMany()
            .HasForeignKey(i => i.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        // Un usuario solo puede pertenecer a un área a la vez
        modelBuilder.Entity<AreaIntegrante>()
            .HasIndex(i => i.UsuarioId)
            .IsUnique();

        // Area -> Productos
        modelBuilder.Entity<Area>()
            .HasMany(a => a.Productos)
            .WithOne(p => p.Area)
            .HasForeignKey(p => p.AreaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Area -> Inventarios
        modelBuilder.Entity<Area>()
            .HasMany(a => a.Inventarios)
            .WithOne(i => i.Area)
            .HasForeignKey(i => i.AreaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Inventario -> Detalles
        modelBuilder.Entity<Inventario>()
            .HasMany(i => i.Detalles)
            .WithOne(d => d.Inventario)
            .HasForeignKey(d => d.InventarioId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InventarioDetalle>()
            .HasOne(d => d.Producto)
            .WithMany()
            .HasForeignKey(d => d.ProductoId)
            .OnDelete(DeleteBehavior.SetNull);

        // Índice único para nombre de producto por área
        modelBuilder.Entity<Producto>()
            .HasIndex(p => new { p.AreaId, p.Nombre })
            .IsUnique();

        // Índices para rendimiento en PostgreSQL
        modelBuilder.Entity<User>().HasIndex(u => u.UserName).IsUnique();

        modelBuilder.Entity<UsuarioRol>()
            .HasOne(ur => ur.Usuario)
            .WithMany(u => u.UsuarioRoles)
            .HasForeignKey(ur => ur.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UsuarioRol>()
            .HasOne(ur => ur.RolPersonalizado)
            .WithMany(r => r.UsuarioRoles)
            .HasForeignKey(ur => ur.RolPersonalizadoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UsuarioRol>()
            .HasIndex(ur => new { ur.UsuarioId, ur.RolPersonalizadoId })
            .IsUnique();
        modelBuilder.Entity<Operacion>().HasIndex(o => o.FechaOperacion);
        modelBuilder.Entity<Operacion>().HasIndex(o => o.TipoOperacion);
        modelBuilder.Entity<Conteo>().HasIndex(c => c.FechaConteo);
        modelBuilder.Entity<Auditoria>().HasIndex(a => a.FechaHora);
        modelBuilder.Entity<Area>().HasIndex(a => a.Nombre).IsUnique();
        modelBuilder.Entity<Inventario>().HasIndex(i => i.FechaInventario);

        // ========== Relaciones Presupuestos por Área ==========
        modelBuilder.Entity<PresupuestoArea>()
            .HasOne(p => p.Area)
            .WithMany()
            .HasForeignKey(p => p.AreaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PresupuestoArea>()
            .HasIndex(p => p.AreaId)
            .IsUnique();

        modelBuilder.Entity<PresupuestoArea>()
            .HasMany(p => p.Movimientos)
            .WithOne(m => m.PresupuestoArea)
            .HasForeignKey(m => m.PresupuestoAreaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MovimientoPresupuesto>()
            .HasOne(m => m.Area)
            .WithMany()
            .HasForeignKey(m => m.AreaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MovimientoPresupuesto>()
            .HasOne(m => m.Caja)
            .WithMany()
            .HasForeignKey(m => m.CajaId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MovimientoPresupuesto>()
            .HasOne(m => m.OperacionTesoreria)
            .WithMany()
            .HasForeignKey(m => m.OperacionTesoreriaId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MovimientoPresupuesto>()
            .HasMany(m => m.Evidencias)
            .WithOne(e => e.MovimientoPresupuesto)
            .HasForeignKey(e => e.MovimientoPresupuestoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MovimientoPresupuesto>()
            .HasMany(m => m.HistorialModificaciones)
            .WithOne(h => h.MovimientoPresupuesto)
            .HasForeignKey(h => h.MovimientoPresupuestoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MovimientoPresupuesto>().HasIndex(m => m.FechaMovimiento);
        modelBuilder.Entity<MovimientoPresupuesto>().HasIndex(m => m.TipoMovimiento);
        modelBuilder.Entity<MovimientoPresupuesto>().HasIndex(m => m.Estado);
    }
}
