'use strict';
/* ============================================================================
 * server.js — Treasure Hunter Survival · Authoritative Game Server
 *  Node.js + ws. Chạy:  cd server && npm install && npm start
 * ========================================================================== */
const http = require('http');
const WebSocket = require('ws');
const World = require('./world');
const { CFG } = require('../shared/protocol');

const world = new World();
world.init();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Treasure Hunter Survival server OK');
});

const wss = new WebSocket.Server({ server, maxPayload: 64 * 1024 });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const player = world.addPlayer(ws);
  console.log(`[THS] + ${player.id} (${req.socket.remoteAddress})`);

  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf); } catch { return; } // packet rác → bỏ
    if (!msg || typeof msg.t !== 'string') return;
    try { world.handle(player, msg); }
    catch (e) { console.error('[THS] handle error:', e.message); }
  });

  ws.on('close', () => { world.removePlayer(player.id); console.log(`[THS] - ${player.id}`); });
  ws.on('error', () => { /* bỏ qua, close sẽ dọn */ });
});

// heartbeat: đá client chết lâm sàng
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// game loop 20Hz
setInterval(() => {
  try { world.tick(CFG.TICK); }
  catch (e) { console.error('[THS] tick error:', e); }
}, CFG.TICK * 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`[THS] server chạy tại ws://localhost:${PORT}`));
