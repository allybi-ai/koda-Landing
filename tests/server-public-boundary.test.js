'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { spawn, spawnSync } = require('node:child_process');
const { after, before, test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE_PATHS = [
  '/audit/homepage-source-provenance/hero.bundle',
  '/audit/homepage-source-provenance/findgap.bundle',
  '/audit/homepage-source-provenance/flow.bundle',
  '/audit/homepage-source-provenance/legal.bundle'
];

let origin;
let server;
let serverOutput = '';

before(async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), BASE_DIR: ROOT },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => { serverOutput += chunk; });
  server.stderr.on('data', (chunk) => { serverOutput += chunk; });
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode == null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
});

test('real server returns 404 for provenance bundles and normalized audit-path variants', async () => {
  const legitimatePaths = [
    '/assets/images/google-drive-icon.svg',
    '/assets/homepage-coordinator.js'
  ];
  const deniedPaths = [
    ...BUNDLE_PATHS,
    '/server/contact.js',
    '/package.json',
    '/package-lock.json',
    '/Dockerfile',
    '/README.md',
    '/docs/DEPLOY-HANDOFF.md',
    '/scripts/verify-release.cjs',
    '/server.js',
    '/node_modules/nodemailer/package.json',
    '/.env',
    '/%2eenv',
    '/%61udit/homepage-source-provenance/hero.bundle',
    '/audit%2Fhomepage-source-provenance%2Fhero.bundle',
    '/assets/%2e%2e/audit/homepage-source-provenance/hero.bundle',
    '/assets/landing-shots/../../audit/homepage-source-provenance/hero.bundle',
    '/AUDIT/homepage-source-provenance/hero.bundle',
    '/audit/homepage-source-provenance/hero.bundle?download=1'
  ];

  const legitimate = await Promise.all(legitimatePaths.map(request));
  assert.deepEqual(legitimate.map((response) => response.status), [200, 200]);

  const denied = await Promise.all(deniedPaths.map(request));
  for (const [index, response] of denied.entries()) {
    assert.equal(response.status, 404, `${deniedPaths[index]} must look absent`);
    assert.doesNotMatch(response.body.subarray(0, 64).toString('utf8'), /git bundle/i);
  }
});

test('malformed percent and NUL paths return 400 without terminating the server', async () => {
  for (const pathname of ['/%00', '/%E0%A4%A', '/%FF']) {
    const response = await request(pathname);
    assert.equal(response.status, 400, `${pathname} must be rejected as malformed`);
    assert.equal(response.body.toString('utf8'), '<h1>400 Bad Request</h1>');
  }

  const health = await request('/');
  assert.equal(health.status, 200);
  assert.equal(server.exitCode, null);
});

test('Docker packaging context excludes provenance receipts while retaining runtime assets', () => {
  assertPackagingManifest('.dockerignore');
});

test('Cloud packaging context continues to exclude provenance receipts', () => {
  assertPackagingManifest('.gcloudignore');
});

function assertPackagingManifest(ignoreFile) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'allybi-package-boundary-'));
  const contextRoot = path.join(fixtureRoot, 'context');
  const archivePath = path.join(fixtureRoot, 'context.tar');
  try {
    fs.mkdirSync(path.join(contextRoot, 'audit', 'homepage-source-provenance'), { recursive: true });
    fs.mkdirSync(path.join(contextRoot, 'assets', 'images'), { recursive: true });
    fs.writeFileSync(path.join(contextRoot, 'audit', 'homepage-source-provenance', 'hero.bundle'), 'private receipt');
    fs.writeFileSync(path.join(contextRoot, 'assets', 'images', 'legitimate.svg'), '<svg></svg>');
    fs.writeFileSync(path.join(contextRoot, 'server.js'), 'runtime');

    run('tar', [
      '-cf', archivePath,
      `--exclude-from=${path.join(ROOT, ignoreFile)}`,
      '.'
    ], contextRoot);
    const entries = run('tar', ['-tf', archivePath], contextRoot).stdout
      .split('\n')
      .map((entry) => entry.replace(/^\.\//, '').replace(/\/$/, ''))
      .filter(Boolean);

    assert.equal(
      entries.includes('audit/homepage-source-provenance/hero.bundle'),
      false,
      `${ignoreFile} leaked audit/homepage-source-provenance/hero.bundle`
    );
    assert.equal(entries.includes('assets/images/legitimate.svg'), true);
    assert.equal(entries.includes('server.js'), true);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function request(pathname) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: url.hostname,
      port: url.port,
      path: pathname
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) throw new Error(`server exited before readiness\n${serverOutput}`);
    try {
      const response = await request('/');
      if (response.status === 200) return;
    } catch (_error) {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`server readiness timed out\n${serverOutput}`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}${result.stderr}`);
  }
  return result;
}
