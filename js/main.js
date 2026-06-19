// ── Game loop ────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  const dt = ts - lastTime; lastTime = ts;
  if (!dead) update(dt);
  if (won) wonScreenTimer++;

  // Draw with zoom
  ctx.save();
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Sky gradient — theme-driven
  const th = THEMES[currentTheme];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, th.skyTop);
  skyGrad.addColorStop(1, th.skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Screen shake
  let shakeX = 0, shakeY = 0;
  if (screenShake > 0) {
    const mag = Math.min(screenShake, 12);
    shakeX = (Math.random() - 0.5) * mag;
    shakeY = (Math.random() - 0.5) * mag;
    screenShake--;
  }
  ctx.translate(shakeX, shakeY);

  // Zoom: scale around player's screen position so player stays centered
  const pScreenX = W / 2;
  const pScreenY = player.y + player.h / 2 - cameraY;
  ctx.translate(pScreenX, pScreenY);
  ctx.scale(zoom, zoom);
  ctx.translate(-pScreenX, -pScreenY);

  ctx.save();
  ctx.translate(0, -cameraY);

  drawBg();
  drawFlagPole();
  drawPipes();
  drawGround();
  drawPlatforms();

  drawCoins();
  drawCoinPopups();
  drawHeartPickups();
  drawMedPackDrops();
  drawGoombas();
  drawBoss();
  drawWraith();
  drawWarden();
  drawRedBat();
  drawSnipers();
  drawShooterBats();
  drawChests();
  drawPowerBoxes();
  drawChaser();
  drawParticlesAll();
  if (!dead) drawPlayer();
  else drawDeathAnimation();

  ctx.restore();
  ctx.restore();

  // All screen-space overlays drawn in logical coords (DPR scaled)
  ctx.save();
  ctx.scale(DPR, DPR);

  // Combo display — big text at top center
  if (comboCount >= 2 && comboTimer > 0) {
    const alpha = (comboTimer < 30 ? comboTimer / 30 : 1);
    const scale = 1 + Math.min((comboCount - 1) * 0.08, 0.8);
    const hue = Math.min(comboCount * 12, 120);
    const fontSize = Math.round(36 * scale);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = `hsl(${hue},100%,65%)`;
    ctx.shadowColor = `hsl(${hue},100%,40%)`;
    ctx.shadowBlur = 16;
    ctx.fillText(`x${comboCount} COMBO`, W / 2, 12);
    ctx.restore();
  }

  // Achievement toasts
  for (let i = achievements.toasts.length - 1; i >= 0; i--) {
    const toast = achievements.toasts[i];
    toast.timer--;
    if (toast.timer <= 0) { achievements.toasts.splice(i, 1); continue; }
    const alpha = toast.timer < 40 ? toast.timer / 40 : toast.timer > 80 ? (240 - toast.timer) / 40 : 1;
    const yOff = (achievements.toasts.length - 1 - i) * 54;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'right';
    const tx = W - 12, ty = H - 60 - yOff;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(tx - 230, ty - 10, 234, 46);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx - 230, ty - 10, 234, 46);
    ctx.textBaseline = 'top';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('🏆 ACHIEVEMENT UNLOCKED', tx, ty - 2);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(toast.label, tx, ty + 12);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(toast.desc, tx, ty + 29);
    ctx.restore();
  }


  // Level complete cinematic overlay
  if (lvlComplete.active) {
    const t = lvlComplete.timer;
    const fadeT   = Math.min(t / LVC_FADE_IN, 1);
    const zoomT   = Math.max(0, Math.min((t - LVC_FADE_IN) / LVC_ZOOM, 1));
    const textT   = Math.max(0, Math.min((t - LVC_FADE_IN - LVC_ZOOM) / LVC_TEXT, 1));

    // Apply cinematic zoom — ease-in-out toward 2.2×
    const targetZoom = lvlComplete.zoomStart + (2.2 - lvlComplete.zoomStart) * (zoomT * zoomT * (3 - 2 * zoomT));
    zoom = targetZoom;

    // Black fade — darkens quickly
    ctx.fillStyle = `rgba(0,0,0,${fadeT * 0.88})`;
    ctx.fillRect(0, 0, W, H);

    // Redraw player at full brightness over the overlay, in walk cycle not ball
    ctx.save();
    const pScreenX = W / 2;
    const pScreenY = player.y + player.h / 2 - cameraY;
    ctx.translate(pScreenX, pScreenY);
    ctx.scale(zoom, zoom);
    ctx.translate(-pScreenX, -pScreenY);
    ctx.save();
    ctx.translate(0, -cameraY);
    const _prevBallForm   = player.ballForm;
    const _prevHoming     = player.homing;
    const _prevDashFrames = player.dashFrames;
    const _prevSpinning   = player.spinning;
    const _prevJumpState  = jumpAnimState;
    player.ballForm   = false;
    player.homing     = false;
    player.dashFrames = 0;
    player.spinning   = false;
    jumpAnimState     = 'idle';
    if (!dead) drawPlayer();
    player.ballForm   = _prevBallForm;
    player.homing     = _prevHoming;
    player.dashFrames = _prevDashFrames;
    player.spinning   = _prevSpinning;
    jumpAnimState     = _prevJumpState;
    ctx.restore();
    ctx.restore();

    // "LEVEL COMPLETE" text
    if (textT > 0) {
      ctx.save();
      const bounce = Math.sin(textT * Math.PI) * 12 * (1 - textT * 0.4);
      ctx.globalAlpha = textT;
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px monospace';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#ffe566';
      ctx.fillText('LEVEL COMPLETE', W / 2, H / 2 - 10 - bounce);
      ctx.shadowBlur = 0;
      ctx.font = '20px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('Score: ' + String(score).padStart(6, '0'), W / 2, H / 2 + 36);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // Screen-space overlays
  if (won) {
    const CARD_DELAY = 90; // frames before score card slides in
    const cardT = Math.max(0, Math.min((wonScreenTimer - CARD_DELAY) / 40, 1));
    const cardY = H * (1 - cardT * cardT * (3 - 2 * cardT)); // slide from bottom

    // Dark overlay
    const overlayAlpha = Math.min(wonScreenTimer / 60, 0.72);
    ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`; ctx.fillRect(0, 0, W, H);

    if (cardT > 0) {
      ctx.save();
      ctx.translate(0, cardY);

      // Card background
      const cardW = 420, cardH = 310;
      const cx = W / 2, cy = H / 2;
      ctx.fillStyle = 'rgba(10,8,6,0.92)';
      ctx.strokeStyle = '#c87840';
      ctx.lineWidth = 2;
      const rx = cx - cardW / 2, ry = cy - cardH / 2;
      ctx.beginPath();
      ctx.roundRect(rx, ry, cardW, cardH, 8);
      ctx.fill(); ctx.stroke();

      // Header
      ctx.textAlign = 'center';
      const isBoss = LEVELS[currentLevel].isBossLevel;
      if (isBoss) {
        const bt = performance.now() / 600;
        const bossName = LEVELS[currentLevel].bossType === 'wraith' ? 'ABYSSAL WRAITH'
          : LEVELS[currentLevel].bossType === 'warden' ? 'THE WARDEN' : 'LEVIATHAN';
        ctx.fillStyle = `hsl(${260 + Math.sin(bt)*40},80%,70%)`;
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`✦ ${bossName} DEFEATED ✦`, cx, ry + 36);
      } else {
        ctx.fillStyle = '#ffe566';
        ctx.font = 'bold 26px monospace';
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14;
        ctx.fillText('★  LEVEL CLEAR  ★', cx, ry + 38);
        ctx.shadowBlur = 0;
      }

      // Divider
      ctx.strokeStyle = '#443322'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx + 20, ry + 52); ctx.lineTo(rx + cardW - 20, ry + 52); ctx.stroke();

      // Stat rows — each row slides in with a small stagger
      const statsDelay = CARD_DELAY + 40;
      const skillsUnlocked = abilityMenu.purchased.size;
      const statRows = [
        ['Enemies Killed', killCount],
        ['Longest Combo',  maxCombo + 'x'],
        ['Skills Unlocked', skillsUnlocked],
        ['Gems Collected', coinCount],
        ['Deaths',         deathCount],
        ['Score',          String(score).padStart(6, '0')],
      ];
      ctx.font = '16px monospace';
      statRows.forEach(([label, val], i) => {
        const rowT = Math.max(0, Math.min((wonScreenTimer - statsDelay - i * 8) / 20, 1));
        if (rowT <= 0) return;
        const rowY = ry + 76 + i * 30;
        ctx.globalAlpha = rowT;
        ctx.fillStyle = '#a09080'; ctx.textAlign = 'left';
        ctx.fillText(label, rx + 28, rowY);
        ctx.fillStyle = '#ffe566'; ctx.textAlign = 'right';
        ctx.fillText(val, rx + cardW - 28, rowY);
        ctx.globalAlpha = 1;
      });

      // Grade
      const gradeDelay = statsDelay + statRows.length * 8 + 30;
      const gradeT = Math.max(0, Math.min((wonScreenTimer - gradeDelay) / 25, 1));
      if (gradeT > 0) {
        // Grade: weighted score from kills, combo, skills, gems, score
        const maxPossibleScore = 10000;
        const pct = Math.min(score / maxPossibleScore, 1);
        const comboBonus = Math.min(maxCombo / 5, 1);
        const skillBonus = Math.min(skillsUnlocked / 4, 1);
        const deathPenalty = Math.min(deathCount * 0.08, 0.3);
        const gradeVal = Math.max(0, pct * 0.5 + comboBonus * 0.3 + skillBonus * 0.2 - deathPenalty);
        const grade = gradeVal >= 0.88 ? 'S' : gradeVal >= 0.72 ? 'A' : gradeVal >= 0.55 ? 'B'
          : gradeVal >= 0.38 ? 'C' : gradeVal >= 0.22 ? 'D' : 'F';
        const gradeColor = grade === 'S' ? '#ffee44' : grade === 'A' ? '#88ff88'
          : grade === 'B' ? '#88ccff' : grade === 'C' ? '#ffaa44'
          : grade === 'D' ? '#ff8866' : '#cc4444';

        ctx.save();
        ctx.globalAlpha = gradeT;
        ctx.translate(cx, ry + cardH - 42);
        const pulse = 1 + 0.06 * Math.sin(performance.now() / 200);
        ctx.scale(pulse * gradeT, pulse * gradeT);
        ctx.font = 'bold 52px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = gradeColor; ctx.shadowBlur = 24;
        ctx.fillStyle = gradeColor;
        ctx.fillText(grade, 0, 18);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Continue prompt
      const promptT = Math.max(0, Math.min((wonScreenTimer - gradeDelay - 60) / 20, 1));
      if (promptT > 0) {
        ctx.globalAlpha = promptT * (0.6 + 0.4 * Math.sin(performance.now() / 400));
        ctx.fillStyle = '#c8b89a'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Press Enter or select level to continue', cx, ry + cardH + 22);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  // Boss level intro hint
  if (LEVELS[currentLevel].isBossLevel && !won && !dead && (boss.active || wraith.active || warden.active)) {
    const t2 = performance.now() / 1000;
    if (t2 % 6 < 3) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t2 * 4);
      ctx.fillStyle = '#ff4488'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      const hint = warden.active
        ? 'JUMP over CHARGE  ·  JUMP over shockwave  ·  DASH or HOMING to damage'
        : wraith.active
        ? 'Kill CLONES in order  ·  JUMP shockwaves  ·  HOMING to expose the Wraith'
        : 'DASH through attacks  ·  HOMING attacks hit weak points  ·  CHAIN orbs to expose the boss';
      ctx.fillText(hint, W/2, H - 18);
      ctx.restore();
    }
  }

  ctx.restore(); // end overlay DPR scale

  if (abilityMenu.open) drawAbilityMenu();
  drawTokenBanner();

  updateHUD();
  requestAnimationFrame(loop);
}

// ── Music ─────────────────────────────────────────────────────────────────────
const introMusic = new Audio('intro.mp3');
introMusic.loop = true;
introMusic.volume = 0.7;

const levelMusic = {
  1: new Audio('ice.mp3'),
};
for (const t of Object.values(levelMusic)) { t.loop = true; t.volume = 0.7; }

let currentTrack = null;
function playTrack(audio) {
  if (currentTrack === audio) return;
  if (currentTrack) { currentTrack.pause(); currentTrack.currentTime = 0; }
  currentTrack = audio;
  if (audio) audio.play().catch(() => {});
}

// Title screen
(function() {
  const screen = document.getElementById('title-screen');
  const vid    = document.getElementById('intro-vid');
  const prompt = document.getElementById('press-enter');
  let dismissed = false;

  // Try to play immediately; if blocked, retry on first interaction
  introMusic.play().catch(() => {
    function startOnInteraction() {
      introMusic.play().catch(() => {});
      document.removeEventListener('keydown', startOnInteraction);
      document.removeEventListener('click',   startOnInteraction);
    }
    document.addEventListener('keydown', startOnInteraction);
    document.addEventListener('click',   startOnInteraction);
  });

  vid.playbackRate = 1.0;
  vid.addEventListener('canplay', () => { vid.playbackRate = 1.0; });
  vid.addEventListener('ended', () => { prompt.style.display = 'block'; });
  vid.addEventListener('error', () => { prompt.style.display = 'block'; });

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    vid.pause();
    introMusic.pause();
    introMusic.currentTime = 0;
    currentTrack = null;
    screen.style.display = 'none';
    resetAbilities();
    loadLevel(currentLevel);
    hp = MAX_HP;
    updateHPBar();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && screen.style.display !== 'none') dismiss();
  });
})();

// ── Level button ─────────────────────────────────────────────────────────────
document.getElementById('level-btn').addEventListener('change', (e) => {
  loadLevel(parseInt(e.target.value));
  hp = MAX_HP;
  updateHPBar();
  e.target.blur();
});

// ── Zoom slider ──────────────────────────────────────────────────────────────
const zoomSlider = document.getElementById('zoom-slider');
const zoomVal    = document.getElementById('zoom-val');
zoomSlider.value = zoom;
zoomVal.textContent = zoom.toFixed(2) + 'x';
zoomSlider.addEventListener('input', () => {
  zoom = parseFloat(zoomSlider.value);
  zoomVal.textContent = zoom.toFixed(2) + 'x';
  localStorage.setItem('axo_zoom', zoom);
});

// ── Settings panel ────────────────────────────────────────────────────────────
document.getElementById('settings-btn').addEventListener('click', () =>
  document.getElementById('settings-panel').classList.toggle('open'));
document.addEventListener('keydown', e => {
  if (e.code === 'Escape') document.getElementById('settings-panel').classList.remove('open');
  if (e.code === 'KeyT') { totalTokens++; saveAbilities(); }
});

const sliders = [
  { id: 's-gravity',  vid: 'v-gravity',  key: 'gravity',   fmt: v => v.toFixed(2) },
  { id: 's-gravity1', vid: 'v-gravity1', key: 'gravity1',  fmt: v => v.toFixed(2) },
  { id: 's-jump1',    vid: 'v-jump1',    key: 'jump1',     fmt: v => v.toFixed(1) },
  { id: 's-dashH',    vid: 'v-dashH',    key: 'dashH',     fmt: v => v.toFixed(1) },
  { id: 's-dashV',    vid: 'v-dashV',    key: 'dashV',     fmt: v => v.toFixed(1) },
  { id: 's-dashLen',  vid: 'v-dashLen',  key: 'dashLen',   fmt: v => Math.round(v) + 'f' },
  { id: 's-speed',        vid: 'v-speed',        key: 'moveSpeed',    fmt: v => v.toFixed(1) },
  { id: 's-size',         vid: 'v-size',         key: 'axoSize',      fmt: v => v + 'px'     },
  { id: 's-enemySize',   vid: 'v-enemySize',   key: 'enemySize',    fmt: v => v + 'px'     },
  { id: 's-gnomeScale',  vid: 'v-gnomeScale',  key: 'gnomeScale',   fmt: v => v.toFixed(1) + '×' },
  { id: 's-dashFrenzyMult', vid: 'v-dashFrenzyMult', key: 'dashFrenzyMult', fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 's-homingChain',   vid: 'v-homingChain',   key: 'homingChain',   fmt: v => Math.round(v) },
  { id: 's-stompKill',    vid: 'v-stompKill',    key: 'stompKill',    fmt: v => v > 0 ? 'on' : 'off' },
  { id: 's-godMode',      vid: 'v-godMode',      key: 'godMode',      fmt: v => v > 0 ? 'on' : 'off' },
  { id: 's-batScale',    vid: 'v-batScale',    key: 'batScale',     fmt: v => v.toFixed(1) + '×' },
  { id: 's-smoothing',  vid: 'v-smoothing',   key: 'smoothing',    fmt: v => v > 0 ? 'smooth' : 'pixel' },
  { id: 's-spriteRot',    vid: 'v-spriteRot',    key: 'spriteRot',    fmt: v => Math.round(v) + '°' },
  { id: 's-spriteOffset',     vid: 'v-spriteOffset',     key: 'spriteOffset',     fmt: v => Math.round(v) + 'px' },
  { id: 's-jumpSpriteOffset', vid: 'v-jumpSpriteOffset', key: 'jumpSpriteOffset', fmt: v => Math.round(v) + 'px' },
  { id: 's-landSpriteOffset', vid: 'v-landSpriteOffset', key: 'landSpriteOffset', fmt: v => Math.round(v) + 'px' },
  { id: 's-jumpScale',        vid: 'v-jumpScale',        key: 'jumpScale',        fmt: v => v.toFixed(2) + 'x' },
  { id: 's-diveScale',        vid: 'v-diveScale',        key: 'diveScale',        fmt: v => v.toFixed(2) + 'x' },
  { id: 's-ballSize',     vid: 'v-ballSize',     key: 'ballSize',     fmt: v => Math.round(v) + 'px' },
];

function syncSliders() {
  for (const s of sliders) {
    const el = document.getElementById(s.id);
    const vl = document.getElementById(s.vid);
    if (!el) continue;
    el.value = CFG[s.key];
    vl.textContent = s.fmt(CFG[s.key]);
  }
}

for (const s of sliders) {
  const el = document.getElementById(s.id);
  const vl = document.getElementById(s.vid);
  if (!el) continue;
  el.addEventListener('input', () => {
    CFG[s.key] = parseFloat(el.value);
    vl.textContent = s.fmt(CFG[s.key]);
    saveCFG();
  });
}

document.getElementById('s-reset').addEventListener('click', () => {
  Object.assign(CFG, DEFAULTS); syncSliders(); saveCFG();
});
document.getElementById('s-export-cfg').addEventListener('click', () => {
  const lines = Object.entries(CFG).map(([k, v]) => `${k}=${v}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'axolotl.cfg';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('s-give-token').addEventListener('click', () => {
  totalTokens++; saveAbilities();
});
syncSliders();

// ── Theme picker ──────────────────────────────────────────────────────────────
const themeSelect = document.getElementById('s-theme');
themeSelect.value = currentTheme;
themeSelect.addEventListener('change', () => setTheme(themeSelect.value));

// ── Key rebinding ─────────────────────────────────────────────────────────────
function codeToLabel(code) {
  if (!code) return '?';
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return '↑↓←→'.split('')[['Up','Down','Left','Right'].indexOf(code.slice(5))] ?? code.slice(5);
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

function syncKeyButtons() {
  document.querySelectorAll('.key-btn').forEach(btn => {
    const action = btn.dataset.action;
    btn.textContent = codeToLabel(KEYS[action]);
  });
}

let listeningBtn = null;
document.querySelectorAll('.key-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (listeningBtn) listeningBtn.classList.remove('listening');
    listeningBtn = btn;
    btn.classList.add('listening');
    btn.textContent = '...';
  });
});

document.addEventListener('keydown', e => {
  if (!listeningBtn) return;
  e.preventDefault();
  if (e.code === 'Escape') {
    listeningBtn.classList.remove('listening');
    listeningBtn = null;
    syncKeyButtons();
    return;
  }
  const action = listeningBtn.dataset.action;
  KEYS[action] = e.code;
  saveKeys();
  listeningBtn.classList.remove('listening');
  listeningBtn = null;
  syncKeyButtons();
}, { capture: true });

document.getElementById('s-reset-keys').addEventListener('click', () => {
  Object.assign(KEYS, KEY_DEFAULTS);
  saveKeys();
  syncKeyButtons();
});

syncKeyButtons();

// ── Ability Menu ──────────────────────────────────────────────────────────────
let totalCoins  = parseInt(localStorage.getItem('axo_totalCoins')  || '0');
let totalTokens = parseInt(localStorage.getItem('axo_totalTokens') ?? '100');

function saveAbilities() {
  localStorage.setItem('axo_totalCoins',  totalCoins);
  localStorage.setItem('axo_totalTokens', totalTokens);
  localStorage.setItem('axo_abilities', JSON.stringify([...abilityMenu.purchased]));
}

function resetAbilities() {
  totalCoins  = 0;
  totalTokens = 1; // one token to spend on dash
  abilityMenu.purchased.clear();
  applyPurchased();
  saveAbilities();
  document.getElementById('coins').textContent = '00';
}

const ABILITY_COST = 1; // 1 token per skill
const ABILITY_DEFS = [
  {
    group: 'DASH',
    items: [
      { id: 'dash1', label: '1 Dash',   desc: 'Dash once in mid-air',        cfgKey: 'dashMax', cfgVal: 1 },
      { id: 'dash2', label: '2 Dashes', desc: 'Dash twice in mid-air',       cfgKey: 'dashMax', cfgVal: 2 },
      { id: 'dash3', label: '3 Dashes', desc: 'Dash three times in mid-air', cfgKey: 'dashMax', cfgVal: 3 },
    ],
  },
  {
    group: 'HOMING',
    items: [
      { id: 'home1', label: '1-Kill Chain', desc: '1 homing kill per jump', cfgKey: 'homingChain', cfgVal: 1 },
      { id: 'home2', label: '2-Kill Chain', desc: 'Chain 2 kills before landing',                  cfgKey: 'homingChain', cfgVal: 2 },
      { id: 'home3', label: '3-Kill Chain', desc: 'Chain 3 kills before landing',                  cfgKey: 'homingChain', cfgVal: 3 },
    ],
  },
  {
    group: 'SLAM',
    items: [
      { id: 'slam', label: 'Ground Slam', desc: 'Hold X + Dash to slam down and break blocks', cfgKey: 'slamUnlocked', cfgVal: 1 },
    ],
  },
  {
    group: 'VORTEX',
    items: [
      { id: 'vortex1', label: 'Crystal Vortex', desc: 'Gems within range are pulled toward you automatically', cfgKey: 'vortexRange', cfgVal: 160 },
    ],
  },
];

const abilityMenu = {
  open: false,
  purchased: new Set(JSON.parse(localStorage.getItem('axo_abilities') || '[]')),
  cursor: { group: 0, item: 0 },
  flashTimer: 0, // flashes on failed purchase
};

// Apply purchased abilities to CFG — called on load and after amulet collection
function applyPurchased() {
  // Reset all ability-controlled keys to locked defaults first
  // so stale localStorage values don't grant abilities
  CFG.dashMax       = 0;
  CFG.homingChain   = 0;
  CFG.slamUnlocked  = 0;
  CFG.vortexRange   = 0;
  for (const grp of ABILITY_DEFS) {
    let best = null;
    for (const item of grp.items) { if (abilityMenu.purchased.has(item.id)) best = item; }
    if (best) CFG[best.cfgKey] = best.cfgVal;
  }
  player.maxDashes = Math.max(1, CFG.dashMax);
  player.dashAvail = Math.min(player.dashAvail, player.maxDashes);
}
applyPurchased();

function canBuyAbility(grp, item) {
  if (abilityMenu.purchased.has(item.id)) return false;
  if (totalTokens < ABILITY_COST) return false;
  const idx = grp.items.indexOf(item);
  if (idx > 0 && !abilityMenu.purchased.has(grp.items[idx - 1].id)) return false;
  return true;
}

function drawAbilityMenu() {
  const t = performance.now() / 1000;
  if (abilityMenu.flashTimer > 0) abilityMenu.flashTimer--;

  ctx.save();
  ctx.scale(DPR, DPR);

  // Blurred dark backdrop with subtle vignette
  ctx.fillStyle = 'rgba(4,6,12,0.88)';
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W/2, H/2, 60, W/2, H/2, W * 0.83);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  const pw = 620, ph = 340, px = (W - pw) / 2, py = (H - ph) / 2;

  // Panel shadow
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#080c14';
  ctx.fillRect(px, py, pw, ph);
  ctx.shadowBlur = 0;

  // Subtle top-edge highlight
  const topLine = ctx.createLinearGradient(px, py, px + pw, py);
  topLine.addColorStop(0,   'rgba(255,255,255,0)');
  topLine.addColorStop(0.3, 'rgba(255,200,80,0.18)');
  topLine.addColorStop(0.7, 'rgba(255,200,80,0.18)');
  topLine.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = topLine; ctx.fillRect(px, py, pw, 1);

  // Title area
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(px, py, pw, 46);

  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  // Spaced title — draw char by char
  const title = 'A B I L I T I E S';
  ctx.fillText(title, W / 2, py + 29);

  // Token counter — top right
  const orbX = px + pw - 16;
  ctx.textAlign = 'right';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(180,100,255,0.6)';
  ctx.fillText('🔮', orbX - 42, py + 28);
  ctx.fillStyle = '#cc88ff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(totalTokens + ' token' + (totalTokens !== 1 ? 's' : ''), orbX, py + 29);

  // Thin separator
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(px, py + 46, pw, 1);

  // Reset button — top left of panel
  const rbx = px + 12, rby = py + 10, rbw = 100, rbh = 22;
  ctx.fillStyle = 'rgba(180,40,40,0.55)';
  ctx.beginPath(); ctx.roundRect(rbx, rby, rbw, rbh, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(220,80,80,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(rbx, rby, rbw, rbh, 4); ctx.stroke();
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,180,180,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('RESET SKILLS', rbx + rbw / 2, rby + 15);

  // Hint bar bottom
  ctx.textAlign = 'center';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('← → ↑ ↓ navigate   ·   ENTER unlock   ·   TAB close   ·   unlock Dash before Homing', W / 2, py + ph - 10);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(px, py + ph - 24, pw, 1);

  const cols = ABILITY_DEFS.length;
  const colW  = pw / cols;
  const cardW = colW - 28;
  const cardH = 72;
  const cardGap = 10;
  const startY = py + 62;

  for (let gi = 0; gi < cols; gi++) {
    const grp  = ABILITY_DEFS[gi];
    const colX = px + gi * colW + colW / 2;

    // Column header
    ctx.textAlign = 'center';
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(grp.group.split('').join(' '), colX, startY - 8);

    for (let ii = 0; ii < grp.items.length; ii++) {
      const item     = grp.items[ii];
      const owned    = abilityMenu.purchased.has(item.id);
      const buyable  = canBuyAbility(grp, item);
      const locked   = !owned && !buyable;
      const selected = abilityMenu.cursor.group === gi && abilityMenu.cursor.item === ii;
      const pulse    = 0.5 + 0.5 * Math.sin(t * 3);

      const bx = colX - cardW / 2;
      const by = startY + ii * (cardH + cardGap);

      // Connector line between cards
      if (ii > 0) {
        ctx.strokeStyle = owned ? 'rgba(80,220,80,0.35)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(colX, by - cardGap);
        ctx.lineTo(colX, by);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Card background
      ctx.save();
      if (owned) {
        ctx.fillStyle = 'rgba(30,80,30,0.55)';
      } else if (selected) {
        ctx.fillStyle = `rgba(38,24,8,${0.7 + pulse * 0.15})`;
      } else if (locked) {
        ctx.fillStyle = 'rgba(10,10,14,0.6)';
      } else {
        ctx.fillStyle = 'rgba(20,16,10,0.8)';
      }
      ctx.beginPath();
      ctx.roundRect(bx, by, cardW, cardH, 6);
      ctx.fill();

      // Card border / glow
      if (selected) {
        ctx.shadowColor = '#e87820';
        ctx.shadowBlur  = 10 + pulse * 8;
        ctx.strokeStyle = `rgba(240,140,40,${0.6 + pulse * 0.4})`;
        ctx.lineWidth   = 1.5;
      } else if (owned) {
        ctx.strokeStyle = 'rgba(60,180,60,0.4)';
        ctx.lineWidth   = 1;
      } else if (locked) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth   = 1;
      } else {
        ctx.strokeStyle = 'rgba(200,140,40,0.25)';
        ctx.lineWidth   = 1;
      }
      ctx.beginPath(); ctx.roundRect(bx, by, cardW, cardH, 6); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Owned shimmer overlay
      if (owned) {
        const shim = ctx.createLinearGradient(bx, by, bx, by + cardH);
        shim.addColorStop(0,   'rgba(80,220,80,0.08)');
        shim.addColorStop(0.5, 'rgba(80,220,80,0.02)');
        shim.addColorStop(1,   'rgba(80,220,80,0.0)');
        ctx.fillStyle = shim;
        ctx.beginPath(); ctx.roundRect(bx, by, cardW, cardH, 6); ctx.fill();
      }

      // Clip all text to card bounds
      ctx.save();
      ctx.beginPath(); ctx.rect(bx + 4, by + 4, cardW - 8, cardH - 8); ctx.clip();

      const pad = 10;

      // Label
      ctx.textAlign = 'left';
      ctx.font = `600 12px system-ui, sans-serif`;
      ctx.fillStyle = owned ? '#7eed7e' : locked ? 'rgba(255,255,255,0.2)' : selected ? '#ffe090' : 'rgba(255,255,255,0.8)';
      ctx.fillText(item.label, bx + pad, by + 20);

      // Cost badge (top-right of card)
      if (!owned) {
        const costAlpha = locked ? 0.2 : buyable ? 1 : 0.5;
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(180,100,255,${costAlpha})`;
        ctx.fillText('1 token', bx + cardW - pad, by + 20);
      } else {
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(80,220,80,0.7)';
        ctx.fillText('✓', bx + cardW - pad, by + 20);
      }

      // Description — word wrap into 2 lines max
      ctx.textAlign = 'left';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = owned ? 'rgba(120,220,120,0.55)' : locked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.38)';
      const words = item.desc.split(' ');
      let line = '', lineY = by + 35;
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > cardW - pad * 2 && line) {
          ctx.fillText(line, bx + pad, lineY);
          line = word; lineY += 13;
          if (lineY > by + cardH - 14) break;
        } else { line = test; }
      }
      if (line && lineY <= by + cardH - 14) ctx.fillText(line, bx + pad, lineY);

      // Status line
      const statusY = by + cardH - 8;
      if (selected && buyable) {
        ctx.font = `bold 9px system-ui, sans-serif`;
        ctx.fillStyle = `rgba(255,200,60,${0.6 + pulse * 0.4})`;
        ctx.fillText('ENTER to unlock', bx + pad, statusY);
      } else if (selected && locked && totalTokens < ABILITY_COST) {
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(220,80,60,0.7)';
        ctx.fillText('No tokens (' + totalTokens + ' owned)', bx + pad, statusY);
      } else if (selected && locked) {
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillText('Unlock previous first', bx + pad, statusY);
      }

      ctx.restore();
    }
  }

  // Flash red on failed purchase
  if (abilityMenu.flashTimer > 0) {
    ctx.fillStyle = `rgba(220,40,20,${(abilityMenu.flashTimer / 20) * 0.18})`;
    ctx.fillRect(px, py, pw, ph);
  }

  ctx.restore();
}


document.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault();
    abilityMenu.open = !abilityMenu.open;
    if (abilityMenu.open) playSound('dial', 0.7);
    return;
  }
  if (!abilityMenu.open) return;
  e.preventDefault();

  const { cursor } = abilityMenu;
  if (e.code === 'ArrowRight') { cursor.group = Math.min(ABILITY_DEFS.length - 1, cursor.group + 1); }
  if (e.code === 'ArrowLeft')  { cursor.group = Math.max(0, cursor.group - 1); }
  if (e.code === 'ArrowDown')  { cursor.item  = Math.min(ABILITY_DEFS[cursor.group].items.length - 1, cursor.item + 1); }
  if (e.code === 'ArrowUp')    { cursor.item  = Math.max(0, cursor.item - 1); }
  cursor.item = Math.min(cursor.item, ABILITY_DEFS[cursor.group].items.length - 1);

  if (e.code === 'Enter') {
    const grp  = ABILITY_DEFS[cursor.group];
    const item = grp.items[cursor.item];
    if (canBuyAbility(grp, item)) {
      totalTokens -= ABILITY_COST;
      abilityMenu.purchased.add(item.id);
      applyPurchased();
      saveCFG();
      saveAbilities();
    } else if (!abilityMenu.purchased.has(item.id)) {
      abilityMenu.flashTimer = 20;
    }
  }
  if (e.code === 'KeyU') {
    for (const grp of ABILITY_DEFS)
      for (const item of grp.items)
        abilityMenu.purchased.add(item.id);
    applyPurchased(); saveCFG(); saveAbilities();
  }
  if (e.code === 'Escape') abilityMenu.open = false;
});

document.getElementById('c').addEventListener('click', e => {
  if (!abilityMenu.open) return;
  const canvas = document.getElementById('c');
  const rect = canvas.getBoundingClientRect();
  // Convert click to logical canvas coords
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top)  * (H / rect.height);

  const pw = 620, ph = 340, px = (W - pw) / 2, py = (H - ph) / 2;

  // Reset button hit test
  const rbx = px + 12, rby = py + 10, rbw = 100, rbh = 22;
  if (mx >= rbx && mx <= rbx + rbw && my >= rby && my <= rby + rbh) {
    abilityMenu.purchased.clear();
    totalTokens = 1;
    applyPurchased();
    saveAbilities();
    return;
  }

  const cols = ABILITY_DEFS.length;
  const colW  = pw / cols;
  const cardW = colW - 28;
  const cardH = 72;
  const cardGap = 10;
  const startY = py + 62;

  for (let gi = 0; gi < cols; gi++) {
    const colX = px + gi * colW + colW / 2;
    const bx = colX - cardW / 2;
    for (let ii = 0; ii < ABILITY_DEFS[gi].items.length; ii++) {
      const by = startY + ii * (cardH + cardGap);
      if (mx >= bx && mx <= bx + cardW && my >= by && my <= by + cardH) {
        abilityMenu.cursor.group = gi;
        abilityMenu.cursor.item  = ii;
        const grp  = ABILITY_DEFS[gi];
        const item = grp.items[ii];
        if (canBuyAbility(grp, item)) {
          totalTokens -= ABILITY_COST;
          abilityMenu.purchased.add(item.id);
          applyPurchased();
          saveCFG();
          saveAbilities();
        } else if (!abilityMenu.purchased.has(item.id)) {
          abilityMenu.flashTimer = 20;
        }
        return;
      }
    }
  }
});
