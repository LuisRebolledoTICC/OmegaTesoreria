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
        }

        // Relaciones
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

        // Índices para rendimiento en PostgreSQL
        modelBuilder.Entity<User>().HasIndex(u => u.UserName).IsUnique();
        modelBuilder.Entity<Operacion>().HasIndex(o => o.FechaOperacion);
        modelBuilder.Entity<Operacion>().HasIndex(o => o.TipoOperacion);
        modelBuilder.Entity<Conteo>().HasIndex(c => c.FechaConteo);
        modelBuilder.Entity<Auditoria>().HasIndex(a => a.FechaHora);
    }
}
