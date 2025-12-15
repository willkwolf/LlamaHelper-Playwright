const fs = require('fs');
const path = require('path');
const aiHelper = require('./helpers/ai-helper');

async function runAutoRepair() {
    const resultsPath = path.join(__dirname, 'test-output.json');

    if (!fs.existsSync(resultsPath)) {
        console.log('No test results found (results.json). Run tests first.');
        return;
    }

    // Read results file and parse JSON robustly: Playwright test output may include
    // additional stderr lines if the caller redirected both stdout and stderr.
    const raw = fs.readFileSync(resultsPath, 'utf8');
    if (!raw || raw.trim().length === 0) {
        console.log('test-output.json is empty or not produced; skipping auto-repair.');
        return;
    }
    let results = null;
    try {
        results = JSON.parse(raw);
    } catch (err) {
        // Try to recover by trimming any trailing characters after the last '}'
        const lastBrace = raw.lastIndexOf('}');
        if (lastBrace > 0) {
            const candidate = raw.slice(0, lastBrace + 1);
            try {
                results = JSON.parse(candidate);
                console.warn('Warning: test-output.json contained extra trailing data; parsed truncated content.');
            } catch (err2) {
                console.error('Failed to parse test-output.json (even after trimming):', err2.message);
                throw err2;
            }
        } else {
            console.error('Failed to parse test-output.json:', err.message);
            throw err;
        }
    }
    const failures = [];

    // New detection logic: consider a spec failed when spec.ok is false or when any test result has non-passed status
    (results.suites || []).forEach(suite => {
        (suite.specs || []).forEach(spec => {
            // Treat flaky specs as candidates for repair as well
            const specStatus = (spec.status || '').toString().toLowerCase();
            const specIsFlaky = specStatus === 'flaky' || spec.ok === false;

            (spec.tests || []).forEach(test => {
                // Look into test.results array for any non-passed entry
                const badResults = (test.results || []).filter(r => r.status && r.status !== 'passed');

                if (badResults.length > 0) {
                    badResults.forEach(r => {
                        let errorMsg = 'Unknown error';
                        if (r.error && r.error.message) errorMsg = r.error.message;
                        else if (Array.isArray(r.errors) && r.errors[0] && r.errors[0].message) errorMsg = r.errors[0].message;

                        failures.push({
                            title: spec.title,
                            file: suite.file,
                            error: errorMsg,
                            rawResult: r,
                            flaky: false
                        });
                    });
                } else if (specIsFlaky) {
                    // No explicit failing result in this run, but the spec is marked flaky -> create a flaky entry
                    const synthesized = {
                        title: spec.title,
                        file: suite.file,
                        error: 'Spec marked as flaky (intermittent failures detected in previous runs)',
                        rawResult: (test.results && test.results[0]) || {},
                        flaky: true
                    };
                    failures.push(synthesized);
                }
            });
        });
    });

    if (failures.length === 0) {
        console.log('No failures detected. Great job!');
        return;
    }

    console.log(`Found ${failures.length} failures. Starting AI analysis...`);

    let reportContent = `# Auto-Repair Report - ${new Date().toLocaleString()}\n\n`;

    for (const failure of failures) {
        console.log(`Analyzing: ${failure.title}`);

        // Read spec file content
        // Note: suite.file path in results.json is relative to project root usually
        // but we need to be careful.
        let code = 'Code not available';
        try {
            // suite.file might be "tests/01-text-box.spec.js"
            // First try relative to project root, then tests folder
            const possiblePaths = [
                path.join(__dirname, failure.file),
                path.join(__dirname, 'tests', failure.file),
                failure.file
            ];
            for (const p of possiblePaths) {
                if (!p) continue;
                try {
                    if (fs.existsSync(p)) {
                        code = fs.readFileSync(p, 'utf8');
                        break;
                    }
                } catch (e) {
                    // ignore
                }
            }
        } catch (e) {
            console.error(`Could not read file ${failure.file}: ${e.message}`);
        }

        const analysis = await aiHelper.analyzeError(code, failure.error);

        reportContent += `## Test: ${failure.title}\n`;
        reportContent += `**File:** \`${failure.file}\`\n\n`;
        reportContent += `**Error:**\n\`\`\`\n${failure.error}\n\`\`\`\n\n`;
        reportContent += `**AI Analysis:**\n${analysis}\n\n`;

        // If error mentions selector or timeout, try to extract selector and ask AI for alternatives
        if (failure.error && (failure.error.includes('selector') || failure.error.toLowerCase().includes('timeout') || (failure.rawResult && failure.rawResult.error && failure.rawResult.error.message && failure.rawResult.error.message.toLowerCase().includes('selector')))) {
            // Try multiple patterns to find selector
            const patterns = [/locator\(['"](.+?)['"]\)/i, /selector ['"](.+?)['"]/i, /waiting for locator\(['"](.+?)['"]\)/i];
            let matched = null;
            for (const pat of patterns) {
                const m = (failure.rawResult && failure.rawResult.error && failure.rawResult.error.message) ? failure.rawResult.error.message.match(pat) : (failure.error.match ? failure.error.match(pat) : null);
                if (m) { matched = m[1]; break; }
            }
            if (matched) {
                const suggestions = await aiHelper.suggestSelector(matched);
                reportContent += `**Suggested Selectors:**\n${suggestions}\n\n`;
            }
        }

        reportContent += `---\n\n`;
    }

    const reportPath = path.join(__dirname, 'reportes', `auto-repair-${Date.now()}.md`);
    fs.writeFileSync(reportPath, reportContent);
    console.log(`Report generated: ${reportPath}`);
}

runAutoRepair();
