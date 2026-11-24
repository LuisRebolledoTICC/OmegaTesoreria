using System.Data;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        bool isSqlite = context.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true;

        if (isSqlite)
        {
            // Para SQLite local
            await context.Database.EnsureCreatedAsync();
            await AddColumnIfNotExistsAsync(context, "TiposBolsas", "CajaId", "INTEGER NULL REFERENCES Cajas(Id)");
            await AddColumnIfNotExistsAsync(context, "Cajas", "Tipo", "TEXT NOT NULL DEFAULT 'EFECTIVO'");
        }
        else
        {
            // Para PostgreSQL en producción (Neon), aplicar migraciones formales de EF Core
            await context.Database.MigrateAsync();
        }

        // Si no existe ninguna caja de transferencias, crearla automáticamente
        if (!await context.Cajas.AnyAsync(c => c.Tipo == "TRANSFERENCIAS"))
        {
            var cajaTransferencias = new Caja
            {
                Nombre = "Cuenta Bancaria / Transferencias",
                Descripcion = "Caja digital para transferencias bancarias, ofrendas electrónicas y pagos directos.",
                Finalidad = "Transferencias electrónicas y movimientos bancarios",
                Tipo = "TRANSFERENCIAS",
                Activa = true,
                SaldoActual = 0.00m,
                CreadoPor = "admin",
                FechaCreacion = DateTime.UtcNow,
                EstadoVerificacion = "Verificado"
            };
            context.Cajas.Add(cajaTransferencias);
            await context.SaveChangesAsync();
        }

        // 1. Seed Denominaciones
        if (!await context.Denominaciones.AnyAsync())
        {
            var denominaciones = new List<Denominacion>
            {
                new() { Tipo = "Moneda", Valor = 0.50m, Nombre = "Moneda de $0.50", Activa = true, OrdenVisualizacion = 1 },
                new() { Tipo = "Moneda", Valor = 1.00m, Nombre = "Moneda de $1.00", Activa = true, OrdenVisualizacion = 2 },
                new() { Tipo = "Moneda", Valor = 2.00m, Nombre = "Moneda de $2.00", Activa = true, OrdenVisualizacion = 3 },
                new() { Tipo = "Moneda", Valor = 5.00m, Nombre = "Moneda de $5.00", Activa = true, OrdenVisualizacion = 4 },
                new() { Tipo = "Moneda", Valor = 10.00m, Nombre = "Moneda de $10.00", Activa = true, OrdenVisualizacion = 5 },
                new() { Tipo = "Moneda", Valor = 20.00m, Nombre = "Moneda de $20.00", Activa = true, OrdenVisualizacion = 6 },

                new() { Tipo = "Billete", Valor = 20.00m, Nombre = "Billete de $20.00", Activa = true, OrdenVisualizacion = 7 },
                new() { Tipo = "Billete", Valor = 50.00m, Nombre = "Billete de $50.00", Activa = true, OrdenVisualizacion = 8 },
                new() { Tipo = "Billete", Valor = 100.00m, Nombre = "Billete de $100.00", Activa = true, OrdenVisualizacion = 9 },
                new() { Tipo = "Billete", Valor = 200.00m, Nombre = "Billete de $200.00", Activa = true, OrdenVisualizacion = 10 },
                new() { Tipo = "Billete", Valor = 500.00m, Nombre = "Billete de $500.00", Activa = true, OrdenVisualizacion = 11 },
                new() { Tipo = "Billete", Valor = 1000.00m, Nombre = "Billete de $1,000.00", Activa = true, OrdenVisualizacion = 12 }
            };

            await context.Denominaciones.AddRangeAsync(denominaciones);
            await context.SaveChangesAsync();
        }

        // 2. Seed Tipos de Bolsas
        if (!await context.TiposBolsas.AnyAsync())
        {
            var den5 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Tipo == "Moneda" && d.Valor == 5.00m);
            var den10 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Tipo == "Moneda" && d.Valor == 10.00m);
            var den2 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Tipo == "Moneda" && d.Valor == 2.00m);

            var bolsas = new List<TipoBolsa>
            {
                new() { Nombre = "Bolsa $500 (Monedas $10)", Descripcion = "50 monedas de $10", DenominacionAsociadaId = den10?.Id, ValorUnitario = 500.00m, Activa = true },
                new() { Nombre = "Bolsa $200 (Monedas $5)", Descripcion = "40 monedas de $5", DenominacionAsociadaId = den5?.Id, ValorUnitario = 200.00m, Activa = true },
                new() { Nombre = "Bolsa $100 (Monedas $2)", Descripcion = "50 monedas de $2", DenominacionAsociadaId = den2?.Id, ValorUnitario = 100.00m, Activa = true }
            };

            await context.TiposBolsas.AddRangeAsync(bolsas);
            await context.SaveChangesAsync();
        }

        // 3. Seed Usuarios (Idempotente)
        if (!await context.Users.AnyAsync())
        {
            var users = new List<User>
            {
                new()
                {
                    UserName = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    Nombre = "Administrador del Sistema",
                    Rol = "Administrador",
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                },
                new()
                {
                    UserName = "tesorero",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Tesorero123!"),
                    Nombre = "Tesorero General",
                    Rol = "Tesorero",
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                },
                new()
                {
                    UserName = "consulta",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Consulta123!"),
                    Nombre = "Auditor de Consulta",
                    Rol = "Consulta",
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                }
            };

            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();
        }

        // 4. Seed Cajas Iniciales
        if (!await context.Cajas.AnyAsync(c => c.Tipo == "EFECTIVO"))
        {
            var cajas = new List<Caja>
            {
                new()
                {
                    Nombre = "Caja Principal",
                    Descripcion = "Caja fuerte central de tesorería para custodia de fondos generales.",
                    Finalidad = "Custodia principal y concentración de ingresos",
                    Tipo = "EFECTIVO",
                    Activa = true,
                    SaldoActual = 5000.00m,
                    CreadoPor = "admin",
                    FechaCreacion = DateTime.UtcNow,
                    EstadoVerificacion = "Verificado"
                },
                new()
                {
                    Nombre = "Caja Chica / Operaciones",
                    Descripcion = "Fondo rotatorio para gastos menores diarios y pagos inmediatos.",
                    Finalidad = "Gastos menores y suministros de oficina",
                    Tipo = "EFECTIVO",
                    Activa = true,
                    SaldoActual = 1500.00m,
                    CreadoPor = "admin",
                    FechaCreacion = DateTime.UtcNow,
                    EstadoVerificacion = "Verificado"
                },
                new()
                {
                    Nombre = "Caja de Ofrendas",
                    Descripcion = "Caja receptora de ofrendas y colectas de servicios dominicales.",
                    Finalidad = "Recepción exclusiva de donativos y ofrendas",
                    Tipo = "EFECTIVO",
                    Activa = true,
                    SaldoActual = 2500.00m,
                    CreadoPor = "admin",
                    FechaCreacion = DateTime.UtcNow,
                    EstadoVerificacion = "Verificado"
                },
                new()
                {
                    Nombre = "Caja Fondo de Emergencia",
                    Descripcion = "Reserva especial para imprevistos mayores o proyectos especiales.",
                    Finalidad = "Reserva financiera institucional",
                    Tipo = "EFECTIVO",
                    Activa = true,
                    SaldoActual = 1000.00m,
                    CreadoPor = "admin",
                    FechaCreacion = DateTime.UtcNow,
                    EstadoVerificacion = "Verificado"
                }
            };

            await context.Cajas.AddRangeAsync(cajas);
            await context.SaveChangesAsync();

            // Desglose de efectivo inicial para Caja Principal ($5,000 = 6x500 + 8x200 + 4x100)
            var b500 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Valor == 500 && d.Tipo == "Billete");
            var b200 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Valor == 200 && d.Tipo == "Billete");
            var b100 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Valor == 100 && d.Tipo == "Billete");
            var b50 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Valor == 50 && d.Tipo == "Billete");
            var m10 = await context.Denominaciones.FirstOrDefaultAsync(d => d.Valor == 10 && d.Tipo == "Moneda");

            var cajaPrin = cajas[0];
            var cajaOp = cajas[1];

            if (b500 != null && b200 != null && b100 != null)
            {
                context.CajasEfectivo.AddRange(
                    new CajaEfectivo { CajaId = cajaPrin.Id, TipoEfectivo = "Billete", DenominacionId = b500.Id, Cantidad = 6 }, // 3000
                    new CajaEfectivo { CajaId = cajaPrin.Id, TipoEfectivo = "Billete", DenominacionId = b200.Id, Cantidad = 8 }, // 1600
                    new CajaEfectivo { CajaId = cajaPrin.Id, TipoEfectivo = "Billete", DenominacionId = b100.Id, Cantidad = 4 }  // 400 => total 5000
                );
            }

            if (b200 != null && b100 != null && b50 != null && m10 != null)
            {
                context.CajasEfectivo.AddRange(
                    new CajaEfectivo { CajaId = cajaOp.Id, TipoEfectivo = "Billete", DenominacionId = b200.Id, Cantidad = 5 }, // 1000
                    new CajaEfectivo { CajaId = cajaOp.Id, TipoEfectivo = "Billete", DenominacionId = b100.Id, Cantidad = 3 }, // 300
                    new CajaEfectivo { CajaId = cajaOp.Id, TipoEfectivo = "Billete", DenominacionId = b50.Id, Cantidad = 2 },  // 100
                    new CajaEfectivo { CajaId = cajaOp.Id, TipoEfectivo = "Moneda", DenominacionId = m10.Id, Cantidad = 10 }   // 100 => total 1500
                );
            }

            // Registrar operaciones iniciales de apertura en Auditoria
            context.Auditoria.Add(new Auditoria
            {
                UsuarioId = 1,
                UsuarioNombre = "admin",
                Accion = "INICIALIZACION",
                Entidad = "Sistema",
                EntidadId = "0",
                FechaHora = DateTime.UtcNow,
                Descripcion = "Inicialización del sistema con 4 cajas y patrimonio total de $10,000.00 MXN"
            });

            await context.SaveChangesAsync();
        }
    }

    private static async Task AddColumnIfNotExistsAsync(AppDbContext context, string tableName, string columnName, string columnDefinition)
    {
        try
        {
            var connection = context.Database.GetDbConnection();
            bool wasClosed = connection.State == ConnectionState.Closed;
            if (wasClosed)
            {
                await connection.OpenAsync();
            }

            bool columnExists = false;
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = $"PRAGMA table_info({tableName});";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    if (string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
                    {
                        columnExists = true;
                        break;
                    }
                }
            }

            if (!columnExists)
            {
                using var alterCmd = connection.CreateCommand();
                alterCmd.CommandText = $"ALTER TABLE {tableName} ADD COLUMN {columnName} {columnDefinition};";
                await alterCmd.ExecuteNonQueryAsync();
            }

            if (wasClosed)
            {
                await connection.CloseAsync();
            }
        }
        catch
        {
            // Salvaguarda
        }
    }
}
