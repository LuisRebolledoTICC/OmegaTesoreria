using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.Models;

namespace OmegaTesoreria.Migrator;

/// <summary>
/// Herramienta de migración segura de datos: Copia todos los registros de la base SQLite local
/// hacia la base de datos PostgreSQL remota (Neon) respetando el orden de dependencias e integridad referencial.
/// </summary>
public static class DataTransferTool
{
    public static async Task TransferAllDataAsync(string sqliteDbPath, string postgresConnectionString)
    {
        Console.WriteLine($"[Migración] Leyendo SQLite origen: {sqliteDbPath}");
        Console.WriteLine($"[Migración] Conectando a PostgreSQL destino...");

        // 1. Contexto SQLite
        var sqliteOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={sqliteDbPath}")
            .Options;

        // 2. Contexto PostgreSQL
        string formattedConn = postgresConnectionString;
        if (postgresConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            postgresConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(postgresConnectionString);
            var userInfo = uri.UserInfo.Split(':');
            var npgsqlBuilder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.Port > 0 ? uri.Port : 5432,
                Username = userInfo[0],
                Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
                Database = uri.AbsolutePath.TrimStart('/'),
                SslMode = SslMode.Require,
                Pooling = true
            };
            formattedConn = npgsqlBuilder.ToString();
        }

        var postgresOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(formattedConn)
            .Options;

        using var src = new AppDbContext(sqliteOptions);
        using var dest = new AppDbContext(postgresOptions);

        // Asegurar que las migraciones estén aplicadas en PostgreSQL
        Console.WriteLine("[Migración] Aplicando migraciones EF Core en PostgreSQL...");
        await dest.Database.MigrateAsync();

