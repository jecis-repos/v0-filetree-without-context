import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';

// PORT=0 lets the OS choose an unused port; parse Next's startup address.
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { output += data; });
try {
  let origin;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(server.exitCode, null, output);
    const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
    if (match) {
      origin = match[0];
      try { if ((await fetch(origin + '/api/health')).ok) break; } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(origin, 'No startup URL: ' + output);
  assert.equal((await fetch(origin)).status, 200);
  const health = await fetch(origin + '/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'healthy');
  assert.equal((await fetch(origin + '/api/filesystem/download/missing-smoke-file')).status, 404);
  console.log('Homepage, health and missing-file response passed');
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
}
