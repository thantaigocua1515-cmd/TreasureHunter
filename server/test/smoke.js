'use strict';
/* Smoke test: kết nối thật tới server, kiểm tra handshake + snapshot stream.
 * Chạy: npm run smoke  (server phải đang chạy ở ws://localhost:8080) */
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');
let gotWelcome = false, gotSnap = 0;

ws.on('open', () => ws.send(JSON.stringify({ t: 'c_hello', name: 'SmokeTester' })));
ws.on('message', (buf) => {
  const m = JSON.parse(buf);
  if (m.t === 's_welcome') {
    gotWelcome = true;
    console.log(`WELCOME ok · id=${m.id} · mobs=${m.snap.mobs.length} · nodes=${m.snap.nodes.length} · zone r=${m.zone.r}`);
    ws.send(JSON.stringify({ t: 'c_input', seq: 1, dx: 1, dy: 0, sprint: false, attack: true }));
    ws.send(JSON.stringify({ t: 'c_chat', text: 'smoke test' }));
  }
  if (m.t === 's_snapshot') {
    gotSnap++;
    if (gotSnap === 10) {
      console.log(`SNAPSHOT ok · tick=${m.tick} · players=${m.players.length} · events=${m.events.length}`);
      console.log('SMOKE PASS');
      ws.close(); process.exit(0);
    }
  }
  if (m.t === 's_chat') console.log(`CHAT echo ok · ${m.from}: ${m.text}`);
});
ws.on('error', (e) => { console.error('SMOKE FAIL:', e.message); process.exit(1); });
setTimeout(() => { console.error('SMOKE TIMEOUT', { gotWelcome, gotSnap }); process.exit(1); }, 8000);
