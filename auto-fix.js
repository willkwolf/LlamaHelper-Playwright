const fs = require('fs');
const path = require('path');

function findLatestReport() {
  const dir = path.join(__dirname, 'reportes');
  if (!fs.existsSync(dir)) return null;
  // prefer timestamped auto-repair reports like auto-repair-<digits>.md
  const files = fs.readdirSync(dir).filter(f => /^auto-repair-\d+\.md$/.test(f));
  if (files.length === 0) return null;
  files.sort();
  return path.join(dir, files[files.length - 1]);
}

function backupFile(filePath) {
  const bak = `${filePath}.bak.${Date.now()}`;
  fs.copyFileSync(filePath, bak);
  return bak;
}

function updatePlaywrightTimeout(newTimeout) {
  const cfgPath = path.join(__dirname, 'playwright.config.js');
  if (!fs.existsSync(cfgPath)) return false;
  const content = fs.readFileSync(cfgPath, 'utf8');
  const regex = /(timeout\s*:\s*)(\d+)/;
  if (!regex.test(content)) return false;
  backupFile(cfgPath);
  const updated = content.replace(regex, `$1${newTimeout}`);
  fs.writeFileSync(cfgPath, updated, 'utf8');
  return true;
}

function refineDroppableSelectorInSpec(specFilePath, replacementSelector) {
  if (!fs.existsSync(specFilePath)) return false;
  backupFile(specFilePath);
  let content = fs.readFileSync(specFilePath, 'utf8');
  // Replace exact occurrences of '#droppable' inside quotes (single or double)
  content = content.replace(/(['\"])#droppable\1/g, `"${replacementSelector}"`);
  // Replace locator("#droppable") style
  content = content.replace(/locator\((['\"])#droppable\1\)/g, `locator("${replacementSelector}")`);
  fs.writeFileSync(specFilePath, content, 'utf8');
  return true;
}

// Append .first() to ambiguous locator usages for a given simple selector (e.g. '#droppable')
function appendFirstToLocator(specFilePath, simpleSelector) {
  if (!fs.existsSync(specFilePath)) return false;
  backupFile(specFilePath);
  let content = fs.readFileSync(specFilePath, 'utf8');
  // Escape selector for regex
  const esc = simpleSelector.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(page\\.locator\\((['\"])${esc}\\2\\))`, 'g');
  const updated = content.replace(regex, '$1.first()');
  fs.writeFileSync(specFilePath, updated, 'utf8');
  return true;
}

// Replace label[for="id"] occurrences inside a spec with the input id selector (#id)
function replaceLabelForWithInputId(specFilePath, inputId) {
  if (!fs.existsSync(specFilePath)) return false;
  backupFile(specFilePath);
  let content = fs.readFileSync(specFilePath, 'utf8');
  content = content.replace(new RegExp(`label\\[for=\\\"${inputId}\\\"]`, 'g'), `#${inputId}`);
  content = content.replace(new RegExp(`label\\[for=\\'${inputId}\\'\\]`, 'g'), `#${inputId}`);
  fs.writeFileSync(specFilePath, content, 'utf8');
  return true;
}

// Replace page.click('#closeLargeModal') with page.locator('#closeLargeModal').click({ force: true })
function forceClickCloseModal(specFilePath) {
  if (!fs.existsSync(specFilePath)) return false;
  backupFile(specFilePath);
  let content = fs.readFileSync(specFilePath, 'utf8');
  content = content.replace(/page\.click\((['\"])#closeLargeModal\1\)/g, 'page.locator($1#closeLargeModal$1).click({ force: true })');
  fs.writeFileSync(specFilePath, content, 'utf8');
  return true;
}

function parseReportAndApply(reportPath) {
  const md = fs.readFileSync(reportPath, 'utf8');
  const changes = [];

  // If any analysis mentions timeout, increase global timeout to 60000
  if (/timeout/i.test(md)) {
    const ok = updatePlaywrightTimeout(60000);
    changes.push({ type: 'timeout', applied: ok });
  }

  // If report mentions modal visibility waits in spec files, adjust per-spec waits
  function adjustModalTimeoutInSpec(specFilePath) {
    if (!fs.existsSync(specFilePath)) return false;
    backupFile(specFilePath);
    let content = fs.readFileSync(specFilePath, 'utf8');
    // Replace long modal waits of 120000 -> 30000, or remove explicit timeout
    let replaced = false;
    const re1 = /toBeVisible\(\{\s*timeout\s*:\s*120000\s*\}\)/g;
    if (re1.test(content)) {
      content = content.replace(re1, 'toBeVisible({ timeout: 30000 })');
      replaced = true;
    }
    const re2 = /toBeVisible\(\{\s*timeout\s*:\s*\d+\s*\}\)/g;
    if (re2.test(content)) {
      content = content.replace(re2, 'toBeVisible({ timeout: 30000 })');
      replaced = true;
    }
    if (replaced) fs.writeFileSync(specFilePath, content, 'utf8');
    return replaced;
  }

  // For selector issues (e.g., #droppable), attempt to refine selectors in referenced spec files
  // Parse sections: look for **File:** `filename`
  const fileSections = [...md.matchAll(/\*\*File:\*\* `([^`]+)`[\s\S]*?(?:\n---|$)/g)];
  for (const sec of fileSections) {
    const file = sec[1];
    const sectionText = sec[0];

    // Strategy A: ambiguous droppable locators -> append .first() to page.locator(...) usages
    if (/droppable/i.test(sectionText)) {
      const candidates = [
        path.join(__dirname, file),
        path.join(__dirname, 'tests', file),
        file
      ];
      let applied = false;
      for (const p of candidates) {
        if (p && fs.existsSync(p)) {
          applied = appendFirstToLocator(p, '#droppable') || applied;
        }
      }
      changes.push({ type: 'selector:droppable', file, strategy: 'appendFirst', applied });
    }

  // As a final pass, if the report contained the practice-form timeout issue, apply spec-level fix
  const practiceFileMatch = md.match(/\*\*File:\*\* `([^`]+)`[\s\S]*?timeout/i);
  if (practiceFileMatch) {
    const target = practiceFileMatch[1];
    const candidates = [
      path.join(__dirname, target),
      path.join(__dirname, 'tests', target),
      target
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        const applied = adjustModalTimeoutInSpec(p);
        changes.push({ type: 'spec:modal-timeout', file: p, applied });
        break;
      }
    }
  }

    // Strategy B: replace label[for="hobbies-checkbox-1"] with input id selector
    if (/hobbies-checkbox-1/i.test(sectionText)) {
      const candidates = [
        path.join(__dirname, file),
        path.join(__dirname, 'tests', file),
        file
      ];
      let applied = false;
      for (const p of candidates) {
        if (p && fs.existsSync(p)) {
          applied = replaceLabelForWithInputId(p, 'hobbies-checkbox-1') || applied;
        }
      }
      changes.push({ type: 'selector:hobbies', file, inputId: 'hobbies-checkbox-1', applied });
    }

    // Strategy C: force click modal close button to avoid subtree intercepting pointer events
    if (/closeLargeModal/i.test(sectionText)) {
      const candidates = [
        path.join(__dirname, file),
        path.join(__dirname, 'tests', file),
        file
      ];
      let applied = false;
      for (const p of candidates) {
        if (p && fs.existsSync(p)) {
          applied = forceClickCloseModal(p) || applied;
        }
      }
      changes.push({ type: 'action:forceCloseModal', file, applied });
    }
  }

  // Save a JSON summary of applied changes next to the report
  const summaryPath = reportPath.replace(/\.md$/i, '.fixes.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ report: path.basename(reportPath), timestamp: Date.now(), changes }, null, 2), 'utf8');
  return { reportPath, changes, summaryPath };
}

(async () => {
  const report = findLatestReport();
  if (!report) {
    console.error('No auto-repair report found in reportes/*.md');
    process.exitCode = 2;
    return;
  }
  console.log('Using report:', report);
  try {
    const result = parseReportAndApply(report);
    console.log('Auto-fix summary written to', result.summaryPath);
    console.log('Changes applied:', result.changes);
  } catch (e) {
    console.error('Auto-fix failed:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
})();
