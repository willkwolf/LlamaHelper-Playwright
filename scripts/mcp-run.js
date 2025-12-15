const { spawnSync } = require('child_process');

function run(cmd, args, name) {
  console.log(`\n> Running: ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.error) {
    console.error(`${name} failed to start:`, r.error.message);
    return { code: r.status || 1, error: r.error };
  }
  return { code: r.status };
}

(async () => {
  // 1) Run tests directly with Playwright (capture JSON output to test-output.json)
  console.log('\n> Running: npx playwright test --reporter=json (capturing output to test-output.json)\n');
  const { spawnSync } = require('child_process');
  const t = spawnSync('npx', ['playwright', 'test', '--reporter=json'], { shell: true, encoding: 'utf8' });
  // Save stdout to test-output.json for auto-repair
  const fs = require('fs');
  try {
    fs.writeFileSync(require('path').join(__dirname, '..', 'test-output.json'), t.stdout || '');
  } catch (e) {
    console.error('Failed to write test-output.json:', e.message);
  }
  if (t.error || t.status !== 0) {
    console.warn(`Playwright exited with code ${t.status || 1}. Continuing to auto-repair.`);
  }

  // 2) Run auto-repair (if it fails, stop)
  const repairRes = run('npm', ['run', 'auto-repair'], 'auto-repair');
  if (repairRes.code !== 0) {
    console.error(`auto-repair failed with code ${repairRes.code}. Aborting.`);
    process.exit(repairRes.code);
  }

  // 3) Run auto-fix (if it fails, stop)
  const fixRes = run('npm', ['run', 'auto-fix'], 'auto-fix');
  if (fixRes.code !== 0) {
    console.error(`auto-fix failed with code ${fixRes.code}.`);
    process.exit(fixRes.code);
  }

  console.log('\nMCP run completed.\n');
  process.exit(0);
})();
