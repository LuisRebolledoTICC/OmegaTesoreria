using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Tests;

public static class VentasPedidosTests
{
    public static async Task<int> RunAllTestsAsync()
    {
        Console.WriteLine("==================================================");
        Console.WriteLine("Iniciando pruebas unitarias de Ventas y Pedidos...");
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
            .UseSqlite($"Data Source=file:ventas_test_{Guid.NewGuid()}?mode=memory&cache=shared")
            .Options;

        using var context = new AppDbContext(options);
        await context.Database.OpenConnectionAsync();
        await context.Database.EnsureCreatedAsync();

        var tesoreriaService = new TesoreriaService(context);
        var ventasService = new VentasService(context, tesoreriaService);

        int ventaId = 0;
        int presHotDogSencillo = 0;
        int presHotDogEspecial = 0;
        int presRefresco = 0;
        int pedido2Id = 0;
        int pedido3Id = 0;

        await AssertAsync("1. Crear venta con productos (incluyendo varias presentaciones) y registrar 3 pedidos", async () =>
        {
            var venta = await ventasService.CreateVentaAsync(
                new CreateVentaRequest("Venta Domingo", DateTime.UtcNow), "admin");
            ventaId = venta.Id;

            var prodHotDogs = await ventasService.SaveProductoAsync(
                ventaId,
                null,
                new CreateOrUpdateProductoRequest(
                    "Hot dogs",
                    "Hot dogs de la casa",
                    1,
                    new List<CreateOrUpdatePresentacionRequest>
                    {
                        new(null, "Sencillo", 30m, 1),
                        new(null, "Especial", 45m, 2)
                    }),
                "admin");

            var prodRefrescos = await ventasService.SaveProductoAsync(
                ventaId,
                null,
                new CreateOrUpdateProductoRequest(
                    "Refrescos",
                    "Bebidas frías",
                    2,
                    new List<CreateOrUpdatePresentacionRequest>
                    {
                        new(null, "Lata 355ml", 20m, 1)
                    }),
                "admin");

            presHotDogSencillo = prodHotDogs.Presentaciones.First(p => p.Nombre == "Sencillo").Id;
            presHotDogEspecial = prodHotDogs.Presentaciones.First(p => p.Nombre == "Especial").Id;
            presRefresco = prodRefrescos.Presentaciones.First().Id;

            // Pedido 1: 2 hot dogs (Sencillo) y 1 refresco
            await ventasService.CreatePedidoAsync(
                ventaId,
                new CreatePedidoRequest(
                    "Cliente 1",
                    null,
                    "PENDIENTE",
                    new List<ItemPedidoRequest>
                    {
                        new(presHotDogSencillo, 2),
                        new(presRefresco, 1)
                    },
                    new List<PagoPedidoRequest> { new("EFECTIVO", 80m, null) }),
                "admin");

            // Pedido 2: 1 hot dog (Especial) y 2 refrescos
            var ped2 = await ventasService.CreatePedidoAsync(
                ventaId,
                new CreatePedidoRequest(
                    "Cliente 2",
                    null,
                    "ENTREGADO",
                    new List<ItemPedidoRequest>
                    {
                        new(presHotDogEspecial, 1),
                        new(presRefresco, 2)
                    },
                    new List<PagoPedidoRequest> { new("TRANSFERENCIA", 85m, "REF-1") }),
                "admin");
            pedido2Id = ped2.Id;

            // Pedido 3: 3 hot dogs (Sencillo)
            var ped3 = await ventasService.CreatePedidoAsync(
                ventaId,
                new CreatePedidoRequest(
                    "Cliente 3",
                    null,
                    "PENDIENTE",
                    new List<ItemPedidoRequest>
                    {
                        new(presHotDogSencillo, 3)
                    },
                    new List<PagoPedidoRequest> { new("EFECTIVO", 90m, null) }),
                "admin");
            pedido3Id = ped3.Id;
        });

        await AssertAsync("2. Verificar conteo de pedidos (3) y unidades agrupadas (Hot dogs: 6, Refrescos: 3) en Detalle y Lista", async () =>
        {
            var detalle = await ventasService.GetVentaByIdAsync(ventaId)
                ?? throw new Exception("Venta no encontrada.");

            if (detalle.Metricas.TotalPedidos != 3)
                throw new Exception($"TotalPedidos esperado 3, obtenido {detalle.Metricas.TotalPedidos}");

            var hotDogs = detalle.Metricas.ProductosVendidos.FirstOrDefault(p => p.ProductoNombre == "Hot dogs");
            var refrescos = detalle.Metricas.ProductosVendidos.FirstOrDefault(p => p.ProductoNombre == "Refrescos");

            if (hotDogs == null || hotDogs.CantidadTotal != 6)
                throw new Exception($"Hot dogs esperado 6 unidades, obtenido {hotDogs?.CantidadTotal}");

            if (refrescos == null || refrescos.CantidadTotal != 3)
                throw new Exception($"Refrescos esperado 3 unidades, obtenido {refrescos?.CantidadTotal}");

            var lista = await ventasService.GetVentasAsync();
            var resumen = lista.First(v => v.Id == ventaId);
            if (resumen.TotalPedidos != 3)
                throw new Exception($"Resumen TotalPedidos esperado 3, obtenido {resumen.TotalPedidos}");

            var rHotDogs = resumen.ProductosVendidos.FirstOrDefault(p => p.ProductoNombre == "Hot dogs");
            var rRefrescos = resumen.ProductosVendidos.FirstOrDefault(p => p.ProductoNombre == "Refrescos");
            if (rHotDogs?.CantidadTotal != 6 || rRefrescos?.CantidadTotal != 3)
                throw new Exception($"Resumen productos incorrecto: Hot dogs={rHotDogs?.CantidadTotal}, Refrescos={rRefrescos?.CantidadTotal}");
        });

        await AssertAsync("3. Editar Pedido 2 (cambiar a 4 hot dogs y 0 refrescos) actualiza conteo a Hot dogs: 9, Refrescos: 1", async () =>
        {
            await ventasService.UpdatePedidoAsync(
                ventaId,
                pedido2Id,
                new CreatePedidoRequest(
                    "Cliente 2 Editado",
                    null,
                    "ENTREGADO",
                    new List<ItemPedidoRequest>
                    {
                        new(presHotDogSencillo, 4)
                    },
                    new List<PagoPedidoRequest> { new("TRANSFERENCIA", 120m, "REF-1") }),
                "admin");

            var detalle = await ventasService.GetVentaByIdAsync(ventaId)!;
            var hotDogs = detalle!.Metricas.ProductosVendidos.First(p => p.ProductoNombre == "Hot dogs").CantidadTotal;
            var refrescos = detalle.Metricas.ProductosVendidos.First(p => p.ProductoNombre == "Refrescos").CantidadTotal;

            if (hotDogs != 9 || refrescos != 1)
                throw new Exception($"Esperado Hot dogs=9, Refrescos=1; obtenido Hot dogs={hotDogs}, Refrescos={refrescos}");
        });

        await AssertAsync("4. Cancelar Pedido 3 descuenta sus 3 hot dogs del conteo de unidades (Hot dogs: 6, Refrescos: 1)", async () =>
        {
            await ventasService.CancelarPedidoAsync(ventaId, pedido3Id, "admin");

            var detalle = await ventasService.GetVentaByIdAsync(ventaId)!;
            if (detalle!.Metricas.TotalPedidos != 3 || detalle.Metricas.PedidosCancelados != 1)
                throw new Exception($"Conteo pedidos inesperado: Total={detalle.Metricas.TotalPedidos}, Cancelados={detalle.Metricas.PedidosCancelados}");

            var hotDogs = detalle.Metricas.ProductosVendidos.First(p => p.ProductoNombre == "Hot dogs").CantidadTotal;
            var refrescos = detalle.Metricas.ProductosVendidos.First(p => p.ProductoNombre == "Refrescos").CantidadTotal;

            if (hotDogs != 6 || refrescos != 1)
                throw new Exception($"Tras cancelar esperado Hot dogs=6, Refrescos=1; obtenido Hot dogs={hotDogs}, Refrescos={refrescos}");
        });

        Console.WriteLine("==================================================");
        Console.WriteLine($"Resultados: {passed} superadas, {failed} fallidas.");
        Console.WriteLine("==================================================");

        return failed == 0 ? 0 : 1;
    }
}
