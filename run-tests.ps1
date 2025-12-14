Write-Host "Limpiando reportes previos..."
Remove-Item -Path "reportes\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "screenshots\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "playwright-report\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Ejecutando Tests..."
# Ejecuta tests y continua aunque fallen para permitir el análisis
# Redirige solo stdout (que contiene el JSON reporter) a `test-output.json` para evitar
# que mensajes de stderr corrompan el JSON.
npm run test | Out-File test-output.json -Encoding UTF8
$testExit = $LASTEXITCODE
if ($testExit -ne 0) { Write-Host ("Tests finished with exit code {0} - continuing to analysis..." -f $testExit) }

Write-Host "Analizando resultados con IA..."
node auto-repair.js

Write-Host "Aplicando correcciones sugeridas..."
node auto-fix.js

Write-Host "Abriendo reporte..."
try {
	npm run report -- --port 0
} catch {
	Write-Host "Could not open Playwright HTML report viewer (port in use or other error): $($_.Exception.Message)"
}
