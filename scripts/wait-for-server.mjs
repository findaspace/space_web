const url = process.argv[2] ?? 'http://localhost:3100';
const deadline = Date.now() + 30000;
let ready = false;
while (Date.now() < deadline) {
  try { if ((await fetch(url)).ok) { ready = true; break; } } catch { /* Booting. */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) { console.error(`Server did not become ready: ${url}`); process.exit(1); }
