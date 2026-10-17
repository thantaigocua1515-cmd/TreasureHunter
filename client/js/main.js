/* Khởi động game khi trang load xong (đợi Sunny Land assets load trước) */
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const boot = () => game.boot();
  if (window.Sunny && Sunny.ready) { Sunny.ready.then(boot).catch(boot); setTimeout(boot, 4000); }
  else boot();

  // Nhạc nền Sunny Land: trình duyệt chỉ cho phát sau khi user tương tác
  const bgm = document.getElementById('bgm');
  if (bgm && !bgm.src) {
    bgm.src = (window.SunnyData && SunnyData.audio && SunnyData.audio.happywalking)
      || 'assets/audio/happywalking.ogg';
  }
  const muteBtn = document.getElementById('btn-mute');
  let muted = false;
  const unlock = () => {
    if (bgm && !muted && bgm.paused) bgm.play().catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  if (muteBtn) muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    muted = !muted;
    if (bgm) { if (muted) bgm.pause(); else bgm.play().catch(() => {}); }
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });
});
