using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Tests;

public static class DeudasEventosTests
{
    public static async Task<int> RunAllTestsAsync()
    {
        Console.WriteLine("==================================================");
        Console.WriteLine("Iniciando pruebas unitarias de Deudas y Abonos...");
        Console.WriteLine("==================================================");

        int passed = 0;
        int failed = 0;

        async Task AssertAsync(string testName, Func<Task> test)
        {
            try
            {
                await test();
                Console.WriteLine($"[PASS] {testName}");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FAIL] {testName}: {ex.Message}");
                failed++;
            }
        }

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source=file:deudas_test_{Guid.NewGuid()}?mode=memory&cache=shared")
            .Options;

        using var context = new AppDbContext(options);
        await context.Database.OpenConnectionAsync();
        await context.Database.EnsureCreatedAsync();

        // Seed inicial
        var cajaEfectivo = new Caja { Nombre = "Caja Principal", Tipo = "EFECTIVO", Activa = true, SaldoActual = 0m, Finalidad = "Operacion", Descripcion = "Test" };
        var cajaTransf = new Caja { Nombre = "Caja Transferencias", Tipo = "TRANSFERENCIAS", Activa = true, SaldoActual = 0m, Finalidad = "Banco", Descripcion = "Test" };
        context.Cajas.AddRange(cajaEfectivo, cajaTransf);

        var userOmega = new User { UserName = "juan_omega", Nombre = "Juan Perez", Rol = "Omega", Activo = true, PasswordHash = "hash" };
        var userAdmin = new User { UserName = "admin_user", Nombre = "Admin Master", Rol = "Administrador", Activo = true, PasswordHash = "hash" };
        context.Users.AddRange(userOmega, userAdmin);
        await context.SaveChangesAsync();

        var service = new DeudasEventosService(context);

        // Test 1: Crear actividad y verificar asignación a Omega excluyendo Admin
        int actId = 0;
        int asignacionId = 0;
        await AssertAsync("1. Crear actividad y asignar automáticamente", async () =>
        {
            var act = await service.CreateActividadAsync(new CreateActividadDeudaRequest("Retiro Anual", 500m, DateTime.UtcNow, "Retiro"), "admin");
            actId = act.Id;
            if (act.TotalAsignados != 1) throw new Exception($"Total asignados esperado 1, obtenido {act.TotalAsignados}");
            var asig = await context.AsignacionesActividadDeuda.FirstOrDefaultAsync(a => a.ActividadDeudaId == actId && a.UsuarioId == userOmega.Id);
            if (asig == null) throw new Exception("No se encontró la asignación para el usuario Omega");
            asignacionId = asig.Id;
        });

        // Test 2: Abono parcial de $200 en Efectivo -> Estado PENDIENTE, Saldo $300
        await AssertAsync("2. Abono parcial de $200 en efectivo: estado Pendiente y saldo $300", async () =>
        {
            var res = await service.RegistrarPagoAsync(asignacionId, new RegistrarPagoDeudaRequest(200m, "EFECTIVO", cajaEfectivo.Id, DateTime.UtcNow), 1, "admin", true);
            if (res.Estado != "PENDIENTE") throw new Exception($"Estado esperado PENDIENTE, obtenido {res.Estado}");
            if (res.TotalAbonado != 200m) throw new Exception($"Total abonado esperado 200, obtenido {res.TotalAbonado}");
            if (res.SaldoPendiente != 300m) throw new Exception($"Saldo pendiente esperado 300, obtenido {res.SaldoPendiente}");
            if (res.DeudaCorrespondiente != 300m) throw new Exception($"Deuda correspondiente esperada 300, obtenido {res.DeudaCorrespondiente}");
            
            // Verificar saldo de caja y movimiento bancario
            var c = await context.Cajas.FirstAsync(x => x.Id == cajaEfectivo.Id);
            if (c.SaldoActual != 200m) throw new Exception($"Saldo caja esperado 200, obtenido {c.SaldoActual}");

            var op = await context.Operaciones.FirstOrDefaultAsync(o => o.TipoOperacion == "ENTRADA" && o.Importe == 200m);
            if (op == null) throw new Exception("No se generó el movimiento bancario ENTRADA de $200");
        });

