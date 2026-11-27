using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmegaTesoreria.Api.DTOs;
using OmegaTesoreria.Api.Services;

namespace OmegaTesoreria.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VentasController : ControllerBase
{
    private readonly IVentasService _ventasService;
    private readonly IAuthService _authService;

    public VentasController(IVentasService ventasService, IAuthService authService)
    {
        _ventasService = ventasService;
        _authService = authService;
    }

    private string GetCurrentUserName() => User.Identity?.Name ?? "Sistema";
    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : 1;
    }

    [HttpGet]
    public async Task<IActionResult> GetVentas()
    {
        var ventas = await _ventasService.GetVentasAsync();
        return Ok(ventas);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetVentaById(int id)
    {
        var venta = await _ventasService.GetVentaByIdAsync(id);
        if (venta == null) return NotFound(new { message = "Venta no encontrada." });
        return Ok(venta);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVenta([FromBody] CreateVentaRequest request)
    {
        try
        {
            var venta = await _ventasService.CreateVentaAsync(request, GetCurrentUserName());
            return Ok(venta);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateVenta(int id, [FromBody] UpdateVentaRequest request)
    {
        try
        {
            var success = await _ventasService.UpdateVentaAsync(id, request, GetCurrentUserName());
            if (!success) return BadRequest(new { message = "No se puede editar una venta cerrada o inexistente." });
            return Ok(new { message = "Venta actualizada exitosamente." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVenta(int id)
    {
        try
        {
            var success = await _ventasService.DeleteVentaAsync(id, GetCurrentUserName());
            if (!success) return BadRequest(new { message = "No se puede eliminar la venta." });
            return Ok(new { message = "Venta eliminada exitosamente." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Productos y Presentaciones
    [HttpPost("{id}/productos")]
    public async Task<IActionResult> SaveProducto(int id, [FromQuery] int? productoId, [FromBody] CreateOrUpdateProductoRequest request)
    {
        try
        {
            var prod = await _ventasService.SaveProductoAsync(id, productoId, request, GetCurrentUserName());
            return Ok(prod);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}/productos/{productoId}")]
    public async Task<IActionResult> DeleteProducto(int id, int productoId)
    {
        try
        {
            var success = await _ventasService.DeleteProductoAsync(id, productoId, GetCurrentUserName());
            if (!success) return BadRequest(new { message = "No se puede eliminar el producto." });
            return Ok(new { message = "Producto eliminado exitosamente." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Pedidos
    [HttpPost("{id}/pedidos")]
    public async Task<IActionResult> CreatePedido(int id, [FromBody] CreatePedidoRequest request)
    {
        try
        {
            var pedido = await _ventasService.CreatePedidoAsync(id, request, GetCurrentUserName());
            return Ok(pedido);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/pedidos/{pedidoId}")]
    public async Task<IActionResult> UpdatePedido(int id, int pedidoId, [FromBody] CreatePedidoRequest request)
    {
        try
        {
            var pedido = await _ventasService.UpdatePedidoAsync(id, pedidoId, request, GetCurrentUserName());
            return Ok(pedido);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/pedidos/{pedidoId}/estado-entrega")]
    public async Task<IActionResult> UpdateEstadoEntrega(int id, int pedidoId, [FromBody] UpdateEstadoEntregaRequest request)
    {
        try
        {
            if (!await _authService.HasPermissionAsync(GetCurrentUserName(), "ventas"))
                return StatusCode(403, new { message = "No tienes permiso para modificar pedidos en Ventas." });

            var success = await _ventasService.UpdateEstadoEntregaAsync(id, pedidoId, request, GetCurrentUserName());
            if (!success) return BadRequest(new { message = "No se pudo actualizar el estado del pedido." });
            return Ok(new { message = "Estado de entrega actualizado." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/pedidos/{pedidoId}/metodo-pago")]
    public async Task<IActionResult> UpdateMetodoPagoRapido(int id, int pedidoId, [FromBody] UpdateMetodoPagoRapidoRequest request)
    {
        try
        {
            if (!await _authService.HasPermissionAsync(GetCurrentUserName(), "ventas"))
                return StatusCode(403, new { message = "No tienes permiso para modificar el método de pago en Ventas." });

            var updated = await _ventasService.UpdateMetodoPagoRapidoAsync(id, pedidoId, request, GetCurrentUserName());
            return Ok(updated);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/pedidos/{pedidoId}/cancelar")]
    public async Task<IActionResult> CancelarPedido(int id, int pedidoId)
    {
        try
        {
            var success = await _ventasService.CancelarPedidoAsync(id, pedidoId, GetCurrentUserName());
            if (!success) return BadRequest(new { message = "No se pudo cancelar el pedido." });
            return Ok(new { message = "Pedido cancelado exitosamente." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Realizar Entrada a Tesorería
    [HttpPost("{id}/realizar-entrada")]
    public async Task<IActionResult> RealizarEntrada(int id, [FromBody] RealizarEntradaVentaRequest request)
    {
        try
        {
            var userName = GetCurrentUserName();
            if (!await _authService.HasPermissionAsync(userName, "entradas"))
            {
                return StatusCode(403, new { message = "No tienes permiso para realizar entradas en Tesorería." });
            }

            var result = await _ventasService.RealizarEntradaAsync(id, request, GetCurrentUserId(), userName);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
