// ── Game loop ────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  const dt = ts - lastTime; lastTime = ts;
  if (!dead) update(dt);

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
  drawHeartPickups();
  drawGoombas();
  drawBoss();
  drawWraith();
  drawWarden();
  drawRedBat();
  drawSnipers();
  drawChaser();
  drawParticlesAll();
  if (!dead) drawPlayer();
  else drawDeathAnimation();

  ctx.restore();
  ctx.restore();

  // All screen-space overlays drawn in logical coords (DPR scaled)
  ctx.save();
  ctx.scale(DPR, DPR);

  // Turbo activation freeze flash
  if (turboFlash > 0) {
    const t = turboFlash / 70; // 1 at start → 0 at end
    const elapsed = 1 - t;    // 0 at start → 1 at end
    ctx.save();

    // White flash that fades to cyan tint
    const flashAlpha = Math.pow(t, 0.4) * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(80,220,255,${t * 0.35})`;
    ctx.fillRect(0, 0, W, H);

    // Expanding white pulse rings from screen center
    const cx = W / 2, cy = H / 2;
    const maxR = Math.hypot(W, H) * 0.75;
    for (let ri = 0; ri < 3; ri++) {
      const phase = (elapsed + ri / 3) % 1;
      const r = phase * maxR;
      const ringAlpha = (1 - phase) * t * 0.9;
      if (ringAlpha <= 0) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
      ctx.lineWidth = 6 * (1 - phase);
      ctx.stroke();
    }

    // Text
    const scale = 1 + elapsed * 0.35;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(42)}px monospace`;
    ctx.fillStyle = `rgba(255,255,255,${t})`;
    ctx.shadowColor = '#50dcff';
    ctx.shadowBlur = 40;
    ctx.fillText('TURBO MODE', 0, 0);
    ctx.shadowBlur = 12;
    ctx.font = `bold 16px monospace`;
    ctx.fillStyle = `rgba(180,240,255,${t * 0.85})`;
    ctx.fillText('infinite health  ·  ceiling wrap  ·  3 homes', 0, 44);
    ctx.restore();
  }

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
    const alpha = toast.timer < 40 ? toast.timer / 40 : toast.timer > 200 ? (240 - toast.timer) / 40 : 1;
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

  // Frenzy kill counter / active bar
  {
    const bw = 120, bh = 8, bx = W / 2 - bw / 2, by = H - 22;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    if (player.frenzyTimer > 0) {
      // Active: drain bar pulses cyan
      const frac = player.frenzyTimer / 540;
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 80);
      ctx.fillStyle = `rgba(80,220,255,${pulse})`;
      ctx.fillRect(bx, by, bw * frac, bh);
      ctx.strokeStyle = 'rgba(80,220,255,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#50dcff';
      ctx.textAlign = 'center';
      ctx.fillText('FRENZY', W / 2, by - 3);
    } else {
      // Building: show kill progress toward 7
      const frac = player.frenzyKills / 12;
      const ready = player.frenzyKills >= 12;
      const readyPulse = ready ? (0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 180))) : 0.8;
      ctx.fillStyle = ready ? `rgba(255,220,40,${readyPulse})` : 'rgba(255,180,40,0.8)';
      ctx.fillRect(bx, by, bw * frac, bh);
      ctx.strokeStyle = ready ? `rgba(255,220,40,${readyPulse})` : 'rgba(255,180,40,0.6)';
      ctx.lineWidth = ready ? 2 : 1;
      ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.font = `bold 9px monospace`;
      ctx.fillStyle = ready ? `rgba(255,240,80,${readyPulse})` : '#ffb428';
      ctx.textAlign = 'center';
      ctx.fillText(ready ? 'FRENZY READY — R' : `KILLS ${player.frenzyKills}/12`, W / 2, by - 3);
    }
    ctx.restore();
  }

  // Tutorial overlay
  if (LEVELS[currentLevel]?.isTutorial && !tut.done) {
    const step = TUT_STEPS[tut.step];
    if (step && tut.frozen) {
      // Dark translucent backdrop
      ctx.save();
      const panelW = Math.min(W - 60, 520);
      const panelH = 130;
      const px = (W - panelW) / 2;
      const py = H / 2 - panelH / 2;
      ctx.fillStyle = 'rgba(0,0,20,0.82)';
      // Rounded rect
      const r = 14;
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.lineTo(px + panelW - r, py);
      ctx.quadraticCurveTo(px + panelW, py, px + panelW, py + r);
      ctx.lineTo(px + panelW, py + panelH - r);
      ctx.quadraticCurveTo(px + panelW, py + panelH, px + panelW - r, py + panelH);
      ctx.lineTo(px + r, py + panelH);
      ctx.quadraticCurveTo(px, py + panelH, px, py + panelH - r);
      ctx.lineTo(px, py + r);
      ctx.quadraticCurveTo(px, py, px + r, py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,200,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Step counter
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,200,255,0.7)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`STEP ${tut.step + 1} / ${TUT_STEPS.length}`, W / 2, py + 22);

      // Main message (support newline)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      const lines = step.msg.split('\n');
      const lineH = 24;
      const startY = py + 50 - ((lines.length - 1) * lineH) / 2;
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], W / 2, startY + li * lineH);
      }

      // "Press any key" prompt (blinking)
      if (tut.anyKeyTimer <= 0) {
        const blink = Math.sin(Date.now() / 200) > 0;
        if (blink) {
          ctx.fillStyle = 'rgba(200,220,255,0.7)';
          ctx.font = '12px monospace';
          ctx.fillText('— PRESS ANY KEY TO CONTINUE —', W / 2, py + panelH - 16);
        }
      }
      ctx.restore();
    } else if (tut.step === TUT_STEPS.length - 1 && tut.done === false) {
      // Last step "tutorial complete" — show for a moment then auto-continue
      ctx.save();
      const t2 = (Date.now() % 1200) / 1200;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t2 * Math.PI * 2);
      ctx.fillStyle = '#aaffcc';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(TUT_STEPS[TUT_STEPS.length - 1].msg, W / 2, H / 2);
      ctx.restore();
    }
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
    const _prevBallForm = player.ballForm;
    const _prevHoming   = player.homing;
    player.ballForm = false;
    player.homing   = false;
    if (!dead) drawPlayer();
    player.ballForm = _prevBallForm;
    player.homing   = _prevHoming;
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
    const isBoss = LEVELS[currentLevel].isBossLevel;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);
    if (isBoss) {
      const bt = performance.now() / 600;
      const bossName = LEVELS[currentLevel].bossType === 'wraith' ? 'ABYSSAL WRAITH' : LEVELS[currentLevel].bossType === 'warden' ? 'THE WARDEN' : 'LEVIATHAN';
      ctx.fillStyle = `hsl(${260 + Math.sin(bt)*40},80%,65%)`; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`✦ ${bossName} DEFEATED ✦`, W/2, H/2 - 20);
      ctx.fillStyle = '#aaddff'; ctx.font = '20px monospace';
      ctx.fillText('The darkness recedes.', W/2, H/2 + 18);
    } else {
      ctx.fillStyle = '#d4a855'; ctx.font = 'bold 52px monospace'; ctx.textAlign = 'center';
      ctx.fillText('★ YOU WIN! ★', W/2, H/2 - 10);
    }
    ctx.fillStyle = '#fff'; ctx.font = '24px monospace';
    ctx.fillText('Score: ' + String(score).padStart(6,'0'), W/2, H/2 + 50);
    ctx.fillText(`LVL ${currentLevel + 1} — Press R or LVL to continue`, W/2, H/2 + 80);
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
  { id: 's-dashCount',     vid: 'v-dashCount',     key: 'dashCount',     fmt: v => Math.round(v) },
  { id: 's-dashChain',     vid: 'v-dashChain',     key: 'dashChain',     fmt: v => Math.round(v) },
  { id: 's-stompKill',    vid: 'v-stompKill',    key: 'stompKill',    fmt: v => v > 0 ? 'on' : 'off' },
  { id: 's-batScale',    vid: 'v-batScale',    key: 'batScale',     fmt: v => v.toFixed(1) + '×' },
  { id: 's-smoothing',  vid: 'v-smoothing',   key: 'smoothing',    fmt: v => v > 0 ? 'smooth' : 'pixel' },
  { id: 's-spriteRot',    vid: 'v-spriteRot',    key: 'spriteRot',    fmt: v => Math.round(v) + '°' },
  { id: 's-spriteOffset', vid: 'v-spriteOffset', key: 'spriteOffset', fmt: v => Math.round(v) + 'px' },
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
let totalCoins = parseInt(localStorage.getItem('axo_totalCoins') || '0');

