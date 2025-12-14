#!/bin/bash
set -euo pipefail
echo "Limpiando reportes previos..."
rm -rf reportes/* screenshots/* playwright-report/* || true

echo "Ejecutando Tests..."
# Ejecuta tests y continua aunque fallen para permitir el análisis
npm run test > test-output.json
testExit=$?
if [ $testExit -ne 0 ]; then echo "Tests finished with exit code $testExit - continuing to analysis..."; fi

echo "Analizando resultados con IA..."
node auto-repair.js || true

echo "Aplicando correcciones sugeridas..."
node auto-fix.js || true

echo "Abriendo reporte..."
npm run report --port 0 || true
