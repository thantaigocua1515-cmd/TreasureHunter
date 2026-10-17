/* ============================================================================
 * ui.js — HUD: thanh HP / thể lực / đói, túi đồ, chat, bảng trạng thái mạng.
 * ========================================================================== */
(function () {
  'use strict';

  class UI {
    constructor() {
      this.el = (id) => document.getElementById(id);
      this.hp = this.el('bar-hp'); this.st = this.el('bar-st');
      this.hu = this.el('bar-hu'); this.inv = this.el('inv');
      this.chat = this.el('chat-log'); this.feed = this.el('feed');
      this.status = this.el('status');
      this._bindChat();
    }

    _bindChat() {
      const input = this.el('chat-input');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          window.__game.net.send({ t: THS.Shared.Msg.C_CHAT, text: input.value.trim() });
          input.value = ''; input.blur();
        }
        e.stopPropagation();
      });
    }

    setOnline(on) {
      this.status.textContent = on ? '● ONLINE' : '● OFFLINE DEMO';
      this.status.className = on ? 'on' : 'off';
    }

    updateHUD(me) {
      if (!me) return;
      this.hp.style.width = Math.max(0, (me.hp / me.maxHp) * 100) + '%';
      this.st.style.width = Math.max(0, me.stamina || 0) + '%';
      this.hu.style.width = Math.max(0, me.hunger || 0) + '%';
      const inv = me.inv || {};
      this.inv.textContent =
        `🪵${inv.wood || 0} 🪨${inv.stone || 0} 🌿${inv.herb || 0} 🍖${inv.food || 0} 🪙${inv.gold || 0}` +
        (me.weapon ? ` · ⚔ ${me.weapon}` : '');
    }

    addChat(from, text) {
      const d = document.createElement('div');
      d.innerHTML = `<b>${from}:</b> `;
      d.appendChild(document.createTextNode(text));
      this.chat.appendChild(d);
      while (this.chat.children.length > 30) this.chat.firstChild.remove();
      this.chat.scrollTop = this.chat.scrollHeight;
    }

    feedMsg(text, color) {
      const d = document.createElement('div');
      d.textContent = text;
      if (color) d.style.color = color;
      this.feed.appendChild(d);
      while (this.feed.children.length > 6) this.feed.firstChild.remove();
      setTimeout(() => d.remove(), 6000);
    }
  }

  window.UI = UI;
})();