function saveAbilities() {
  localStorage.setItem('axo_totalCoins', totalCoins);
  localStorage.setItem('axo_abilities', JSON.stringify([...abilityMenu.purchased]));
}

const ABILITY_COST = 30;
const ABILITY_DEFS = [
  {
    group: 'DASH',
    items: [
      { id: 'dash1', label: '1 Dash',   desc: 'Dash once in mid-air',        cfgKey: 'dashCount', cfgVal: 1 },
      { id: 'dash2', label: '2 Dashes', desc: 'Dash twice in mid-air',       cfgKey: 'dashCount', cfgVal: 2 },
      { id: 'dash3', label: '3 Dashes', desc: 'Dash three times in mid-air', cfgKey: 'dashCount', cfgVal: 3 },
    ],
  },
  {
    group: 'HOMING',
    items: [
      { id: 'home1', label: '1-Kill Chain', desc: '1 homing kill per jump',       cfgKey: 'homingChain', cfgVal: 1 },
      { id: 'home2', label: '2-Kill Chain', desc: 'Chain 2 kills before landing', cfgKey: 'homingChain', cfgVal: 2 },
      { id: 'home3', label: '3-Kill Chain', desc: 'Chain 3 kills before landing', cfgKey: 'homingChain', cfgVal: 3 },
    ],
  },
  {
    group: 'STOMP',
    items: [
      { id: 'stomp', label: 'Down Pound', desc: 'Jump on enemy heads to damage and kill', cfgKey: 'stompKill', cfgVal: 1 },
    ],
  },
];

