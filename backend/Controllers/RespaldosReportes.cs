using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OmegaTesoreria.Api.Data;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrador")]
public class RespaldosController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly AppDbContext _context;
    private readonly string _dbPath;
    private readonly string _backupsDir;

    public RespaldosController(IConfiguration config, AppDbContext context)
    {
        _config = config;
        _context = context;
        _dbPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../database/tesoreria.db"));
        _backupsDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../backups"));

        if (!Directory.Exists(_backupsDir))
            Directory.CreateDirectory(_backupsDir);
    }

    public record RespaldoInfoDto(string NombreArchivo, long TamanoBytes, DateTime FechaCreacion);

    [HttpGet]
    public IActionResult GetRespaldos()
    {
        if (!Directory.Exists(_backupsDir))
            return Ok(new List<RespaldoInfoDto>());

        var files = Directory.GetFiles(_backupsDir, "*.db")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.CreationTime)
            .Select(f => new RespaldoInfoDto(f.Name, f.Length, f.CreationTime))
            .ToList();

        return Ok(files);
    }

    [HttpPost("crear")]
    public IActionResult CrearRespaldo()
    {
        if (!System.IO.File.Exists(_dbPath))
            return BadRequest(new { message = "El archivo de base de datos actual no existe aún." });

        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var backupFileName = $"tesoreria_backup_{timestamp}.db";
        var destPath = Path.Combine(_backupsDir, backupFileName);

        // Copia segura
        System.IO.File.Copy(_dbPath, destPath, overwrite: false);

        var fi = new FileInfo(destPath);
        return Ok(new RespaldoInfoDto(fi.Name, fi.Length, fi.CreationTime));
    }

    [HttpGet("descargar/{nombreArchivo}")]
    public IActionResult DescargarRespaldo(string nombreArchivo)
    {
        var filePath = Path.Combine(_backupsDir, nombreArchivo);
        if (!System.IO.File.Exists(filePath))
            return NotFound();

        var bytes = System.IO.File.ReadAllBytes(filePath);
        return File(bytes, "application/octet-stream", nombreArchivo);
    }

    public record RestaurarRequest(string NombreArchivo);

    [HttpPost("restaurar")]
    public IActionResult RestaurarRespaldo([FromBody] RestaurarRequest req)
    {
        var backupPath = Path.Combine(_backupsDir, req.NombreArchivo);
        if (!System.IO.File.Exists(backupPath))
            return NotFound(new { message = "El archivo de respaldo seleccionado no existe." });

        // Crear respaldo preventivo de seguridad antes de sobreescribir
        if (System.IO.File.Exists(_dbPath))
        {
            var preRestoreBackup = Path.Combine(_backupsDir, $"pre_restore_backup_{DateTime.Now:yyyyMMdd_HHmmss}.db");
            System.IO.File.Copy(_dbPath, preRestoreBackup, overwrite: true);
        }

        System.IO.File.Copy(backupPath, _dbPath, overwrite: true);
        return Ok(new { message = "Base de datos restaurada exitosamente desde el respaldo." });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITesoreriaService _tesoreria;

    public ReportesController(AppDbContext context, ITesoreriaService tesoreria)
    {
        _context = context;
        _tesoreria = tesoreria;
    }

    [HttpGet("excel/general")]
    public async Task<IActionResult> ExportExcelGeneral()
    {
        var cajas = await _tesoreria.GetCajasAsync(includeInactive: true);
        var ops = await _context.Operaciones
            .Include(o => o.CajaOrigen)
            .Include(o => o.CajaDestino)
            .OrderByDescending(o => o.FechaRegistro)
            .Take(500)
            .ToListAsync();

        using var workbook = new XLWorkbook();

        // Hoja 1: Resumen de Cajas
        var wsCajas = workbook.Worksheets.Add("Cajas y Saldos");
        wsCajas.Cell(1, 1).Value = "GRUPO APOSTÓLICO OMEGA - CONTROL DE TESORERÍA";
        wsCajas.Cell(1, 1).Style.Font.Bold = true;
        wsCajas.Cell(1, 1).Style.Font.FontSize = 14;

        wsCajas.Cell(2, 1).Value = $"Reporte generado el: {DateTime.Now:yyyy-MM-dd HH:mm:ss}";
        wsCajas.Cell(4, 1).Value = "ID";
        wsCajas.Cell(4, 2).Value = "Caja";
        wsCajas.Cell(4, 3).Value = "Finalidad";
        wsCajas.Cell(4, 4).Value = "Estado";
        wsCajas.Cell(4, 5).Value = "Saldo Actual (MXN)";
        wsCajas.Cell(4, 6).Value = "Último Conteo";

        var headerRange = wsCajas.Range(4, 1, 4, 6);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
        headerRange.Style.Font.FontColor = XLColor.White;

        int row = 5;
        foreach (var c in cajas)
        {
            wsCajas.Cell(row, 1).Value = c.Id;
            wsCajas.Cell(row, 2).Value = c.Nombre;
            wsCajas.Cell(row, 3).Value = c.Finalidad;
            wsCajas.Cell(row, 4).Value = c.Activa ? "Activa" : "Inactiva";
            wsCajas.Cell(row, 5).Value = (double)c.SaldoActual;
            wsCajas.Cell(row, 5).Style.NumberFormat.Format = "$#,##0.00";
            wsCajas.Cell(row, 6).Value = c.UltimoConteoFecha?.ToString("yyyy-MM-dd HH:mm") ?? "Sin conteo";
            row++;
        }

        wsCajas.Cell(row, 4).Value = "TOTAL PATRIMONIO:";
        wsCajas.Cell(row, 4).Style.Font.Bold = true;
        wsCajas.Cell(row, 5).Value = (double)cajas.Where(c => c.Activa).Sum(c => c.SaldoActual);
        wsCajas.Cell(row, 5).Style.Font.Bold = true;
        wsCajas.Cell(row, 5).Style.NumberFormat.Format = "$#,##0.00";
        wsCajas.Columns().AdjustToContents();

        // Hoja 2: Operaciones Históricas
        var wsOps = workbook.Worksheets.Add("Operaciones");
        wsOps.Cell(1, 1).Value = "ID";
        wsOps.Cell(1, 2).Value = "Tipo";
        wsOps.Cell(1, 3).Value = "Fecha";
        wsOps.Cell(1, 4).Value = "Origen";
        wsOps.Cell(1, 5).Value = "Destino";
        wsOps.Cell(1, 6).Value = "Importe (MXN)";
        wsOps.Cell(1, 7).Value = "Concepto";
        wsOps.Cell(1, 8).Value = "Usuario";
        wsOps.Cell(1, 9).Value = "Estado";

        var opsHeader = wsOps.Range(1, 1, 1, 9);
        opsHeader.Style.Font.Bold = true;
        opsHeader.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
        opsHeader.Style.Font.FontColor = XLColor.White;

        int opRow = 2;
        foreach (var op in ops)
        {
            wsOps.Cell(opRow, 1).Value = op.Id;
            wsOps.Cell(opRow, 2).Value = op.TipoOperacion;
            wsOps.Cell(opRow, 3).Value = op.FechaOperacion.ToString("yyyy-MM-dd HH:mm");
            wsOps.Cell(opRow, 4).Value = op.CajaOrigen?.Nombre ?? "-";
            wsOps.Cell(opRow, 5).Value = op.CajaDestino?.Nombre ?? "-";
            wsOps.Cell(opRow, 6).Value = (double)op.Importe;
            wsOps.Cell(opRow, 6).Style.NumberFormat.Format = "$#,##0.00";
            wsOps.Cell(opRow, 7).Value = op.Concepto;
            wsOps.Cell(opRow, 8).Value = op.UsuarioNombre;
            wsOps.Cell(opRow, 9).Value = op.Estado;
            opRow++;
        }
        wsOps.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var content = stream.ToArray();

        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Omega_Tesoreria_General_{DateTime.Now:yyyyMMdd}.xlsx");
    }
}