        // Test 3: Rechazar abono mayor al saldo pendiente
        await AssertAsync("3. Rechazar abono superior al saldo pendiente ($350 > $300)", async () =>
        {
            bool rejected = false;
            try
            {
                await service.RegistrarPagoAsync(asignacionId, new RegistrarPagoDeudaRequest(350m, "EFECTIVO", cajaEfectivo.Id, DateTime.UtcNow), 1, "admin", true);
            }
            catch (InvalidOperationException)
            {
                rejected = true;
            }
            if (!rejected) throw new Exception("No se rechazó el abono mayor al saldo pendiente");
        });

        // Test 4: Reglas estrictas de compatibilidad de cajas
        await AssertAsync("4. Rechazar efectivo en caja de transferencias y transferencia en caja de efectivo", async () =>
        {
            bool rej1 = false;
            try
            {
                await service.RegistrarPagoAsync(asignacionId, new RegistrarPagoDeudaRequest(100m, "EFECTIVO", cajaTransf.Id, DateTime.UtcNow), 1, "admin", true);
            }
            catch (InvalidOperationException) { rej1 = true; }

            bool rej2 = false;
            try
            {
                await service.RegistrarPagoAsync(asignacionId, new RegistrarPagoDeudaRequest(100m, "TRANSFERENCIA", cajaEfectivo.Id, DateTime.UtcNow), 1, "admin", true);
            }
            catch (InvalidOperationException) { rej2 = true; }

            if (!rej1 || !rej2) throw new Exception($"Fallo validación de cajas: rej1={rej1}, rej2={rej2}");
        });

        // Test 5: Abono complementario de $300 en Transferencia -> Estado PAGADO, Saldo $0
        int abonoTransfId = 0;
        await AssertAsync("5. Registrar abono de $300 por transferencia y verificar cambio a PAGADO", async () =>
        {
            var res = await service.RegistrarPagoAsync(asignacionId, new RegistrarPagoDeudaRequest(300m, "TRANSFERENCIA", cajaTransf.Id, DateTime.UtcNow), 1, "admin", true);
            if (res.Estado != "PAGADO") throw new Exception($"Estado esperado PAGADO, obtenido {res.Estado}");
            if (res.TotalAbonado != 500m) throw new Exception($"Total abonado esperado 500, obtenido {res.TotalAbonado}");
            if (res.SaldoPendiente != 0m) throw new Exception($"Saldo pendiente esperado 0, obtenido {res.SaldoPendiente}");
            if (res.DeudaCorrespondiente != 0m) throw new Exception($"Deuda correspondiente esperada 0, obtenido {res.DeudaCorrespondiente}");
            if (res.Abonos?.Count != 2) throw new Exception($"Esperados 2 abonos, encontrados {res.Abonos?.Count}");

            var cTransf = await context.Cajas.FirstAsync(x => x.Id == cajaTransf.Id);
            if (cTransf.SaldoActual != 300m) throw new Exception($"Saldo caja transferencia esperado 300, obtenido {cTransf.SaldoActual}");

            var abono = res.Abonos.First(a => a.FormaPago == "TRANSFERENCIA");
            abonoTransfId = abono.Id;
        });

        // Test 6: Reversión de un abono específico -> vuelve a PENDIENTE con saldo recalculado
        await AssertAsync("6. Revertir abono de $300: estado vuelve a PENDIENTE con saldo $300", async () =>
        {
            var res = await service.RevertirPagoAsync(asignacionId, new RevertirPagoDeudaRequest("Error de registro", abonoTransfId), 1, "admin", true);
            if (res.Estado != "PENDIENTE") throw new Exception($"Estado esperado PENDIENTE, obtenido {res.Estado}");
            if (res.TotalAbonado != 200m) throw new Exception($"Total abonado esperado 200, obtenido {res.TotalAbonado}");
            if (res.SaldoPendiente != 300m) throw new Exception($"Saldo pendiente esperado 300, obtenido {res.SaldoPendiente}");

            var cTransf = await context.Cajas.FirstAsync(x => x.Id == cajaTransf.Id);
            if (cTransf.SaldoActual != 0m) throw new Exception($"Saldo caja transferencia revertida esperado 0, obtenido {cTransf.SaldoActual}");

            var opReversa = await context.Operaciones.FirstOrDefaultAsync(o => o.TipoOperacion == "REVERSA" && o.Importe == 300m);
            if (opReversa == null) throw new Exception("No se generó el movimiento bancario REVERSA de $300");
        });

