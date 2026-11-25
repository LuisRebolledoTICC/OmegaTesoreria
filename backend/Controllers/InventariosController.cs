using System.Security.Claims;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Models;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventariosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public InventariosController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    private string GetUserName() => User.Identity?.Name ?? "";
    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private bool IsAdmin() => User.IsInRole("Administrador");

    // Verifica que el usuario tenga acceso al área (integrante o admin) y que el área esté activa
    private async Task<(bool allowed, Area? area)> CheckAreaAccess(int areaId)
    {
        var area = await _context.Areas.FindAsync(areaId);
        if (area == null || !area.Activa) return (false, area);

        if (IsAdmin()) return (true, area);

        var userId = GetUserId();
        var isIntegrante = await _context.AreaIntegrantes.AnyAsync(ai => ai.AreaId == areaId && ai.UsuarioId == userId);
        var isCoordinador = area.CoordinadorId == userId;

        return (isIntegrante || isCoordinador, area);
    }

    // =================== PRODUCTOS ===================

    // GET: api/inventarios/productos?areaId=1&search=hojas
    [HttpGet("productos")]
    public async Task<IActionResult> GetProductos([FromQuery] int areaId, [FromQuery] string? search)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios");
        if (!hasPermission) return Forbid();

        var (allowed, area) = await CheckAreaAccess(areaId);
        if (!allowed) return Forbid();

        var query = _context.Productos.Where(p => p.AreaId == areaId && p.Activo);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(p => p.Nombre.ToLower().Contains(searchLower));
        }

        var productos = await query
            .OrderBy(p => p.Nombre)
            .Select(p => new ProductoDto(p.Id, p.AreaId, p.Nombre, p.UnidadMedida, p.CantidadActual, p.Activo, p.FechaCreacion))
            .ToListAsync();

        return Ok(productos);
    }

    // POST: api/inventarios/productos?areaId=1
    [HttpPost("productos")]
    public async Task<IActionResult> CreateProducto([FromQuery] int areaId, [FromBody] CreateProductoRequest request)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios_registrar");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var (allowed, area) = await CheckAreaAccess(areaId);
        if (!allowed) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { message = "El nombre del producto es obligatorio." });
        if (string.IsNullOrWhiteSpace(request.UnidadMedida))
            return BadRequest(new { message = "La unidad de medida es obligatoria." });

        // Verificar duplicado en el área
        if (await _context.Productos.AnyAsync(p => p.AreaId == areaId && p.Activo && p.Nombre.ToLower() == request.Nombre.Trim().ToLower()))
            return BadRequest(new { message = $"Ya existe un producto con el nombre '{request.Nombre}' en esta área." });

        var producto = new Producto
        {
            AreaId = areaId,
            Nombre = request.Nombre.Trim(),
            UnidadMedida = request.UnidadMedida.Trim(),
            CantidadActual = request.CantidadActual,
            Activo = true,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Productos.Add(producto);
        await _context.SaveChangesAsync();

        return Ok(new ProductoDto(producto.Id, producto.AreaId, producto.Nombre, producto.UnidadMedida, producto.CantidadActual, producto.Activo, producto.FechaCreacion));
    }

    // PUT: api/inventarios/productos/{id}
    [HttpPut("productos/{id}")]
    public async Task<IActionResult> UpdateProducto(int id, [FromBody] UpdateProductoRequest request)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios_editar");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var producto = await _context.Productos.FindAsync(id);
        if (producto == null) return NotFound(new { message = "Producto no encontrado." });

        var (allowed, _) = await CheckAreaAccess(producto.AreaId);
        if (!allowed) return Forbid();

        // Verificar duplicado (excluir el mismo)
        if (await _context.Productos.AnyAsync(p => p.AreaId == producto.AreaId && p.Id != id && p.Activo && p.Nombre.ToLower() == request.Nombre.Trim().ToLower()))
            return BadRequest(new { message = $"Ya existe otro producto con el nombre '{request.Nombre}' en esta área." });

        producto.Nombre = request.Nombre.Trim();
        producto.UnidadMedida = request.UnidadMedida.Trim();
        producto.CantidadActual = request.CantidadActual;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Producto actualizado." });
    }

    // =================== INVENTARIOS ===================

    // GET: api/inventarios/historial?areaId=1
    [HttpGet("historial")]
    public async Task<IActionResult> GetHistorial([FromQuery] int areaId)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios_historial");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var (allowed, area) = await CheckAreaAccess(areaId);
        if (!allowed) return Forbid();

        var inventarios = await _context.Inventarios
            .Where(i => i.AreaId == areaId)
            .Include(i => i.Detalles)
            .OrderByDescending(i => i.FechaInventario)
            .Select(i => new InventarioResumenDto(
                i.Id,
                i.AreaId,
                area!.Nombre,
                i.FechaInventario,
                i.FechaRegistro,
                i.UsuarioNombre,
                i.Observaciones,
                i.Detalles.Count
            ))
            .ToListAsync();

        return Ok(inventarios);
    }

    // GET: api/inventarios/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetInventario(int id)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios");
        if (!hasPermission) return Forbid();

        var inventario = await _context.Inventarios
            .Include(i => i.Area)
            .Include(i => i.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (inventario == null) return NotFound(new { message = "Inventario no encontrado." });

        var (allowed, _) = await CheckAreaAccess(inventario.AreaId);
        if (!allowed) return Forbid();

        var dto = new InventarioDetalleDto(
            inventario.Id,
            inventario.AreaId,
            inventario.Area?.Nombre ?? "",
            inventario.FechaInventario,
            inventario.FechaRegistro,
            inventario.UsuarioNombre,
            inventario.Observaciones,
            inventario.Detalles.Select(d => new InventarioItemDto(
                d.Id,
                d.ProductoId,
                d.NombreProducto,
                d.UnidadMedida,
                d.Cantidad
            )).OrderBy(d => d.NombreProducto).ToList()
        );

        return Ok(dto);
    }

    // GET: api/inventarios/ultimo?areaId=1
    [HttpGet("ultimo")]
    public async Task<IActionResult> GetUltimoInventario([FromQuery] int areaId)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios");
        if (!hasPermission) return Forbid();

        var (allowed, area) = await CheckAreaAccess(areaId);
        if (!allowed) return Forbid();

        var inventario = await _context.Inventarios
            .Where(i => i.AreaId == areaId)
            .Include(i => i.Detalles)
                .ThenInclude(d => d.Producto)
            .OrderByDescending(i => i.FechaInventario)
            .FirstOrDefaultAsync();

        if (inventario == null)
            return Ok(new { existe = false, areaNombre = area?.Nombre });

        var dto = new InventarioDetalleDto(
            inventario.Id,
            inventario.AreaId,
            area?.Nombre ?? "",
            inventario.FechaInventario,
            inventario.FechaRegistro,
            inventario.UsuarioNombre,
            inventario.Observaciones,
            inventario.Detalles.Select(d => new InventarioItemDto(
                d.Id,
                d.ProductoId,
                d.NombreProducto,
                d.UnidadMedida,
                d.Cantidad
            )).OrderBy(d => d.NombreProducto).ToList()
        );

        return Ok(new { existe = true, inventario = dto, areaNombre = area?.Nombre });
    }

    // POST: api/inventarios/cargar?areaId=1
    [HttpPost("cargar")]
    public async Task<IActionResult> CargarInventario([FromQuery] int areaId, [FromBody] CargarInventarioRequest request)
    {
        var userName = GetUserName();
        var userId = GetUserId();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios_fisico");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var (allowed, area) = await CheckAreaAccess(areaId);
        if (!allowed) return Forbid();
        if (area != null && !area.Activa)
            return BadRequest(new { message = "No se pueden cargar inventarios en un área desactivada." });

        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "Debe incluir al menos un producto en la carga." });

        // Validar items
        var errors = new List<string>();
        for (int i = 0; i < request.Items.Count; i++)
        {
            var item = request.Items[i];
            if (string.IsNullOrWhiteSpace(item.Producto))
                errors.Add($"Fila {i + 1}: Nombre de producto vacío.");
            if (item.Cantidad < 0)
                errors.Add($"Fila {i + 1}: La cantidad no puede ser negativa.");
            if (string.IsNullOrWhiteSpace(item.UnidadMedida))
                errors.Add($"Fila {i + 1}: Unidad de medida vacía.");
        }
        if (errors.Count > 0)
            return BadRequest(new { message = "Errores en la carga.", errores = errors });

        // Verificar productos duplicados en el archivo
        var duplicados = request.Items
            .GroupBy(i => i.Producto.Trim().ToLower())
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
        if (duplicados.Count > 0)
            return BadRequest(new { message = $"Productos duplicados en la carga: {string.Join(", ", duplicados)}" });

        // Crear el inventario
        var inventario = new Inventario
        {
            AreaId = areaId,
            FechaInventario = request.FechaInventario.ToUniversalTime(),
            FechaRegistro = DateTime.UtcNow,
            UsuarioId = userId,
            UsuarioNombre = User.FindFirst("FullName")?.Value ?? userName,
            Observaciones = request.Observaciones
        };

        // Procesar cada item: buscar o crear producto
        foreach (var item in request.Items)
        {
            var nombreNorm = item.Producto.Trim();
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.AreaId == areaId && p.Nombre.ToLower() == nombreNorm.ToLower());

            if (producto == null)
            {
                // Crear producto nuevo
                producto = new Producto
                {
                    AreaId = areaId,
                    Nombre = nombreNorm,
                    UnidadMedida = item.UnidadMedida.Trim(),
                    CantidadActual = item.Cantidad,
                    Activo = true,
                    FechaCreacion = DateTime.UtcNow
                };
                _context.Productos.Add(producto);
                await _context.SaveChangesAsync(); // Para obtener ID
            }
            else
            {
                // Actualizar cantidades del producto existente
                producto.CantidadActual = item.Cantidad;
                producto.UnidadMedida = item.UnidadMedida.Trim();
            }

            inventario.Detalles.Add(new InventarioDetalle
            {
                ProductoId = producto.Id,
                NombreProducto = producto.Nombre,
                UnidadMedida = item.UnidadMedida.Trim(),
                Cantidad = item.Cantidad
            });
        }

        _context.Inventarios.Add(inventario);
        _context.Auditoria.Add(new Auditoria
        {
            UsuarioNombre = userName,
            Accion = "CARGAR_INVENTARIO",
            Entidad = "Inventario",
            EntidadId = areaId.ToString(),
            FechaHora = DateTime.UtcNow,
            Descripcion = $"Carga de inventario para área '{area?.Nombre}' con {request.Items.Count} productos"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Inventario cargado exitosamente.", inventarioId = inventario.Id });
    }

    // =================== EXPORTACIÓN ===================

    // GET: api/inventarios/exportar/excel?inventarioId=1
    [HttpGet("exportar/excel")]
    public async Task<IActionResult> ExportarExcel([FromQuery] int? inventarioId, [FromQuery] int? areaId)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios_exportar");
        if (!hasPermission && !IsAdmin()) return Forbid();

        List<InventarioDetalle> detalles;
        string areaNombre;
        DateTime fechaInventario;

        if (inventarioId.HasValue)
        {
            var inv = await _context.Inventarios
                .Include(i => i.Area)
                .Include(i => i.Detalles)
                .FirstOrDefaultAsync(i => i.Id == inventarioId.Value);

            if (inv == null) return NotFound(new { message = "Inventario no encontrado." });

            var (allowed, _) = await CheckAreaAccess(inv.AreaId);
            if (!allowed) return Forbid();

            detalles = inv.Detalles.OrderBy(d => d.NombreProducto).ToList();
            areaNombre = inv.Area?.Nombre ?? "Área";
            fechaInventario = inv.FechaInventario;
        }
        else if (areaId.HasValue)
        {
            var (allowed, area) = await CheckAreaAccess(areaId.Value);
            if (!allowed) return Forbid();

            // Inventario actual = productos vigentes
            var productos = await _context.Productos
                .Where(p => p.AreaId == areaId.Value && p.Activo)
                .OrderBy(p => p.Nombre)
                .ToListAsync();

            detalles = productos.Select(p => new InventarioDetalle
            {
                NombreProducto = p.Nombre,
                UnidadMedida = p.UnidadMedida,
                Cantidad = p.CantidadActual
            }).ToList();

            areaNombre = area?.Nombre ?? "Área";
            fechaInventario = DateTime.UtcNow;
        }
        else
        {
            return BadRequest(new { message = "Debe indicar inventarioId o areaId." });
        }

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Inventario");

        ws.Cell(1, 1).Value = $"GRUPO APOSTÓLICO OMEGA — Inventario: {areaNombre}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;

        ws.Cell(2, 1).Value = $"Fecha del inventario: {fechaInventario:yyyy-MM-dd}";
        ws.Cell(3, 1).Value = $"Reporte generado el: {DateTime.Now:yyyy-MM-dd HH:mm:ss}";

        ws.Cell(5, 1).Value = "Producto";
        ws.Cell(5, 2).Value = "Cantidad";
        ws.Cell(5, 3).Value = "Unidad de medida";

        var headerRange = ws.Range(5, 1, 5, 3);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
        headerRange.Style.Font.FontColor = XLColor.White;

        int row = 6;
        foreach (var d in detalles)
        {
            ws.Cell(row, 1).Value = d.NombreProducto;
            ws.Cell(row, 2).Value = (double)d.Cantidad;
            ws.Cell(row, 2).Style.NumberFormat.Format = "#,##0.##";
            ws.Cell(row, 3).Value = d.UnidadMedida;
            row++;
        }

        ws.Cell(row, 1).Value = "TOTAL PRODUCTOS:";
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Cell(row, 2).Value = detalles.Count;
        ws.Cell(row, 2).Style.Font.Bold = true;

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var content = stream.ToArray();

        var filename = $"Inventario_{areaNombre.Replace(" ", "_")}_{fechaInventario:yyyyMMdd}.xlsx";
        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
    }

    // GET: api/inventarios/plantilla-excel
    [HttpGet("plantilla-excel")]
    public IActionResult DescargarPlantilla()
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Inventario");

        ws.Cell(1, 1).Value = "Producto";
        ws.Cell(1, 2).Value = "Cantidad";
        ws.Cell(1, 3).Value = "Unidad de medida";

        var headerRange = ws.Range(1, 1, 1, 3);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
        headerRange.Style.Font.FontColor = XLColor.White;

        // Filas de ejemplo
        ws.Cell(2, 1).Value = "Hojas blancas";
        ws.Cell(2, 2).Value = 250;
        ws.Cell(2, 3).Value = "Pieza";

        ws.Cell(3, 1).Value = "Marcadores";
        ws.Cell(3, 2).Value = 12;
        ws.Cell(3, 3).Value = "Caja";

        ws.Cell(4, 1).Value = "Carpetas";
        ws.Cell(4, 2).Value = 35;
        ws.Cell(4, 3).Value = "Pieza";

        ws.Cell(5, 1).Value = "Papel higiénico";
        ws.Cell(5, 2).Value = 48;
        ws.Cell(5, 3).Value = "Rollo";

        ws.Cell(5 + 1, 1).Value = "Jabón líquido";
        ws.Cell(5 + 1, 2).Value = 5;
        ws.Cell(5 + 1, 3).Value = "Litro";

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var content = stream.ToArray();

        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Plantilla_Inventario_Omega.xlsx");
    }

    // POST: api/inventarios/importar-excel?areaId=1
    [HttpPost("importar-excel")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportarExcel([FromQuery] int areaId, IFormFile archivo)
    {
        var userName = GetUserName();
        var hasPermission = await _authService.HasPermissionAsync(userName, "inventarios_fisico");
        if (!hasPermission && !IsAdmin()) return Forbid();

        var (allowed, area) = await CheckAreaAccess(areaId);
        if (!allowed) return Forbid();

        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { message = "Debe seleccionar un archivo Excel." });

        try
        {
            using var stream = archivo.OpenReadStream();
            using var workbook = new XLWorkbook(stream);
            var ws = workbook.Worksheets.First();

            // Validar encabezados
            var h1 = ws.Cell(1, 1).GetString().Trim().ToLower();
            var h2 = ws.Cell(1, 2).GetString().Trim().ToLower();
            var h3 = ws.Cell(1, 3).GetString().Trim().ToLower();

            if (h1 != "producto" || h2 != "cantidad" || (h3 != "unidad de medida" && h3 != "unidad"))
                return BadRequest(new { message = "Los encabezados del archivo deben ser: Producto, Cantidad, Unidad de medida" });

            var items = new List<CargarInventarioItemRequest>();
            var errors = new List<string>();

            int row = 2;
            while (!ws.Cell(row, 1).IsEmpty() || !ws.Cell(row, 2).IsEmpty() || !ws.Cell(row, 3).IsEmpty())
            {
                var nombre = ws.Cell(row, 1).GetString().Trim();
                var cellCantidad = ws.Cell(row, 2);
                var cantidadStr = cellCantidad.GetString().Trim();
                var unidad = ws.Cell(row, 3).GetString().Trim();

                if (string.IsNullOrWhiteSpace(nombre))
                {
                    errors.Add($"Fila {row}: Nombre de producto vacío.");
                    row++;
                    continue;
                }

                decimal cantidad = 0;
                bool cantidadValida = cellCantidad.TryGetValue<decimal>(out cantidad)
                    || decimal.TryParse(cantidadStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out cantidad);

                if (!cantidadValida || cantidad < 0)
                {
                    errors.Add($"Fila {row}: Cantidad inválida '{cantidadStr}' para producto '{nombre}'.");
                    row++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(unidad))
                {
                    errors.Add($"Fila {row}: Unidad de medida vacía para producto '{nombre}'.");
                    row++;
                    continue;
                }

                items.Add(new CargarInventarioItemRequest
                {
                    Producto = nombre,
                    Cantidad = cantidad,
                    UnidadMedida = unidad
                });

                row++;
            }

            if (items.Count == 0 && errors.Count == 0)
                return BadRequest(new { message = "El archivo no contiene datos." });

            // Verificar duplicados internos
            var duplicados = items
                .GroupBy(i => i.Producto.ToLower())
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicados.Count > 0)
                errors.Add($"Productos duplicados en el archivo: {string.Join(", ", duplicados)}");

            return Ok(new
            {
                items,
                errores = errors,
                totalValidos = items.Count,
                totalErrores = errors.Count,
                areaNombre = area?.Nombre
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error al leer el archivo Excel: {ex.Message}" });
        }
    }
}
