const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const projectRoot = path.resolve(__dirname, '../..');
const files = [
  'tests/catalogue-v2/global.d.ts',
  ...['types','http','librivox','gutenberg','google-books','open-library','internet-archive','amazon-creators','registry']
    .map(name => `server/services/catalogue-v2/${name}.ts`),
];
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'accessibooks-catalogue-test-'));
try {
  const compiler = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const local = path.join(projectRoot, 'node_modules', '.bin', compiler);
  const compile = spawnSync(fs.existsSync(local) ? local : compiler,
    ['--target','ES2022','--module','commonjs','--moduleResolution','node','--lib','ES2022,DOM',
      '--strict','--skipLibCheck','--outDir',folder,...files], { cwd: projectRoot, stdio: 'inherit', shell: false });
  if (compile.status !== 0) process.exit(compile.status || 1);
  const csvCompile = spawnSync(fs.existsSync(local) ? local : compiler,
    ['--target','ES2022','--module','commonjs','--moduleResolution','node','--lib','ES2022,DOM',
      '--strict','--skipLibCheck','--outDir',folder,'client/src/lib/goodreads-export.ts'],
    { cwd: projectRoot, stdio: 'inherit', shell: false });
  if (csvCompile.status !== 0) process.exit(csvCompile.status || 1);
  const result = spawnSync(process.execPath,
    ['--test', 'tests/catalogue-v2/adapters.test.cjs', 'tests/catalogue-v2/goodreads-export.test.cjs'], {
    cwd: projectRoot, stdio: 'inherit', env: { ...process.env, CATALOGUE_BUILD: folder },
  });
  process.exitCode = result.status || (result.error ? 1 : 0);
} finally {
  fs.rmSync(folder, { force: true, recursive: true });
}
