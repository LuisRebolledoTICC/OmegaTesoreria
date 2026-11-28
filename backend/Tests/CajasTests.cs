using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Tests;

public static class CajasTests
{
    public static async Task<int> RunAllTestsAsync()
    {
        Console.WriteLine("==================================================");
        Console.WriteLine("Iniciando pruebas unitarias de Edición de Cajas...");
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
            .UseSqlite($"Data Source=file:cajas_test_{Guid.NewGuid()}?mode=memory&cache=shared")
            .Options;

        using var context = new AppDbContext(options);
        await context.Database.OpenConnectionAsync();
        await context.Database.EnsureCreatedAsync();

        var service = new TesoreriaService(context);

        int cajaId = 0;
        await AssertAsync("1. Crear caja con saldo inicial $1,500 y verificar datos iniciales", async () =>
        {
            var creada = await service.CreateCajaAsync(
                new CreateCajaRequest("Caja Chica", "Descripción inicial", "Gastos menores", 1500m, "EFECTIVO"),
                1,
                "admin");
            cajaId = creada.Id;
            if (creada.SaldoActual != 1500m || creada.Tipo != "EFECTIVO")
                throw new Exception("Datos iniciales incorrectos.");
        });

        await AssertAsync("2. Editar nombre y descripción mantiene intactos saldo, tipo, finalidad, estado e historial", async () =>
        {
            var opsAntes = await context.Operaciones.CountAsync();

            var ok = await service.UpdateCajaAsync(
                cajaId,
                new UpdateCajaRequest("Caja Chica Actualizada", "Nueva descripción opcional"),
                "admin");

            if (!ok) throw new Exception("UpdateCajaAsync devolvió false.");

            var actualizada = await service.GetCajaByIdAsync(cajaId)
                ?? throw new Exception("No se encontró la caja.");

            if (actualizada.Nombre != "Caja Chica Actualizada")
                throw new Exception($"Nombre inesperado: {actualizada.Nombre}");
            if (actualizada.Descripcion != "Nueva descripción opcional")
                throw new Exception($"Descripción inesperada: {actualizada.Descripcion}");
            if (actualizada.SaldoActual != 1500m)
                throw new Exception($"El saldo cambió: {actualizada.SaldoActual}");
            if (actualizada.Tipo != "EFECTIVO" || actualizada.Finalidad != "Gastos menores" || !actualizada.Activa)
                throw new Exception("Se alteró tipo, finalidad o estado activa.");

            var opsDespues = await context.Operaciones.CountAsync();
            if (opsDespues != opsAntes)
                throw new Exception($"No debió crearse ningún movimiento bancario. Antes={opsAntes}, Después={opsDespues}");
        });

        await AssertAsync("3. Rechazar edición cuando el nombre está vacío", async () =>
        {
            bool rejected = false;
            try
            {
                await service.UpdateCajaAsync(cajaId, new UpdateCajaRequest("   ", "Desc"), "admin");
            }
            catch (ArgumentException) { rejected = true; }

            if (!rejected) throw new Exception("Se permitió guardar una caja con nombre vacío.");
        });

        Console.WriteLine("==================================================");
        Console.WriteLine($"Resultados: {passed} superadas, {failed} fallidas.");
        Console.WriteLine("==================================================");

        return failed == 0 ? 0 : 1;
    }
}
