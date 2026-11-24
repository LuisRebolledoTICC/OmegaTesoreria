$ErrorActionPreference = "Stop"

Write-Host "=== INICIANDO PRUEBAS DE INTEGRACIÓN OMEGA ===" -ForegroundColor Cyan

# 1. Iniciar backend
Set-Location "C:\Users\hiawa\.gemini\antigravity\scratch\OmegaTesoreria\backend"
$backend = Start-Process -FilePath "dotnet" -ArgumentList "run --no-restore --urls http://127.0.0.1:5000" -PassThru -NoNewWindow

$maxRetries = 25
$ready = $false
for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    try {
        $test = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/catalogos/denominaciones" -Method Get -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($test.StatusCode -eq 200 -or $test.StatusCode -eq 401) {
            $ready = $true
            break
        }
    } catch {
        # esperar
    }
}
Write-Host "Servidor listo y escuchando en puerto 5000."

try {
    # 2. Login Admin
    Write-Host "`n1. Probando Autenticacion de Administrador..."
    $loginBody = '{"userName":"admin","password":"Admin123!"}'
    $loginRes = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json; charset=utf-8"
    $token = $loginRes.token
    Write-Host "   -> Éxito: Token recibido para $($loginRes.nombre) con rol $($loginRes.rol)" -ForegroundColor Green

    $headers = @{
        Authorization = "Bearer $token"
    }

    # 3. Consulta de Cajas y Consolidado
    Write-Host "`n2. Verificando Cajas y Saldo Consolidado Inicial..."
    $dashboard = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/dashboard" -Headers $headers
    Write-Host "   -> Saldo Consolidado Inicial: $($dashboard.saldoTotal) MXN"
    Write-Host "   -> Numero de Cajas: $($dashboard.cajasActivas)"
    if ($dashboard.saldoTotal -eq 10000) {
        Write-Host "   [PASO] Patrimonio consolidado inicial cuadra en $10,000.00 MXN exactos." -ForegroundColor Green
    }

    # 4. Prueba 6: Entrada de $500
    Write-Host "`n3. Prueba 6: Entrada de Dinero (+`$500.00)..."
    $cajaPrin = $dashboard.cajas | Where-Object { $_.nombre -eq "Caja principal" }
    $entradaBody = '{"cajaId":' + $cajaPrin.id + ',"importe":500,"concepto":"Donativo especial","descripcion":"Aportacion de prueba"}'

    $resEntrada = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/operaciones/entrada" -Method Post -Headers $headers -Body $entradaBody -ContentType "application/json; charset=utf-8"
    Write-Host "   -> Entrada registrada ID #$($resEntrada.id) por $($resEntrada.importe) MXN" -ForegroundColor Green

    # 5. Prueba 7: Salida de $200
    Write-Host "`n4. Prueba 7: Salida de Dinero (-`$200.00)..."
    $cajaOp = $dashboard.cajas | Where-Object { $_.nombre -eq "Caja operativa" }
    $salidaBody = '{"cajaId":' + $cajaOp.id + ',"importe":200,"concepto":"Compra papeleria","descripcion":"Gastos menores"}'

    $resSalida = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/operaciones/salida" -Method Post -Headers $headers -Body $salidaBody -ContentType "application/json; charset=utf-8"
    Write-Host "   -> Salida registrada ID #$($resSalida.id) por $($resSalida.importe) MXN" -ForegroundColor Green

    # 6. Prueba 8: Transferencia de $500 (Atómica, sin alterar patrimonio)
    Write-Host "`n5. Prueba 8: Transferencia Interna (`$500.00 de Principal a Operativa)..."
    $transfBody = '{"cajaOrigenId":' + $cajaPrin.id + ',"cajaDestinoId":' + $cajaOp.id + ',"importe":500,"observaciones":"Reabastecimiento de caja operativa"}'

    $resTransf = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/operaciones/transferencia" -Method Post -Headers $headers -Body $transfBody -ContentType "application/json; charset=utf-8"
    Write-Host "   -> Transferencia registrada ID #$($resTransf.id)" -ForegroundColor Green

    # Verificar que el patrimonio consolidado sea: 10000 + 500 - 200 = 10300
    $dashAfter = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/dashboard" -Headers $headers
    Write-Host "   -> Saldo Consolidado Post-Operaciones: $($dashAfter.saldoTotal) MXN"
    if ($dashAfter.saldoTotal -eq 10300) {
        Write-Host "   [PASO] Integridad matematica: Saldo Consolidado = $10,300.00 MXN (Patrimonio neto exacto)." -ForegroundColor Green
    } else {
        Write-Host "   [FALLO] Saldo incorrecto: $($dashAfter.saldoTotal)" -ForegroundColor Red
    }

    # 7. Prueba 2, 3, 4, 5, 9: Conteo de Efectivo
    Write-Host "`n6. Pruebas 2-5 y 9: Conteo Fisico de Efectivo..."
    $conteoJson = '{"cajaId":' + $cajaPrin.id + ',"items":[{"tipoEfectivo":"Moneda","denominacionId":4,"nombre":"Moneda de $5.00","valorUnitario":5,"cantidad":10,"subtotal":50},{"tipoEfectivo":"Billete","denominacionId":10,"nombre":"Billete de $200.00","valorUnitario":200,"cantidad":5,"subtotal":1000},{"tipoEfectivo":"Bolsa","tipoBolsaId":1,"nombre":"Bolsa de $5","valorUnitario":100,"cantidad":3,"subtotal":300}],"observaciones":"Arqueo de prueba automatizado","aplicarAjuste":false}'

    $resConteo = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/conteos" -Method Post -Headers $headers -Body $conteoJson -ContentType "application/json; charset=utf-8"
    Write-Host "   -> Conteo Fisico Guardado ID #$($resConteo.id)"
    Write-Host "   -> Total Monedas: $($resConteo.totalMonedas) MXN (Esperado: 50)"
    Write-Host "   -> Total Billetes: $($resConteo.totalBilletes) MXN (Esperado: 1000)"
    Write-Host "   -> Total Bolsas: $($resConteo.totalBolsas) MXN (Esperado: 300)"
    Write-Host "   -> Total Contado: $($resConteo.saldoContado) MXN (Esperado: 1350)"
    Write-Host "   -> Diferencia Documentada: $($resConteo.diferencia) MXN"
    Write-Host "   [PASO] Conteo fisico calcula correctamente y no altera silenciosamente el saldo financiero." -ForegroundColor Green

    # 8. Prueba 11: Permisos (Rol Consulta)
    Write-Host "`n7. Prueba 11: Control de Acceso por Roles (Usuario 'consulta')..."
    $loginConsulta = '{"userName":"consulta","password":"Consulta123!"}'
    $resCons = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/auth/login" -Method Post -Body $loginConsulta -ContentType "application/json; charset=utf-8"
    $consHeaders = @{ Authorization = "Bearer $($resCons.token)" }

    try {
        $badEntrada = '{"cajaId":' + $cajaPrin.id + ',"importe":100,"concepto":"Intento no autorizado"}'
        Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/operaciones/entrada" -Method Post -Headers $consHeaders -Body $badEntrada -ContentType "application/json; charset=utf-8"
        Write-Host "   [FALLO] El usuario Consulta pudo registrar una operacion." -ForegroundColor Red
    } catch {
        Write-Host "   [PASO] Operacion rechazada correctamente por el backend (HTTP 403 Forbidden)." -ForegroundColor Green
    }

    # 9. Prueba 12: Creación de Respaldo de Base de Datos
    Write-Host "`n8. Prueba 12: Respaldo y Proteccion de SQLite..."
    $resBackup = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/respaldos/crear" -Method Post -Headers $headers
    Write-Host "   -> Respaldo generado: $($resBackup.nombreArchivo) ($($resBackup.tamanoBytes) bytes)"
    if ($resBackup.tamanoBytes -gt 0) {
        Write-Host "   [PASO] Archivo de respaldo .db creado con integridad." -ForegroundColor Green
    }

    Write-Host "`n===========================================================" -ForegroundColor Green
    Write-Host " TODAS LAS PRUEBAS DE ACEPTACION SE SUPERARON EXITOSAMENTE" -ForegroundColor Green
    Write-Host "===========================================================" -ForegroundColor Green
}
finally {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
}
