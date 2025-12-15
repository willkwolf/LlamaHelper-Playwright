Write-Host "Limpiando reportes previos..."
Remove-Item -Path "reportes\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "screenshots\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "playwright-report\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Ejecutando Tests (Playwright JSON reporter)..."
# Use cmd.exe to run with stdout/stderr redirection similar to the .sh flow
$cmd = 'npx playwright test --reporter=json,html > test-output.json 2> test-errors.log'
Write-Host "Running: $cmd"
cmd /c $cmd
$testExit = $LASTEXITCODE
if ($testExit -ne 0) { Write-Host ("Tests finished with exit code {0} - continuing to analysis..." -f $testExit) } else { Write-Host 'Tests finished (exit code 0).' }

Write-Host "Revisando resultados y aplicando auto-repair/auto-fix si es necesario..."
try {
	node .\scripts\check-run-and-fix.js
} catch {
	Write-Host "check-run-and-fix.js failed: $($_.Exception.Message)"
}

Write-Host "Mostrando reporte (se abrirá en el navegador). Cierre la pestaña del reporte para terminar."
try {
	node .\scripts\serve-and-watch.js
} catch {
	Write-Host "serve-and-watch.js failed to start: $($_.Exception.Message)"
}

Write-Host "run-tests.ps1 finished."
