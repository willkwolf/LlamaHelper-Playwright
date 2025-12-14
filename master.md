# PLAN DE EJECUCIÓN: AUTOMATIZACIÓN CLOUD & GENAI

## METADATA DEL PROYECTO
- **Nombre:** reto-testing-demoqa
- **Stack:** Node.js (v18+), Playwright, Ollama (Llama 3.2), VS Code MCP.
- **Base URL:** https://demoqa.com
- **Objetivo:** Automatización E2E con auto-reparación vía IA.

---

## FASE 1: INFRAESTRUCTURA Y CONFIGURACIÓN

### Tarea 1.1: Inicialización del Proyecto
**Acción:** Configurar sistema de archivos y dependencias.
**Pasos:**
1. Crear directorio raíz `reto-testing-demoqa`.
2. Ejecutar `npm init -y`.
3. Instalar dependencias de desarrollo:
   - `npm i -D @playwright/test playwright node-fetch`
4. Ejecutar instalación de binarios:
   - `npx playwright install --with-deps`
5. Crear estructura de carpetas:
   - `tests/`, `helpers/`, `screenshots/`, `reportes/`.
6. Crear `.gitignore`:
   - Incluir: `node_modules/`, `test-results/`, `playwright-report/`, `.env`.

### Tarea 1.2: Validación del Motor de IA (Ollama)
**Acción:** Asegurar disponibilidad del modelo local.
**Pasos:**
1. Iniciar servidor Ollama.
2. Ejecutar comando de verificación: `ollama list`.
3. Si `llama3.2` no existe, ejecutar: `ollama pull llama3.2`.
4. Prueba de humo: `curl -X POST http://localhost:11434/api/generate -d '{"model": "llama3.2", "prompt": "Hello", "stream": false}'`.

### Tarea 1.3: Configuración MCP en VS Code
**Acción:** Habilitar entorno para Agente.
**Pasos:**
1. Crear carpeta `.vscode`.
2. Crear archivo `.vscode/settings.json` con contenido:
   - Habilitar `github.copilot.editor.enableAutoCompletions`.
   - Habilitar `github.copilot.chat.runCommand`.

### Tarea 1.4: Configuración Global de Playwright
**Acción:** Definir estrategias de ejecución y reportes.
**Archivo:** `playwright.config.js`
**Requisitos:**
- `testDir`: './tests'
- `timeout`: 30000
- `retries`: 2
- `reporter`: [['html'], ['json', { outputFile: 'results.json' }]]
- `use`:
  - `baseURL`: 'https://demoqa.com'
  - `screenshot`: 'only-on-failure'
  - `video`: 'retain-on-failure'

---

## FASE 2: IMPLEMENTACIÓN DE TESTS (CORE)

### Tarea 2.1: Test Text Box
**Archivo:** `tests/01-text-box.spec.js`
**Flujo:**
1. `test('Fill Text Box', async ({ page }) => { ... })`
2. Ir a `/text-box`.
3. Llenar inputs: `#userName`, `#userEmail`, `#currentAddress`, `#permanentAddress`.
4. Click `#submit`.
5. Aserción: `#output` debe ser visible.
6. Screenshot: `page.screenshot({ path: 'screenshots/text-box-result.png' })`.

### Tarea 2.2: Test Practice Form
**Archivo:** `tests/02-practice-form.spec.js`
**Flujo:**
1. Ir a `/automation-practice-form`.
2. Llenar inputs estándar (Name, Email, Mobile).
3. Manejar DatePicker: Click input -> Click día específico.
4. Manejar Dropdowns (React Select): Click container -> Press 'Enter' o Click opción.
5. Click `#submit`.
6. Aserción: `.modal-content` visible.
7. Screenshot del modal.
8. Cerrar modal `#closeLargeModal`.

### Tarea 2.3: Test Drag and Drop
**Archivo:** `tests/03-drag-drop.spec.js`
**Flujo:**
1. Ir a `/droppable`.
2. Validar texto inicial "Drop here".
3. Ejecutar `page.dragAndDrop('#draggable', '#droppable')`.
4. Validar texto final "Dropped!".
5. Validar cambio de color (CSS background-color).

---

## FASE 3: INTELIGENCIA ARTIFICIAL Y AUTO-REPARACIÓN

### Tarea 3.1: Helper de IA
**Archivo:** `helpers/ai-helper.js`
**Responsabilidad:** Interfaz con Ollama.
**Funciones:**
1. `analizarError(testCode, errorMessage)`:
   - POST a `http://localhost:11434/api/generate`.
   - Prompt: Contexto + Código + Error + "Explica por qué falló".
2. `sugerirSelector(badSelector)`:
   - Prompt: "Sugiere 3 selectores Playwright alternativos para [selector]".

### Tarea 3.2: Motor de Auto-Reparación
**Archivo:** `auto-repair.js`
**Flujo:**
1. Ejecutar tests generando JSON: `npx playwright test --reporter=json > results.json`.
2. Parsear `results.json` buscando `status: "failed"`.
3. Para cada fallo:
   - Leer código fuente del spec.
   - Extraer mensaje de error.
   - Invocar `aiHelper.analizarError()`.
   - Invocar `aiHelper.sugerirSelector()` (si es error de timeout/selector).
4. Generar reporte Markdown en `reportes/auto-repair-[FECHA].md`.

---

## FASE 4: EXTENSIÓN Y CIERRE

### Tarea 4.1: Tests de Cobertura Extendida
**Archivos:** `tests/04-alerts.spec.js`, `tests/05-bookstore.spec.js`
1. **Alerts:**
   - Usar `page.on('dialog', dialog => dialog.accept())`.
   - Trigger buttons: `#alertButton`, `#timerAlertButton`, `#confirmButton`, `#promtButton`.
2. **Book Store:**
   - Ir a `/books`.
   - Llenar `#searchBox`.
   - Validar que la tabla contiene el libro buscado.

### Tarea 4.2: Script de Orquestación
**Archivo:** `run-tests.sh`
**Script:**
```bash
#!/bin/bash
echo "Limpiando reportes previos..."
rm -rf reportes/* screenshots/* playwright-report/*

echo "Ejecutando Tests..."
# Ejecuta tests y continua aunque fallen para permitir el análisis
npx playwright test --reporter=json,html > test-output.json || true

echo "Analizando resultados con IA..."
node auto-repair.js

echo "Abriendo reporte..."
npx playwright show-report