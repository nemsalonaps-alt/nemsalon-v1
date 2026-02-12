import net from 'node:net';

const ports = [
  { name: 'api', port: 3000 },
  { name: 'web', port: 5173 },
];

function checkPort({ name, port }) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ name, port, ok: false, message: 'in use' });
      } else {
        resolve({ name, port, ok: false, message: err.message });
      }
    });
    server.once('listening', () => {
      server.close(() => resolve({ name, port, ok: true, message: 'free' }));
    });
    server.listen(port, '127.0.0.1');
  });
}

const results = await Promise.all(ports.map(checkPort));
const failures = results.filter((r) => !r.ok);

for (const result of results) {
  const status = result.ok ? 'OK' : 'BLOCKED';
  console.log(`[e2e-preflight] ${status} ${result.name} port ${result.port} (${result.message})`);
}

if (failures.length > 0) {
  console.error(
    `\n[e2e-preflight] Ports in use: ${failures.map((f) => f.port).join(', ')}. ` +
      'Stop those processes before running Playwright.',
  );
  process.exit(1);
}
