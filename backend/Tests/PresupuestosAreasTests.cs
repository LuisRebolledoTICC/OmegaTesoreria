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

public static class PresupuestosAreasTests
{
    public static async Task<int> RunAllTestsAsync()
    {
        Console.WriteLine("==================================================");
        Console.WriteLine("Iniciando pruebas de Presupuestos de Áreas (Saldos Negativos)...");
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
            .UseSqlite($"Data Source=file:presupuestos_test_{Guid.NewGuid()}?mode=memory&cache=shared")
            .Options;

        using var context = new AppDbContext(options);
        await context.Database.OpenConnectionAsync();
        await context.Database.EnsureCreatedAsync();

        // Seed usuario, área y caja
        var admin = new User { Nombre = "Admin", UserName = "admin", PasswordHash = "hash", Rol = "Administrador", Activo = true };
        context.Users.Add(admin);
        var area = new Area { Nombre = "Área Logística", Activa = true };
        context.Areas.Add(area);
        await context.SaveChangesAsync();

        var tesoreriaService = new TesoreriaService(context);
        var caja = await tesoreriaService.CreateCajaAsync(
            new CreateCajaRequest("Caja General", "Caja de prueba", "Operación", 500m, "EFECTIVO"),
            admin.Id,
            admin.UserName);

        var authService = new AuthService(context, new ConfigurationBuilder().Build());
        var presupuestosService = new PresupuestosService(context, authService);

        // Asignar $100 iniciales al área (Caja baja de $500 a $400)
        await presupuestosService.AsignarPresupuestoAsync(
            new AsignarPresupuestoRequest(area.Id, caja.Id, 100m, DateTime.UtcNow, "Fondo inicial"),
            admin.Id, admin.UserName);

        await AssertAsync("1. Egreso menor al saldo disponible ($100 - $40 = $60)", async () =>
        {
            await presupuestosService.RegistrarEgresoAsync(
                new RegistrarEgresoPresupuestoRequest(area.Id, "Papelería", 40m, DateTime.UtcNow, "Hojas", null),
                admin.Id, admin.UserName, isAdmin: true);

            var det = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det.Resumen.SaldoDisponible != 60m)
                throw new Exception($"Saldo esperado 60, obtenido {det.Resumen.SaldoDisponible}");
        });

        await AssertAsync("2. Egreso que deja el saldo exactamente en cero ($60 - $60 = $0)", async () =>
        {
            await presupuestosService.RegistrarEgresoAsync(
                new RegistrarEgresoPresupuestoRequest(area.Id, "Transporte", 60m, DateTime.UtcNow, "Traslado", null),
                admin.Id, admin.UserName, isAdmin: true);

            var det = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det.Resumen.SaldoDisponible != 0m)
                throw new Exception($"Saldo esperado 0, obtenido {det.Resumen.SaldoDisponible}");
        });

        // Asignar $100 más al área (Caja baja de $400 a $300)
        await presupuestosService.AsignarPresupuestoAsync(
            new AsignarPresupuestoRequest(area.Id, caja.Id, 100m, DateTime.UtcNow, "Segunda entrega"),
            admin.Id, admin.UserName);

        await AssertAsync("3. Egreso superior al saldo disponible genera saldo negativo ($100 - $150 = -$50) sin tocar caja", async () =>
        {
            var saldoCajaAntes = (await context.Cajas.FirstAsync(c => c.Id == caja.Id)).SaldoActual;

            await presupuestosService.RegistrarEgresoAsync(
                new RegistrarEgresoPresupuestoRequest(area.Id, "Compra urgente", 150m, DateTime.UtcNow, "Equipo", null),
                admin.Id, admin.UserName, isAdmin: true);

            var det = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det.Resumen.SaldoDisponible != -50m)
                throw new Exception($"Saldo esperado -50, obtenido {det.Resumen.SaldoDisponible}");

            var saldoCajaDespues = (await context.Cajas.FirstAsync(c => c.Id == caja.Id)).SaldoActual;
            if (saldoCajaDespues != saldoCajaAntes)
                throw new Exception($"La caja no debió alterarse. Antes={saldoCajaAntes}, Después={saldoCajaDespues}");
        });

        await AssertAsync("4. Varios egresos consecutivos y edición con saldo negativo (-$50 -> -$75 -> -$85)", async () =>
        {
            var egreso2 = await presupuestosService.RegistrarEgresoAsync(
                new RegistrarEgresoPresupuestoRequest(area.Id, "Insumo adicional", 25m, DateTime.UtcNow, null, null),
                admin.Id, admin.UserName, isAdmin: true);

            var det1 = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det1.Resumen.SaldoDisponible != -75m)
                throw new Exception($"Saldo esperado -75, obtenido {det1.Resumen.SaldoDisponible}");

            // Editar incremento de $25 a $35 -> saldo baja a -$85
            await presupuestosService.EditarEgresoAsync(
                egreso2.Id,
                new EditarEgresoPresupuestoRequest("Insumo adicional ajustado", 35m, DateTime.UtcNow, null, null, null),
                admin.Id, admin.UserName, isAdmin: true);

            var det2 = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det2.Resumen.SaldoDisponible != -85m)
                throw new Exception($"Saldo esperado -85 tras edición, obtenido {det2.Resumen.SaldoDisponible}");
        });

        await AssertAsync("5. Ingreso posterior al área reduce y liquida saldo negativo (-$85 + $50 = -$35; +$35 = $0)", async () =>
        {
            await presupuestosService.AsignarPresupuestoAsync(
                new AsignarPresupuestoRequest(area.Id, caja.Id, 50m, DateTime.UtcNow, "Abono parcial"),
                admin.Id, admin.UserName);

            var det1 = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det1.Resumen.SaldoDisponible != -35m)
                throw new Exception($"Saldo esperado -35, obtenido {det1.Resumen.SaldoDisponible}");

            await presupuestosService.AsignarPresupuestoAsync(
                new AsignarPresupuestoRequest(area.Id, caja.Id, 35m, DateTime.UtcNow, "Liquidación"),
                admin.Id, admin.UserName);

            var det2 = await presupuestosService.GetDetalleAreaAsync(area.Id, admin.Id, admin.UserName, isAdmin: true);
            if (det2.Resumen.SaldoDisponible != 0m)
                throw new Exception($"Saldo esperado 0, obtenido {det2.Resumen.SaldoDisponible}");
        });

        await AssertAsync("6. Cajas bancarias/efectivo siguen rechazando saldos negativos", async () =>
        {
            var saldoCajaActual = (await context.Cajas.FirstAsync(c => c.Id == caja.Id)).SaldoActual; // 300 - 50 - 35 = 215
            bool cajaRechazoSalida = false;
            try
            {
                await tesoreriaService.RegistrarSalidaAsync(
                    new SalidaRequest { CajaId = caja.Id, Importe = saldoCajaActual + 50m, Concepto = "Intento sobregiro caja", Descripcion = "Test" },
                    admin.Id, admin.UserName);
            }
            catch (InvalidOperationException)
            {
                cajaRechazoSalida = true;
            }

            if (!cajaRechazoSalida)
                throw new Exception("La caja permitió una salida superior a su saldo actual.");
        });

        Console.WriteLine("==================================================");
        Console.WriteLine($"Resultados: {passed} superadas, {failed} fallidas.");
        Console.WriteLine("==================================================");

        return failed == 0 ? 0 : 1;
    }
}