        // Test 7: Marcar NO_ASISTIO revirtiendo ingresos existentes (deuda $0, recaudación neta $0)
        await AssertAsync("7. Marcar No asistió con abonos previos revierte ingresos automáticamente", async () =>
        {
            var res = await service.CambiarEstadoAsync(asignacionId, new CambiarEstadoAsignacionRequest("NO_ASISTIO", "No pudo asistir"), 1, "admin", true);
            if (res.Estado != "NO_ASISTIO") throw new Exception($"Estado esperado NO_ASISTIO, obtenido {res.Estado}");
            if (res.SaldoPendiente != 0m) throw new Exception($"Saldo pendiente esperado 0, obtenido {res.SaldoPendiente}");
            if (res.TotalAbonado != 0m) throw new Exception($"Total abonado activo esperado 0, obtenido {res.TotalAbonado}");

            // Caja de efectivo de donde salieron los $200 originales debe quedar en 0
            var cEf = await context.Cajas.FirstAsync(x => x.Id == cajaEfectivo.Id);
            if (cEf.SaldoActual != 0m) throw new Exception($"Saldo caja efectivo tras reversion total esperado 0, obtenido {cEf.SaldoActual}");

            // Historial debe tener ambos abonos en REVERTIDO
            var historial = await context.HistorialPagosDeuda.Where(h => h.AsignacionActividadDeudaId == asignacionId).ToListAsync();
            if (historial.Any(h => h.Estado == "CONFIRMADO")) throw new Exception("Quedaron abonos sin revertir en historial");
        });

        // Test 8: Resumen global y cálculo de deuda de múltiples actividades
        await AssertAsync("8. Cálculo de deuda total en resumen global y detalle de usuario", async () =>
        {
            var act2 = await service.CreateActividadAsync(new CreateActividadDeudaRequest("Playera", 300m, DateTime.UtcNow, "Uniforme"), "admin");
            var act3 = await service.CreateActividadAsync(new CreateActividadDeudaRequest("Convivencia", 200m, DateTime.UtcNow, "Comida"), "admin");

            var asig2 = await context.AsignacionesActividadDeuda.FirstAsync(a => a.ActividadDeudaId == act2.Id && a.UsuarioId == userOmega.Id);
            var asig3 = await context.AsignacionesActividadDeuda.FirstAsync(a => a.ActividadDeudaId == act3.Id && a.UsuarioId == userOmega.Id);

            // Abono de $100 a Playera (saldo 200)
            await service.RegistrarPagoAsync(asig2.Id, new RegistrarPagoDeudaRequest(100m, "EFECTIVO", cajaEfectivo.Id, DateTime.UtcNow), 1, "admin", true);
            // Pago completo de $200 a Convivencia (saldo 0)
            await service.RegistrarPagoAsync(asig3.Id, new RegistrarPagoDeudaRequest(200m, "EFECTIVO", cajaEfectivo.Id, DateTime.UtcNow), 1, "admin", true);

            var global = await service.GetResumenGlobalAsync();
            var userResumen = global.Usuarios.First(u => u.UsuarioId == userOmega.Id);

            // Deuda esperada: Act1(NO_ASISTIO)=$0 + Act2(300-100)=$200 + Act3(PAGADO)=$0 -> Total Deuda = $200
            if (userResumen.DeudaTotal != 200m)
                throw new Exception($"Deuda total esperada 200, obtenida {userResumen.DeudaTotal}");

            if (userResumen.TotalPagado != 300m) // 100 de Playera + 200 de Convivencia
                throw new Exception($"Total pagado esperado 300, obtenido {userResumen.TotalPagado}");
        });

        Console.WriteLine("==================================================");
        Console.WriteLine($"Resultados: {passed} superadas, {failed} fallidas.");
        Console.WriteLine("==================================================");

        return failed == 0 ? 0 : 1;
    }
}
