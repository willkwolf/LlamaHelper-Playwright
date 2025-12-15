#!/bin/bash
set -euo pipefail
echo "Limpiando reportes previos..."
rm -rf reportes/* screenshots/* playwright-report/* || true

echo "Ejecutando Tests (Playwright JSON reporter)..."
# Run Playwright and capture JSON stdout separately from stderr to avoid corruption
npx playwright test --reporter=json,html > test-output.json 2> test-errors.log || true
testExit=$?
if [ $testExit -ne 0 ]; then echo "Tests finished with exit code $testExit - continuing to analysis..."; else echo "Tests finished (exit code 0)."; fi

echo "Revisando resultados y aplicando auto-repair/auto-fix si es necesario..."
node scripts/check-run-and-fix.js || true

echo "Mostrando reporte (se abrirá en el navegador). Cierre la pestaña del reporte para terminar."
# Serve the report and open a browser tab; the script exits when the tab is closed
node scripts/serve-and-watch.js || true

echo "run-tests.sh finished."
