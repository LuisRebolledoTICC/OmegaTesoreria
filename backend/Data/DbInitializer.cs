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
            await EnsureSqliteAreasInventariosTablesAsync(context);
        }
        else
        {
            // Para PostgreSQL en producción (Neon), aplicar migraciones formales de EF Core
            await context.Database.MigrateAsync();
        }

        // 0. Seed Roles Personalizados Base (Administrador, Tesorero, Consulta)
        if (!await context.RolesPersonalizados.AnyAsync())
        {
            var rolesBase = new List<RolPersonalizado>
            {
                new()
                {
                    Nombre = "Administrador",
                    Descripcion = "Control total del sistema, administración de usuarios, roles, cajas, ventas, áreas, inventarios y auditoría.",
                    EsSistema = true,
                    ModulosPermitidosJson = "[\"dashboard\",\"cajas\",\"conteo\",\"operaciones\",\"ventas\",\"reportes\",\"usuarios\",\"entradas\",\"areas\",\"inventarios\",\"areas_crear\",\"areas_editar\",\"areas_desactivar\",\"areas_coordinador\",\"areas_integrantes\",\"inventarios_ver_todos\",\"inventarios_registrar\",\"inventarios_editar\",\"inventarios_fisico\",\"inventarios_historial\",\"inventarios_exportar\"]",
                    FechaCreacion = DateTime.UtcNow
                },
                new()
                {
                    Nombre = "Tesorero",
                    Descripcion = "Gestión de cajas, arqueos físicos de efectivo, entradas, salidas, ventas, áreas e inventarios.",
                    EsSistema = true,
                    ModulosPermitidosJson = "[\"dashboard\",\"cajas\",\"conteo\",\"operaciones\",\"ventas\",\"reportes\",\"entradas\",\"areas\",\"inventarios\",\"areas_integrantes\",\"inventarios_registrar\",\"inventarios_editar\",\"inventarios_fisico\",\"inventarios_historial\",\"inventarios_exportar\"]",
                    FechaCreacion = DateTime.UtcNow
                },
                new()
                {
                    Nombre = "Consulta",
                    Descripcion = "Solo lectura de dashboard, saldos de cajas, ventas, reportes de tesorería, áreas e inventarios.",
                    EsSistema = true,
                    ModulosPermitidosJson = "[\"dashboard\",\"cajas\",\"ventas\",\"reportes\",\"areas\",\"inventarios\",\"inventarios_historial\"]",
                    FechaCreacion = DateTime.UtcNow
                }
            };
            await context.RolesPersonalizados.AddRangeAsync(rolesBase);
            await context.SaveChangesAsync();
        }
        else
        {
            // Asegurar que los módulos nuevos estén habilitados en los roles base si no los tenían
            var roles = await context.RolesPersonalizados.ToListAsync();
            var adminExtras = new[] { "ventas", "entradas", "areas", "inventarios", "areas_crear", "areas_editar", "areas_desactivar", "areas_coordinador", "areas_integrantes", "inventarios_ver_todos", "inventarios_registrar", "inventarios_editar", "inventarios_fisico", "inventarios_historial", "inventarios_exportar" };
            var tesoreroExtras = new[] { "ventas", "entradas", "areas", "inventarios", "areas_integrantes", "inventarios_registrar", "inventarios_editar", "inventarios_fisico", "inventarios_historial", "inventarios_exportar" };
            var consultaExtras = new[] { "ventas", "areas", "inventarios", "inventarios_historial" };

            foreach (var r in roles)
            {
                try
                {
                    var mods = System.Text.Json.JsonSerializer.Deserialize<List<string>>(r.ModulosPermitidosJson) ?? new();
                    bool modified = false;
                    string[] extras;
                    if (r.Nombre == "Administrador") extras = adminExtras;
                    else if (r.Nombre == "Tesorero") extras = tesoreroExtras;
                    else if (r.Nombre == "Consulta") extras = consultaExtras;
                    else continue;

                    foreach (var mod in extras)
                    {
                        if (!mods.Contains(mod))
                        {
                            mods.Add(mod);
                            modified = true;
                        }
                    }
                    if (modified)
                    {
                        r.ModulosPermitidosJson = System.Text.Json.JsonSerializer.Serialize(mods);
                    }
                }
                catch { }
            }
            await context.SaveChangesAsync();
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
                    SaldoActual = 0.00m,
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
                    SaldoActual = 0.00m,
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
                    SaldoActual = 0.00m,
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
                    SaldoActual = 0.00m,
                    CreadoPor = "admin",
                    FechaCreacion = DateTime.UtcNow,
                    EstadoVerificacion = "Verificado"
                }
            };

            await context.Cajas.AddRangeAsync(cajas);
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

    private static async Task EnsureSqliteAreasInventariosTablesAsync(AppDbContext context)
    {
        var statements = new[]
        {
            @"CREATE TABLE IF NOT EXISTS Areas (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Nombre TEXT NOT NULL,
                Descripcion TEXT NULL,
                Activa INTEGER NOT NULL DEFAULT 1,
                CoordinadorId INTEGER NULL REFERENCES Users(Id) ON DELETE SET NULL,
                FechaCreacion TEXT NOT NULL
            );",
            @"CREATE UNIQUE INDEX IF NOT EXISTS IX_Areas_Nombre ON Areas(Nombre);",
            @"CREATE TABLE IF NOT EXISTS AreaIntegrantes (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AreaId INTEGER NOT NULL REFERENCES Areas(Id) ON DELETE CASCADE,
                UsuarioId INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
                FechaAsignacion TEXT NOT NULL
            );",
            @"CREATE UNIQUE INDEX IF NOT EXISTS IX_AreaIntegrantes_UsuarioId ON AreaIntegrantes(UsuarioId);",
            @"CREATE TABLE IF NOT EXISTS Productos (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AreaId INTEGER NOT NULL REFERENCES Areas(Id) ON DELETE CASCADE,
                Nombre TEXT NOT NULL,
                UnidadMedida TEXT NOT NULL,
                CantidadActual REAL NOT NULL DEFAULT 0,
                Activo INTEGER NOT NULL DEFAULT 1,
                FechaCreacion TEXT NOT NULL
            );",
            @"CREATE UNIQUE INDEX IF NOT EXISTS IX_Productos_AreaId_Nombre ON Productos(AreaId, Nombre);",
            @"CREATE TABLE IF NOT EXISTS Inventarios (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AreaId INTEGER NOT NULL REFERENCES Areas(Id) ON DELETE CASCADE,
                FechaInventario TEXT NOT NULL,
                FechaRegistro TEXT NOT NULL,
                UsuarioId INTEGER NOT NULL,
                UsuarioNombre TEXT NOT NULL,
                Observaciones TEXT NULL
            );",
            @"CREATE INDEX IF NOT EXISTS IX_Inventarios_FechaInventario ON Inventarios(FechaInventario);",
            @"CREATE TABLE IF NOT EXISTS InventarioDetalles (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                InventarioId INTEGER NOT NULL REFERENCES Inventarios(Id) ON DELETE CASCADE,
                ProductoId INTEGER NULL REFERENCES Productos(Id) ON DELETE SET NULL,
                NombreProducto TEXT NOT NULL,
                UnidadMedida TEXT NOT NULL,
                Cantidad REAL NOT NULL
            );"
        };

        try
        {
            foreach (var sql in statements)
            {
                await context.Database.ExecuteSqlRawAsync(sql);
            }
        }
        catch { }
    }
}