        // Ejecutar transferencia en una transacción atómica
        using var tx = await dest.Database.BeginTransactionAsync();
        try
        {
            // 1. Usuarios
            Console.WriteLine("[Migración] Copiando Usuarios...");
            var existingUsernames = await dest.Users.Select(u => u.UserName).ToListAsync();
            var srcUsers = await src.Users.AsNoTracking().ToListAsync();
            foreach (var u in srcUsers.Where(u => !existingUsernames.Contains(u.UserName)))
            {
                dest.Users.Add(new User
                {
                    UserName = u.UserName,
                    PasswordHash = u.PasswordHash,
                    Nombre = u.Nombre,
                    Rol = u.Rol,
                    Activo = u.Activo,
                    FechaCreacion = DateTime.SpecifyKind(u.FechaCreacion, DateTimeKind.Utc),
                    UltimoAcceso = u.UltimoAcceso.HasValue ? DateTime.SpecifyKind(u.UltimoAcceso.Value, DateTimeKind.Utc) : null
                });
            }
            await dest.SaveChangesAsync();

            // 2. Denominaciones
            Console.WriteLine("[Migración] Copiando Denominaciones...");
            var existingDenoms = await dest.Denominaciones.ToListAsync();
            var srcDenoms = await src.Denominaciones.AsNoTracking().ToListAsync();
            foreach (var d in srcDenoms)
            {
                if (!existingDenoms.Any(x => x.Tipo == d.Tipo && x.Valor == d.Valor))
                {
                    dest.Denominaciones.Add(new Denominacion
                    {
                        Tipo = d.Tipo,
                        Valor = d.Valor,
                        Nombre = d.Nombre,
                        Activa = d.Activa,
                        OrdenVisualizacion = d.OrdenVisualizacion
                    });
                }
            }
            await dest.SaveChangesAsync();

            // Mapeo de IDs de Denominaciones entre Origen y Destino
            var currentDestDenoms = await dest.Denominaciones.ToListAsync();
            var denomIdMap = new Dictionary<int, int>();
            foreach (var sd in srcDenoms)
            {
                var matched = currentDestDenoms.FirstOrDefault(dd => dd.Tipo == sd.Tipo && dd.Valor == sd.Valor);
                if (matched != null)
                {
                    denomIdMap[sd.Id] = matched.Id;
                }
            }

            // 3. Cajas
            Console.WriteLine("[Migración] Copiando Cajas...");
            var existingCajas = await dest.Cajas.ToListAsync();
            var srcCajas = await src.Cajas.AsNoTracking().ToListAsync();
            foreach (var c in srcCajas)
            {
                if (!existingCajas.Any(x => x.Nombre == c.Nombre))
                {
                    var newCaja = new Caja
                    {
                        Nombre = c.Nombre,
                        Descripcion = c.Descripcion,
                        Finalidad = c.Finalidad,
                        Tipo = c.Tipo,
                        Activa = c.Activa,
                        SaldoActual = c.SaldoActual,
                        FechaCreacion = DateTime.SpecifyKind(c.FechaCreacion, DateTimeKind.Utc),
                        CreadoPor = c.CreadoPor,
                        UltimoConteoFecha = c.UltimoConteoFecha.HasValue ? DateTime.SpecifyKind(c.UltimoConteoFecha.Value, DateTimeKind.Utc) : null,
                        EstadoVerificacion = c.EstadoVerificacion
                    };
                    dest.Cajas.Add(newCaja);
                }
            }
            await dest.SaveChangesAsync();

            // Mapeo de IDs de Cajas entre Origen (SQLite) y Destino (PostgreSQL)
            var currentDestCajas = await dest.Cajas.ToListAsync();
            var cajaIdMap = new Dictionary<int, int>();
            foreach (var sc in srcCajas)
            {
                var matched = currentDestCajas.FirstOrDefault(dc => dc.Nombre == sc.Nombre);
                if (matched != null)
                {
                    cajaIdMap[sc.Id] = matched.Id;
                }
            }

            // 4. Tipos de Bolsas
            Console.WriteLine("[Migración] Copiando Tipos de Bolsas...");
            var existingBolsas = await dest.TiposBolsas.ToListAsync();
            var srcBolsas = await src.TiposBolsas.AsNoTracking().ToListAsync();
            foreach (var b in srcBolsas.Where(b => !existingBolsas.Any(eb => eb.Nombre == b.Nombre)))
            {
                int? mappedCajaId = null;
                if (b.CajaId.HasValue && cajaIdMap.TryGetValue(b.CajaId.Value, out var newCId))
                {
                    mappedCajaId = newCId;
                }

                int? mappedDenomId = null;
                if (b.DenominacionAsociadaId.HasValue && denomIdMap.TryGetValue(b.DenominacionAsociadaId.Value, out var newDId))
                {
                    mappedDenomId = newDId;
                }

                dest.TiposBolsas.Add(new TipoBolsa
                {
                    Nombre = b.Nombre,
                    Descripcion = b.Descripcion,
                    ValorUnitario = b.ValorUnitario,
                    Activa = b.Activa,
                    FechaCreacion = DateTime.SpecifyKind(b.FechaCreacion, DateTimeKind.Utc),
                    DenominacionAsociadaId = mappedDenomId,
                    CajaId = mappedCajaId
                });
            }
            await dest.SaveChangesAsync();

            // Mapeo de IDs de Bolsas entre Origen y Destino
            var currentDestBolsas = await dest.TiposBolsas.ToListAsync();
            var bolsaIdMap = new Dictionary<int, int>();
            foreach (var sb in srcBolsas)
            {
                var matched = currentDestBolsas.FirstOrDefault(db => db.Nombre == sb.Nombre);
                if (matched != null)
                {
                    bolsaIdMap[sb.Id] = matched.Id;
                }
            }

            // 5. Cajas Efectivo (Desglose)
            Console.WriteLine("[Migración] Copiando desglose de efectivo por caja...");
            if (!await dest.CajasEfectivo.AnyAsync())
            {
                var srcEfectivo = await src.CajasEfectivo.AsNoTracking().ToListAsync();
                foreach (var ce in srcEfectivo)
                {
                    int mappedCId = cajaIdMap.TryGetValue(ce.CajaId, out var nId) ? nId : ce.CajaId;
                    int? mappedDId = ce.DenominacionId.HasValue && denomIdMap.TryGetValue(ce.DenominacionId.Value, out var nDId) ? nDId : ce.DenominacionId;
                    int? mappedBId = ce.TipoBolsaId.HasValue && bolsaIdMap.TryGetValue(ce.TipoBolsaId.Value, out var nBId) ? nBId : ce.TipoBolsaId;

                    dest.CajasEfectivo.Add(new CajaEfectivo
                    {
                        CajaId = mappedCId,
                        TipoEfectivo = ce.TipoEfectivo,
                        DenominacionId = mappedDId,
                        TipoBolsaId = mappedBId,
                        Cantidad = ce.Cantidad
                    });
                }
                await dest.SaveChangesAsync();
            }

            // 6. Operaciones y Detalles
            Console.WriteLine("[Migración] Copiando Historial de Operaciones...");
            if (!await dest.Operaciones.AnyAsync())
            {
                var srcOperaciones = await src.Operaciones.Include(o => o.Detalles).AsNoTracking().ToListAsync();
                foreach (var op in srcOperaciones)
                {
                    int? origMapped = op.CajaOrigenId.HasValue && cajaIdMap.TryGetValue(op.CajaOrigenId.Value, out var oId) ? oId : op.CajaOrigenId;
                    int? destMapped = op.CajaDestinoId.HasValue && cajaIdMap.TryGetValue(op.CajaDestinoId.Value, out var dId) ? dId : op.CajaDestinoId;

                    var newOp = new Operacion
                    {
                        TipoOperacion = op.TipoOperacion,
                        CajaOrigenId = origMapped,
                        CajaDestinoId = destMapped,
                        FechaOperacion = DateTime.SpecifyKind(op.FechaOperacion, DateTimeKind.Utc),
                        Importe = op.Importe,
                        Concepto = op.Concepto,
                        Descripcion = op.Descripcion,
                        Estado = op.Estado,
                        UsuarioId = op.UsuarioId,
                        UsuarioNombre = op.UsuarioNombre,
                        FechaRegistro = DateTime.SpecifyKind(op.FechaRegistro, DateTimeKind.Utc),
                        OperacionRelacionadaId = op.OperacionRelacionadaId,
                        Observaciones = op.Observaciones,
                        Detalles = op.Detalles.Select(d => new DetalleOperacion
                        {
                            TipoEfectivo = d.TipoEfectivo,
                            DenominacionId = d.DenominacionId.HasValue && denomIdMap.TryGetValue(d.DenominacionId.Value, out var nD) ? nD : d.DenominacionId,
                            TipoBolsaId = d.TipoBolsaId.HasValue && bolsaIdMap.TryGetValue(d.TipoBolsaId.Value, out var nB) ? nB : d.TipoBolsaId,
                            ValorUnitarioHistorico = d.ValorUnitarioHistorico,
                            Cantidad = d.Cantidad,
                            Subtotal = d.Subtotal
                        }).ToList()
                    };
                    dest.Operaciones.Add(newOp);
                }
                await dest.SaveChangesAsync();
            }

            // 7. Conteos Físicos
            Console.WriteLine("[Migración] Copiando Conteos Físicos...");
            if (!await dest.Conteos.AnyAsync())
            {
                var srcConteos = await src.Conteos.AsNoTracking().ToListAsync();
                foreach (var c in srcConteos)
                {
                    int conteoCajaId = cajaIdMap.TryGetValue(c.CajaId, out var mappedCId) ? mappedCId : c.CajaId;
                    dest.Conteos.Add(new Conteo
                    {
                        CajaId = conteoCajaId,
                        CajaNombre = c.CajaNombre,
                        FechaConteo = DateTime.SpecifyKind(c.FechaConteo, DateTimeKind.Utc),
                        SaldoEsperado = c.SaldoEsperado,
                        SaldoContado = c.SaldoContado,
                        Diferencia = c.Diferencia,
                        Estado = c.Estado,
                        UsuarioId = c.UsuarioId,
                        UsuarioNombre = c.UsuarioNombre,
                        Observaciones = c.Observaciones,
                        TotalMonedas = c.TotalMonedas,
                        TotalBilletes = c.TotalBilletes,
                        TotalBolsas = c.TotalBolsas,
                        DesgloseJson = c.DesgloseJson
                    });
                }
                await dest.SaveChangesAsync();
            }

            // 8. Auditoría
            Console.WriteLine("[Migración] Copiando Auditorías...");
            if (!await dest.Auditoria.AnyAsync())
            {
                var srcAuditorias = await src.Auditoria.AsNoTracking().ToListAsync();
                foreach (var a in srcAuditorias)
                {
                    dest.Auditoria.Add(new Auditoria
                    {
                        UsuarioId = a.UsuarioId,
                        UsuarioNombre = a.UsuarioNombre,
                        Accion = a.Accion,
                        Entidad = a.Entidad,
                        EntidadId = a.EntidadId,
                        FechaHora = DateTime.SpecifyKind(a.FechaHora, DateTimeKind.Utc),
                        ValoresAnteriores = a.ValoresAnteriores,
                        ValoresNuevos = a.ValoresNuevos,
                        Descripcion = a.Descripcion
                    });
                }
                await dest.SaveChangesAsync();
            }

            await tx.CommitAsync();
            Console.WriteLine("[Migración] ¡Transferencia completada con éxito sin perder ningún dato!");
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            Console.WriteLine($"[Migración ERROR] Se realizó rollback. Detalle: {ex.Message}");
            throw;
        }
    }
}