const abilityMenu = {
  open: false,
  purchased: new Set(JSON.parse(localStorage.getItem('axo_abilities') || '["dash1"]')),
  cursor: { group: 0, item: 0 },
  flashTimer: 0, // flashes on failed purchase
};

// Apply purchased abilities to CFG on load
(function applyPurchased() {
  for (const grp of ABILITY_DEFS) {
    let best = null;
    for (const item of grp.items) { if (abilityMenu.purchased.has(item.id)) best = item; }
    if (best) CFG[best.cfgKey] = best.cfgVal;
  }
})();

function canBuyAbility(grp, item) {
  if (abilityMenu.purchased.has(item.id)) return false;
  if (totalCoins < ABILITY_COST) return false;
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
  const vig = ctx.createRadialGradient(W/2, H/2, 60, W/2, H/2, W * 0.75);
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

  // Orb counter — top right
  const orbX = px + pw - 16;
  ctx.textAlign = 'right';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,200,60,0.5)';
  ctx.fillText('◆', orbX - 38, py + 28);
  ctx.fillStyle = '#ffd84a';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(totalCoins, orbX, py + 29);

  // Thin separator
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(px, py + 46, pw, 1);

  // Hint bar bottom
  ctx.textAlign = 'center';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('← → navigate   ·   ENTER purchase   ·   TAB close', W / 2, py + ph - 10);
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

      // Label
      ctx.textAlign = 'left';
      ctx.font = `600 13px system-ui, sans-serif`;
      ctx.fillStyle = owned ? '#7eed7e' : locked ? 'rgba(255,255,255,0.2)' : selected ? '#ffe090' : 'rgba(255,255,255,0.8)';
      ctx.fillText(item.label, bx + 14, by + 22);

      // Cost badge (top-right of card)
      if (!owned) {
        const costAlpha = locked ? 0.2 : buyable ? 1 : 0.5;
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(255,210,50,${costAlpha})`;
        ctx.fillText('◆ 30', bx + cardW - 10, by + 22);
      } else {
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(80,220,80,0.7)';
        ctx.fillText('✓', bx + cardW - 10, by + 22);
      }

      // Description
      ctx.textAlign = 'left';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = owned ? 'rgba(120,220,120,0.55)' : locked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.38)';
      ctx.fillText(item.desc, bx + 14, by + 40);

      // Status line
      if (selected && buyable) {
        ctx.font = `bold 10px system-ui, sans-serif`;
        ctx.fillStyle = `rgba(255,200,60,${0.6 + pulse * 0.4})`;
        ctx.fillText('Press ENTER to unlock', bx + 14, by + 60);
      } else if (selected && locked && totalCoins < ABILITY_COST) {
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(220,80,60,0.7)';
        ctx.fillText('Need ' + ABILITY_COST + ' orbs  (' + totalCoins + ' owned)', bx + 14, by + 60);
      } else if (selected && locked) {
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillText('Unlock previous ability first', bx + 14, by + 60);
      }
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
      totalCoins -= ABILITY_COST;
      abilityMenu.purchased.add(item.id);
      CFG[item.cfgKey] = item.cfgVal;
      saveCFG();
      saveAbilities();
    } else if (!abilityMenu.purchased.has(item.id)) {
      abilityMenu.flashTimer = 20;
    }
  }
  if (e.code === 'Escape') abilityMenu.open = false;
});
