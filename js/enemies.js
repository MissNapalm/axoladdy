
function updateChaser() {
  const lv = LEVELS[currentLevel];
  if (!lv?.isTestLevel && !lv?.hasChaserEncounter) return;

  if (!chaser.triggered && !chaser.active && player.x >= (lv.chaserTriggerX || 12 * TILE)) {
    chaser.triggered = true;
    chaser.active = true;
    chaser.descending = true;
    chaser.x = player.x;
    chaser.y = player.y - 600;
    chaser.vx = 0; chaser.vy = 0;
    chaser.state = 'hover'; chaser.stateTimer = 180;
  }

  // Exit zone — flee upward and deactivate
  if (lv.chaserExitX && chaser.active && !chaser.dead && player.x >= lv.chaserExitX) {
    chaser.vy -= 3;
    chaser.y += chaser.vy;
    if (chaser.y < -200) { chaser.active = false; chaser.triggered = false; }
    return;
  }

  if (!chaser.active) return;
  chaser.wobble += 0.06;

  if (chaser.dead) {
    chaser.deadTimer--;
    const groundFloor = (groundY - 1) * TILE;

    chaser.deathPhaseTimer++;

    if (chaser.deathPhase === 'fall') {
      // Very slow fall with white explosions — until it hits the ground
      chaser.deathFallVy += 0.018;
      chaser.y += chaser.deathFallVy;
      if (chaser.deathPhaseTimer % 10 === 0) {
        const ox = (Math.random() - 0.5) * chaser.w * 2.5;
        const oy = (Math.random() - 0.5) * chaser.h * 2.5;
        spawnWhiteExplosion(chaser.x + chaser.w / 2 + ox, chaser.y + chaser.h / 2 + oy);
      }
      if (chaser.y + chaser.h >= groundFloor) {
        chaser.y = groundFloor - chaser.h;
        chaser.deathPhase = 'flash';
        chaser.deathPhaseTimer = 0;
        chaser.deathFlashR = 0;
        screenShake = 60;
        playSound('explode', 1.0);
      }

    } else if (chaser.deathPhase === 'flash') {
      // Slow white flash expands to fill entire screen then fades
      chaser.deathFlashR += 6 * 0.65;
      if (chaser.deathPhaseTimer >= 420) chaser.active = false;
    }
    return;
  }

  if (chaser.hitFlash > 0) chaser.hitFlash--;

  // Update active bolt
  if (chaser.bolt) {
    const b = chaser.bolt;
    b.x += b.vx; b.y += b.vy;
    b.life--;
    // Kill bolt on ground/ceiling contact or expiry (mark dead so homing cancels)
    if (b.y >= groundY * TILE || b.y < 0 || b.life <= 0) {
      b.dead = true; chaser.bolt = null;
    } else if (b.reflected) {
      // Reflected bolt — check if it hits the chaser
      const cr = { x: chaser.x, y: chaser.y, w: chaser.w, h: chaser.h };
      const br2 = { x: b.x - 8, y: b.y - 8, w: 16, h: 16 };
      if (rectsOverlap(br2, cr)) {
        chaser.hp--;
        chaser.hitFlash = 14;
        spawnExplosion(chaser.x + chaser.w / 2, chaser.y + chaser.h / 2, false);
        b.dead = true; chaser.bolt = null;
        if (chaser.hp <= 0) {
          chaser.dead = true; chaser.deadTimer = 9999;
          chaser.deathPhase = 'fall';
          chaser.deathPhaseTimer = 0;
          chaser.deathFallVy = 0;
          chaser.deathFlashR = 0;
          screenShake = 35;
          chaserCleared = true;
        }
      }
    } else {
      // Normal bolt — dash or homing at the moment of contact reflects it; otherwise takes damage
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      const br = { x: b.x - 18, y: b.y - 18, w: 36, h: 36 };
      if (rectsOverlap(br, pr)) {
        const dashing = player.dashFrames > 0;
        const homingNow = player.homing;
        const canReflect = dashing || homingNow;
        if (canReflect) {
          b.reflected = true;
          const tcx = chaser.x + chaser.w / 2;
          const tcy = chaser.y + chaser.h / 2;
          const dx = tcx - b.x, dy = tcy - b.y;
          const dist = Math.hypot(dx, dy) || 1;
          const spd = Math.hypot(b.vx, b.vy) * 1.4;
          b.vx = (dx / dist) * spd;
          b.vy = (dy / dist) * spd;
          b.life = 240;
          player.homing = false; player.homingTarget = null;
          player.vy = -8; player.vx = player.dir * CFG.moveSpeed * 1.5;
          spawnExplosion(b.x, b.y, false);
        } else if (player.invincible === 0) {
          hurtPlayer(1); player.invincible = 60;
          player.vy = -6; player.vx = (player.x < b.x ? -1 : 1) * 8;
          if (hp <= 0) { killPlayer(); return; }
          b.dead = true; chaser.bolt = null;
        }
      }
    }
  }

  if (chaser.descending) {
    const targetX = player.x + chaser.targetOffX;
    const targetY = player.y + chaser.targetOffY;
    const dx = targetX - chaser.x, dy = targetY - chaser.y;
    chaser.vx += dx * 0.04; chaser.vy += dy * 0.04;
    chaser.vx *= 0.7;       chaser.vy *= 0.7;
    chaser.x += chaser.vx;  chaser.y += chaser.vy;
    chaser.stateTimer--;
    if (Math.sqrt(dx*dx+dy*dy) < 20 || chaser.stateTimer <= 120) chaser.descending = false;
    return;
  }

  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const cx = chaser.x + chaser.w / 2;
  const cy = chaser.y + chaser.h / 2;

  chaser.stateTimer--;

  if (chaser.state === 'hover') {
    chaser.targetOffX = Math.abs(chaser.targetOffX);
    const tx = player.x + chaser.targetOffX;
    const ty = player.y + chaser.targetOffY + Math.sin(chaser.wobble) * 10;
    const dx = tx - chaser.x, dy = ty - chaser.y;
    chaser.vx += dx * 0.1; chaser.vy += dy * 0.1;
    chaser.vx *= 0.75;     chaser.vy *= 0.75;
    chaser.x += chaser.vx; chaser.y += chaser.vy;
    if (chaser.stateTimer <= 0) {
      chaser.state = 'aiming';
      chaser.stateTimer = 120; // 2s of laser tracking
      chaser.laserAngle = Math.atan2(py - cy, px - cx);
      playSound('charging', 0.6);
    }

  } else if (chaser.state === 'aiming') {
    // Thin red laser tracks player freely
    chaser.vx = 0; chaser.vy = 0;
    const targetAngle = Math.atan2(py - cy, px - cx);
    let diff = targetAngle - chaser.laserAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    chaser.laserAngle += diff * 0.12;
    if (chaser.stateTimer <= 0) {
      chaser.state = 'telegraph';
      chaser.stateTimer = 45; // ~0.75s of locked-on thick beam before firing
    }

  } else if (chaser.state === 'telegraph') {
    // Locked on — thick bright beam, angle freezes on player position at lock moment
    chaser.vx = 0; chaser.vy = 0;
    // Angle is frozen — don't update laserAngle here
    if (chaser.stateTimer <= 0) {
      const speed = 22;
      chaser.bolt = {
        x: cx, y: cy,
        vx: Math.cos(chaser.laserAngle) * speed,
        vy: Math.sin(chaser.laserAngle) * speed,
        life: 120, reflected: false, dead: false,
        w: 16, h: 16,
      };
      chaser.hitFlash = 0;
      chaser.state = 'cooldown';
      chaser.stateTimer = 60; // 1s before resuming hover
      playSound('laser', 0.8);
    }

  } else if (chaser.state === 'cooldown') {
    // Hold position after firing — drift to a stop, don't chase
    chaser.vx *= 0.88; chaser.vy *= 0.88;
    chaser.x += chaser.vx; chaser.y += chaser.vy;
    if (chaser.stateTimer <= 0) {
      chaser.state = 'hover';
      chaser.stateTimer = 60;
    }
  }

  // Contact damage
  if (player.invincible === 0 && !player.homing) {
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    const cr = { x: chaser.x, y: chaser.y, w: chaser.w, h: chaser.h };
    if (rectsOverlap(pr, cr)) {
      hurtPlayer(1); player.invincible = 60;
      player.vy = -6; player.vx = (player.x < chaser.x + chaser.w / 2 ? -1 : 1) * 8;
      if (hp <= 0) { killPlayer(); return; }
    }
  }
}

function drawChaser() {
  const lv = LEVELS[currentLevel];
  if ((!lv?.isTestLevel && !lv?.hasChaserEncounter) || !chaser.active) return;

  const scx = Math.round(chaser.x - camera + chaser.w / 2);
  const scy = Math.round(chaser.y + chaser.h / 2);
  // Clamp scy so the eye sprite never gets cut off at the top of the canvas
  const eyeHCalc = CHASER_R * 2.6 * 1.3 * 1.4 * 1.15;
  const scyClamped = Math.max(scy, eyeHCalc / 2 + 4);
  const r = CHASER_R;
  // Draw active bolt
  if (chaser.bolt) {
    const b = chaser.bolt;
    const bx = b.x - camera, by = b.y;
    const fade = b.life / 120;
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang);
    // Outer fire glow
    const grad = ctx.createLinearGradient(-44, 0, 14, 0);
    grad.addColorStop(0, 'rgba(255,60,0,0)');
    grad.addColorStop(0.35, `rgba(255,120,0,${fade * 0.5})`);
    grad.addColorStop(1, `rgba(255,220,80,${fade * 0.7})`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(0, 0, 44, 13, 0, 0, Math.PI * 2); ctx.fill();
    // Mid fire body
    const grad2 = ctx.createLinearGradient(-28, 0, 10, 0);
    grad2.addColorStop(0, `rgba(255,80,0,0)`);
    grad2.addColorStop(0.4, `rgba(255,160,20,${fade})`);
    grad2.addColorStop(1, `rgba(255,240,120,${fade})`);
    ctx.fillStyle = grad2;
    ctx.beginPath(); ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Bright white-hot core
    ctx.fillStyle = `rgba(255,255,220,${fade})`;
    ctx.beginPath(); ctx.ellipse(6, 0, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${fade * 0.95})`;
    ctx.beginPath(); ctx.ellipse(7, 0, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Big screen-fill flash during death
  if (chaser.dead && chaser.deathPhase === 'flash' && chaser.deathFlashR > 0) {
    const flashCx = chaser.x + chaser.w / 2 - camera;
    const flashCy = chaser.y + chaser.h / 2;
    const maxR = Math.sqrt(W * W + H * H);
    const progress = Math.min(chaser.deathFlashR / maxR, 1);
    const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    ctx.save();
    ctx.globalAlpha = Math.min(alpha * 1.4, 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(flashCx, flashCy, chaser.deathFlashR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (chaser.dead && chaser.deathPhase === 'flash') ctx.globalAlpha = Math.max(0, 1 - chaser.deathFlashR / 120);
  else ctx.globalAlpha = 1;

  // Draw laser beam
  if (chaser.state === 'aiming' || chaser.state === 'telegraph') {
    const beamLen = 800;
    const ex = scx + Math.cos(chaser.laserAngle) * beamLen;
    const ey = scyClamped + Math.sin(chaser.laserAngle) * beamLen;
    ctx.save();
    ctx.lineCap = 'round';

    if (chaser.state === 'aiming') {
      // Thin red targeting beam with soft glow
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(scx, scyClamped); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(scx, scyClamped); ctx.lineTo(ex, ey); ctx.stroke();
    } else {
      // Telegraph: locked on — flickering charge beam
      const chargeT = 1 - (chaser.stateTimer / 45); // 0→1 as it charges
      const flicker = 0.7 + 0.3 * Math.sin(performance.now() * 0.04);
      const baseW = 3 + chargeT * 5; // max outer ~8px, not massive
      const outerW = baseW * flicker;
      const coreW  = (1 + chargeT * 3) * flicker;

      // Outer glow
      ctx.globalAlpha = (0.2 + chargeT * 0.35) * flicker;
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = outerW + 6;
      ctx.beginPath(); ctx.moveTo(scx, scyClamped); ctx.lineTo(ex, ey); ctx.stroke();
      // Mid layer
      ctx.globalAlpha = (0.5 + chargeT * 0.5) * flicker;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = outerW;
      ctx.beginPath(); ctx.moveTo(scx, scyClamped); ctx.lineTo(ex, ey); ctx.stroke();
      // Orange-white core
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffcc44';
      ctx.lineWidth = coreW;
      ctx.beginPath(); ctx.moveTo(scx, scyClamped); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.restore();
  }

  // Outer glow
  const glowR = r + 8 + 3 * Math.sin(chaser.wobble);
  const grad = ctx.createRadialGradient(scx, scyClamped, r * 0.3, scx, scyClamped, glowR);
  grad.addColorStop(0, 'rgba(40,120,255,0.4)');
  grad.addColorStop(1, 'rgba(40,120,255,0)');
  ctx.beginPath(); ctx.arc(scx, scyClamped, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();

  const flashWhite = chaser.hitFlash > 0;
  const isVulnerable = chaser.state === 'telegraph';
  const eyeBlink = isVulnerable && Math.floor(performance.now() / 80) % 2 === 0;

  // eye.png is 1200×952 — draw at correct aspect ratio, flipped horizontally
  const eyeH = r * 2.6 * 1.3 * 1.4 * 1.15 * 1.35;
  const eyeW = eyeH * (1200 / 952);
  ctx.save();
  if (flashWhite || eyeBlink) ctx.filter = 'brightness(10) saturate(0)';
  ctx.translate(scx, scyClamped);
  ctx.scale(-1, 1);
  if (eyeImg.complete && eyeImg.naturalWidth > 0) {
    ctx.drawImage(eyeImg, -eyeW / 2, -eyeH / 2, eyeW, eyeH);
  } else {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2255ee'; ctx.fill();
  }
  ctx.filter = 'none';
  ctx.restore();

  // HP bar
  const barW = r * 2.5, barH = 4;
  const barX = scx - barW / 2, barY = scyClamped - r - 12;
  ctx.fillStyle = '#222'; ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#3388ff'; ctx.fillRect(barX, barY, barW * (chaser.hp / chaser.maxHp), barH);

  ctx.restore();
}

// ── Boss ──────────────────────────────────────────────────────────────────────
const BOSS_MAX_HP  = 18;
const BOSS_ARENA_X = 15 * TILE;   // left wall of arena
const BOSS_ARENA_R = 125 * TILE;  // right wall of arena
const BOSS_GROUND  = (groundY - 1) * TILE; // y when "standing"

const boss = {
  active: false,
  x: 60 * TILE, y: 4 * TILE,
  w: 72, h: 72,
  hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP,
  phase: 1,            // 1 / 2 / 3
  state: 'idle',       // idle | teleport | charge | fly | summon | slam | dead
  stateTimer: 0,
  vx: 0, vy: 0,
  dir: -1,
  hitFlash: 0,
  lockFlash: 0,
  dead: false,
  deadTimer: 0,
  flying: true,        // so homing targets it
  // teleport
  teleportAlpha: 0,
  teleportTarget: { x: 0, y: 0 },
  // charge
  chargeSpeed: 0,
  // slam weak points (phase 3) — small orbs that orbit the boss and must be homed into
  orbs: [],
  orbCooldown: 0,
  // ring projectile burst cooldown
  ringCooldown: 0,
  // eye glow pulse
  eyePulse: 0,
  // shake when hit
  shakeX: 0,
};

function bossPhaseFromHp() {
  const ratio = boss.hp / boss.maxHp;
  if (ratio > 0.6) return 1;
  if (ratio > 0.3) return 2;
  return 3;
}

function damageBoss(dmg) {
  if (boss.dead || boss.hitFlash > 0) return false;
  boss.hp -= dmg;
  boss.hitFlash = 20;
  boss.shakeX = 8;
  score += 500; updateHUD();
  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.dead = true;
    boss.deadTimer = 180;
    boss.state = 'dead';
    spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, true);
    comboCount += 5; comboTimer = 180;
    score += 5000; updateHUD();
    return true;
  }
  spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, true);
  return false;
}

function bossSpawnOrbs() {
  boss.orbs = [];
  const count = boss.phase === 3 ? 6 : 4;
  for (let i = 0; i < count; i++) {
    boss.orbs.push({
      angle: (i / count) * Math.PI * 2,
      speed: 0.04 + boss.phase * 0.01,
      radius: 55 + i * 8,
      dead: false, deadTimer: 0,
      hp: 1, maxHp: 1, hitFlash: 0, lockFlash: 0,
      flying: true,
      // computed each frame:
      x: 0, y: 0, w: 20, h: 20,
    });
  }
}

function updateBoss() {
  if (!boss.active) return;
  if (boss.dead) {
    boss.deadTimer--;
    if (boss.deadTimer <= 0) { won = true; player.wonSlide = true; score += 1000; updateHUD(); }
    return;
  }

  boss.phase = bossPhaseFromHp();
  if (boss.hitFlash > 0) boss.hitFlash--;
  if (boss.shakeX > 0) boss.shakeX = Math.max(0, boss.shakeX - 1.2);
  boss.eyePulse += 0.08;

  // Update orbiting orbs
  for (let i = boss.orbs.length - 1; i >= 0; i--) {
    const o = boss.orbs[i];
    if (o.dead) { o.deadTimer--; if (o.deadTimer <= 0) boss.orbs.splice(i, 1); continue; }
    o.angle += o.speed;
    o.x = boss.x + boss.w / 2 + Math.cos(o.angle) * o.radius - o.w / 2;
    o.y = boss.y + boss.h / 2 + Math.sin(o.angle) * o.radius - o.h / 2;
    if (o.hitFlash > 0) o.hitFlash--;
    if (o.lockFlash > 0) o.lockFlash--;

    // Player homing into orb
    if (player.homingTarget === o) {
      const tx = o.x + o.w / 2, ty = o.y + o.h / 2;
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      const dx = tx - px, dy = ty - py;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        o.dead = true; o.deadTimer = 30;
        player.homing = false; player.homingTarget = null;
        player.vy = -6;
        player.vx = player.dir * CFG.moveSpeed * 1.5;
        player.spinning = false; 
        comboCount++; comboTimer = 120;
        // Each orb death damages boss
        damageBoss(1);
      } else {
        player.vx = (dx / dist) * HOMING_SPEED;
        player.vy = (dy / dist) * HOMING_SPEED;
        if (player.vx > 0) player.dir = 1; else player.dir = -1;
        spawnTrail(player.x + player.w / 2, player.y + player.h / 2);
      }
    }

    // Orb damages player on contact
    if (!o.dead && player.invincible === 0 && !player.homing && !player.ballForm && !player.dashFrames) {
      if (rectsOverlap({ x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 6 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
        hurtPlayer(1); player.invincible = 80;
        player.vy = -8; player.vx = (player.x < o.x ? -1 : 1) * 9;
        if (hp <= 0) { killPlayer(); return; }
      }
    }
  }
  // All orbs gone — boss takes direct hit vulnerability window handled via state machine below

  boss.stateTimer--;

  // ── State machine ───────────────────────────────────────────────────────────
  const px = player.x + player.w / 2, py = player.y + player.h / 2;
  const bx = boss.x + boss.w / 2, by = boss.y + boss.h / 2;

  if (boss.state === 'idle') {
    // Hover gently
    boss.vy = Math.sin(performance.now() / 400) * 0.5;
    boss.y += boss.vy;
    boss.dir = px < bx ? -1 : 1;

    if (boss.stateTimer <= 0) {
      // Choose next attack based on phase
      const r = Math.random();
      if (boss.phase === 1) {
        if (r < 0.4) { boss.state = 'teleport'; boss.stateTimer = 30; }
        else if (r < 0.7) { boss.state = 'summon'; boss.stateTimer = 20; }
        else { boss.state = 'ring'; boss.stateTimer = 10; }
      } else if (boss.phase === 2) {
        if (r < 0.35) { boss.state = 'charge'; boss.stateTimer = 20; boss.chargeSpeed = 0; }
        else if (r < 0.65) { boss.state = 'ring'; boss.stateTimer = 10; }
        else { boss.state = 'summon'; boss.stateTimer = 20; }
      } else {
        if (r < 0.3) { boss.state = 'slam'; boss.stateTimer = 30; }
        else if (r < 0.6) { boss.state = 'ring'; boss.stateTimer = 8; }
        else { boss.state = 'summon'; boss.stateTimer = 15; }
      }
    }

  } else if (boss.state === 'teleport') {
    // Flash out, reappear above player
    boss.teleportAlpha = Math.max(0, boss.stateTimer / 30);
    if (boss.stateTimer <= 0) {
      const tx = Math.max(BOSS_ARENA_X, Math.min(BOSS_ARENA_R - boss.w, px - boss.w / 2 + (Math.random() - 0.5) * 180));
      boss.x = tx;
      boss.y = py - 120 - Math.random() * 80;
      boss.y = Math.max(TILE, boss.y);
      boss.teleportAlpha = 1;
      boss.state = 'idle';
      boss.stateTimer = 60 + Math.floor(Math.random() * 40);
      // Fire 8-way burst on reappear
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const spd = 3.5 + boss.phase;
        projectiles.push({ x: bx, y: by, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 110, flying: true });
      }
      playSound('laser', 0.5);
    }

  } else if (boss.state === 'summon') {
    if (boss.stateTimer === 19) bossSpawnOrbs();
    boss.vy = Math.sin(performance.now() / 300) * 0.3;
    boss.y += boss.vy;
    if (boss.stateTimer <= 0) {
      boss.state = 'idle';
      boss.stateTimer = 80 + Math.floor(Math.random() * 60);
    }

  } else if (boss.state === 'ring') {
    // Fire concentric rings of projectiles aimed at player
    if (boss.stateTimer % 8 === 0) {
      const count = 6 + boss.phase * 2;
      for (let a = 0; a < count; a++) {
        const ang = (a / count) * Math.PI * 2 + (boss.stateTimer * 0.15);
        const spd = 2.8 + boss.phase * 0.6;
        projectiles.push({ x: bx, y: by, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 140, flying: true });
      }
      playSound('laser', 0.4);
    }
    if (boss.stateTimer <= 0) {
      boss.state = 'idle';
      boss.stateTimer = 70 + Math.floor(Math.random() * 50);
    }

  } else if (boss.state === 'charge') {
    // Phase 2+: charge across arena
    if (boss.stateTimer > 0 && boss.stateTimer <= 20) {
      // Wind-up — face player
      boss.dir = px < bx ? -1 : 1;
      boss.chargeSpeed = 0;
    } else {
      boss.chargeSpeed = -boss.dir * (12 + boss.phase * 2);
      boss.x += boss.chargeSpeed;
      // Bounce off arena walls
      if (boss.x < BOSS_ARENA_X) { boss.x = BOSS_ARENA_X; boss.dir *= -1; boss.stateTimer = Math.min(boss.stateTimer, 8); }
      if (boss.x + boss.w > BOSS_ARENA_R) { boss.x = BOSS_ARENA_R - boss.w; boss.dir *= -1; boss.stateTimer = Math.min(boss.stateTimer, 8); }
      // Spray projectiles during charge
      if (Math.random() < 0.3) {
        const spd = 3 + boss.phase;
        projectiles.push({ x: bx, y: by + 10, vx: (Math.random() - 0.5) * 4, vy: spd, life: 100, flying: true });
        playSound('laser', 0.3);
      }
    }
    if (boss.stateTimer <= 0) {
      boss.vx = 0;
      boss.state = 'idle';
      boss.stateTimer = 50 + Math.floor(Math.random() * 40);
    }

  } else if (boss.state === 'slam') {
    // Phase 3: dive-bomb straight down at player, then back up
    if (boss.stateTimer > 15) {
      boss.vy = 0;
    } else if (boss.stateTimer > 0) {
      boss.vy = 14;
    } else {
      boss.vy = -10;
      boss.y += boss.vy;
      if (boss.y <= 2 * TILE) {
        boss.vy = 0;
        boss.state = 'idle';
        boss.stateTimer = 50;
        // Shockwave ring on return
        for (let a = 0; a < 12; a++) {
          const ang = (a / 12) * Math.PI * 2;
          projectiles.push({ x: bx, y: by, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, life: 120, flying: true });
        }
        playSound('laser', 0.5);
      }
    }
    boss.y += boss.vy;
    boss.y = Math.max(TILE, Math.min(BOSS_GROUND - boss.h, boss.y));
  }

  // Clamp boss to arena
  boss.x = Math.max(BOSS_ARENA_X, Math.min(BOSS_ARENA_R - boss.w, boss.x));
  boss.y = Math.max(TILE * 0.5, Math.min(BOSS_GROUND - boss.h, boss.y));

  // Boss body — player dash collision (damages boss directly when no orbs)
  const allOrbsDead = boss.orbs.every(o => o.dead);
  const bRect = { x: boss.x + 6, y: boss.y + 6, w: boss.w - 12, h: boss.h - 12 };
  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectsOverlap(bRect, pRect)) {
    if (player.dashFrames > 0 && boss.hitFlash === 0) {
      damageBoss(1);
      player.vx = -Math.sign(player.vx) * 10;
      player.vy = -7; player.dashFrames = 0; player.onGround = false;
    } else if (player.homing && player.homingTarget === boss && allOrbsDead) {
      damageBoss(1);
      player.homing = false; player.homingTarget = null;
      player.vy = Math.min(player.vy, -CFG.jump1 * 0.3);
      player.vx = player.dir * CFG.moveSpeed * 1.5;
       comboCount++; comboTimer = 120;
    } else if (!player.homing && !player.ballForm && !player.dashFrames && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 80;
      player.vy = -9; player.vx = (player.x < bx ? -1 : 1) * 10;
      if (hp <= 0) { killPlayer(); return; }
    }
  }

  // Boss homing target — only when orbs are dead or phase 1 with no orbs
  // (handled in nearestLiveGoomba extension below)
}

function drawBoss() {
  if (!boss.active) return;
  const bsx = boss.x - camera;
  if (bsx < -200 || bsx > W + 200) return;

  const t = performance.now() / 400;
  const phase = boss.phase;
  const alpha = boss.state === 'teleport' ? Math.max(0.05, boss.stateTimer / 30) : 1;
  const shk = Math.sin(performance.now() * 0.8) * (boss.shakeX > 0 ? boss.shakeX : 0);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(bsx + boss.w / 2 + shk, boss.y + boss.h / 2);

  // Phase-based tint
  const bodyColor  = phase === 1 ? '#1a0828' : phase === 2 ? '#280810' : '#080018';
  const accentColor= phase === 1 ? '#6600cc' : phase === 2 ? '#cc0044' : '#0044cc';
  const glowColor  = phase === 1 ? '#aa44ff' : phase === 2 ? '#ff2255' : '#44aaff';

  // Outer aura
  const grad = ctx.createRadialGradient(0, 0, boss.w * 0.3, 0, 0, boss.w * 0.9);
  grad.addColorStop(0, accentColor + '44');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0, 0, boss.w * 0.9, boss.h * 0.9, 0, 0, Math.PI * 2); ctx.fill();

  // Main body
  ctx.fillStyle = boss.hitFlash > 0 && Math.floor(boss.hitFlash / 3) % 2 === 0 ? '#ffffff' : bodyColor;
  ctx.beginPath(); ctx.ellipse(0, 0, boss.w / 2, boss.h / 2, 0, 0, Math.PI * 2); ctx.fill();

  // Carapace plates
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = alpha * 0.7;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.2;
    const px2 = Math.cos(a) * boss.w * 0.38, py2 = Math.sin(a) * boss.h * 0.38;
    ctx.beginPath(); ctx.ellipse(px2, py2, 10, 6, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = alpha;

  // Eyes — large, glowing
  const eyeGlow = 0.6 + 0.4 * Math.sin(boss.eyePulse * 3);
  ctx.fillStyle = glowColor;
  ctx.globalAlpha = alpha * eyeGlow;
  ctx.beginPath(); ctx.ellipse(-14, -8, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, -8, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.ellipse(-14, -8, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, -8, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.ellipse(-14 + boss.dir * 2, -8, 2.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14 + boss.dir * 2, -8, 2.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  // Mouth — jagged when attacking
  ctx.strokeStyle = glowColor; ctx.lineWidth = 2; ctx.globalAlpha = alpha * 0.9;
  ctx.beginPath();
  if (boss.state === 'charge' || boss.state === 'slam') {
    // Open maw
    ctx.moveTo(-18, 12);
    for (let i = 0; i < 6; i++) ctx.lineTo(-18 + i * 6 + (i % 2 === 0 ? 0 : 3), 12 + (i % 2 === 0 ? 8 : 0));
    ctx.lineTo(18, 12);
  } else {
    ctx.arc(0, 10, 14, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // HP bar above boss
  const barW = boss.w * 1.8, barH = 7;
  const barX = -barW / 2, barY = -boss.h / 2 - 20;
  ctx.fillStyle = '#220000'; ctx.fillRect(barX, barY, barW, barH);
  const hpRatio = boss.hp / boss.maxHp;
  const hpColor = hpRatio > 0.6 ? '#aa44ff' : hpRatio > 0.3 ? '#ff2255' : '#44aaff';
  ctx.fillStyle = hpColor; ctx.fillRect(barX, barY, barW * hpRatio, barH);
  ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('LEVIATHAN', 0, barY - 3);

  ctx.restore();

  // Draw orbiting orbs (outside the translated context)
  for (const o of boss.orbs) {
    if (o.dead) continue;
    const osx = o.x - camera;
    const pulse = 0.7 + 0.3 * Math.sin(o.angle * 3 + t);
    ctx.save();
    ctx.globalAlpha = 0.5 * pulse;
    ctx.fillStyle = glowColor;
    ctx.beginPath(); ctx.arc(osx + o.w / 2, o.y + o.h / 2, o.w * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (o.hitFlash > 0 && Math.floor(o.hitFlash / 3) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = accentColor;
    }
    ctx.beginPath(); ctx.arc(osx + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2); ctx.fill();
    if (player.homingTarget === o || o.lockFlash > 0) drawLockOn(o);
    ctx.restore();
  }

  // Draw lock-on on boss itself if targeted
  if (player.homingTarget === boss || boss.lockFlash > 0) drawLockOn(boss);
}

// ── Abyssal Wraith ────────────────────────────────────────────────────────────
const WRAITH_MAX_HP   = 24;
const WRAITH_ARENA_X  = 10 * TILE;
const WRAITH_ARENA_R  = 135 * TILE;
const WRAITH_GROUND   = (groundY - 1) * TILE;

const wraith = {
  active: false,
  x: 70 * TILE, y: 3 * TILE,
  w: 80, h: 80,
  hp: WRAITH_MAX_HP, maxHp: WRAITH_MAX_HP,
  phase: 1,
  state: 'idle', stateTimer: 120,
  vx: 0, vy: 0, dir: -1,
  hitFlash: 0, lockFlash: 0,
  dead: false, deadTimer: 0,
  flying: true,
  eyePulse: 0, shakeX: 0,
  dashWalls: [],
  gravZones: [],
  clones: [],
  shockwaves: [],
  tentacles: [],
  telegraphTimer: 0,
  telegraphType: '',
  invulTimer: 0,
  surgeCount: 0,
  surgePhase: 'none',
  surgeLockX: 0,
};

// ── The Warden ────────────────────────────────────────────────────────────────
const WARDEN_MAX_HP  = 16;
const WARDEN_ARENA_X = 10 * TILE;
const WARDEN_ARENA_R = 135 * TILE;
const WARDEN_GROUND  = groundY * TILE;       // actual ground (stomp landing)
const WARDEN_HOVER   = WARDEN_GROUND - TILE; // normal float height (1 tile up)

const warden = {
  active: false,
  x: 70 * TILE, y: WARDEN_HOVER,
  w: 72, h: 72,
  hp: WARDEN_MAX_HP, maxHp: WARDEN_MAX_HP,
  phase: 1,
  state: 'idle', stateTimer: 90,
  vx: 0, vy: 0, dir: -1,
  hitFlash: 0, lockFlash: 0,
  dead: false, deadTimer: 0,
  flying: false,
  onGround: true,
  eyePulse: 0, shakeX: 0,
  shockwaves: [],
  rocks: [],
  invulTimer: 0,
  homingCooldown: 0,
  vulnTimer: 0,       // frames the warden is open to damage after all sentinels die
  sentinels: [],      // 3 red pulsing bats
  homingHits: 0,      // homing hits this cycle; at 3 → homing_stun + dive
  chargeWobble: 0,    // phase angle for vertical bob during charge
};

// ── Red Bat mini-boss (level 1 end) ──────────────────────────────────────────
const RB_MAX_HP = 6;
const RB_SIZE   = Math.round(TILE * 1.8);
const redBat = {
  active: false,
  x: 0, y: 0,
  baseX: 0, baseY: 0,   // hover anchor
  w: RB_SIZE, h: RB_SIZE,
  hp: RB_MAX_HP, maxHp: RB_MAX_HP,
  wobble: 0,
  dead: false, deadTimer: 0,
  hitFlash: 0,
  state: 'idle',         // idle | freeze | charge | return
  stateTimer: 0,
  chargeVx: 0, chargeVy: 0,
  phase2: false,         // triggered at 3 HP
};

function damageRedBat(dmg) {
  if (redBat.dead || redBat.hitFlash > 0) return false;
  redBat.hp -= dmg;
  redBat.hitFlash = 18;
  spawnExplosion(redBat.x + redBat.w / 2, redBat.y + redBat.h / 2, true);
  playSound('hit', 0.6);
  if (redBat.hp <= 0) {
    redBat.hp = 0;
    redBat.dead = true;
    redBat.deadTimer = 180;
    redBat.state = 'dead';
    comboCount += 5; comboTimer = 200;
    score += 3000; updateHUD();
    return true;
  }
  // Phase 2 trigger at 3 HP
  if (!redBat.phase2 && redBat.hp <= 3) {
    redBat.phase2 = true;
    redBat.state = 'freeze';
    redBat.stateTimer = 70; // ~1.15s freeze
  }
  return false;
}

function updateRedBat() {
  if (!redBat.active) return;
  if (redBat.hitFlash > 0) redBat.hitFlash--;
  if (redBat.dead) {
    redBat.deadTimer--;
    redBat.wobble += 0.15;
    // Spin and drift down while dying
    redBat.y += 1.5;
    if (redBat.deadTimer <= 0) {
      redBat.active = false;
      // Trigger level complete cinematic
      lvlComplete.active = true;
      lvlComplete.timer = 0;
      lvlComplete.zoomStart = zoom;
      score += 1000; updateHUD();
    }
    return;
  }

  redBat.wobble += 0.04;

  if (redBat.state === 'idle') {
    // Gentle hover
    redBat.x = redBat.baseX;
    redBat.y = redBat.baseY + Math.sin(redBat.wobble) * 20;
    // After phase 2 is done charging, repeat every 5s
    if (redBat.phase2) {
      redBat.stateTimer--;
      if (redBat.stateTimer <= 0) {
        redBat.state = 'freeze';
        redBat.stateTimer = 55;
      }
    }
  } else if (redBat.state === 'freeze') {
    // Lock in place, flash warning
    redBat.x = redBat.baseX;
    redBat.y = redBat.baseY;
    redBat.stateTimer--;
    if (redBat.stateTimer <= 0) {
      // Aim directly at player
      const dx = (player.x + player.w / 2) - (redBat.x + redBat.w / 2);
      const dy = (player.y + player.h / 2) - (redBat.y + redBat.h / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 28; // very fast
      redBat.chargeVx = (dx / dist) * speed;
      redBat.chargeVy = (dy / dist) * speed;
      redBat.state = 'charge';
      redBat.stateTimer = 28; // charge lasts ~0.45s then returns
    }
  } else if (redBat.state === 'charge') {
    redBat.x += redBat.chargeVx;
    redBat.y += redBat.chargeVy;
    redBat.stateTimer--;
    if (redBat.stateTimer <= 0) {
      redBat.state = 'return';
    }
    // Hurt player on contact during charge
    const gr = { x: redBat.x + 4, y: redBat.y + 4, w: redBat.w - 8, h: redBat.h - 8 };
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(gr, pr) && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 80;
      player.vx = (player.x < redBat.x + redBat.w / 2 ? -1 : 1) * 10;
      player.vy = -6;
      playSound('hurt', 0.6);
      if (hp <= 0) killPlayer();
    }
  } else if (redBat.state === 'return') {
    // Snap back to base position
    redBat.x += (redBat.baseX - redBat.x) * 0.18;
    redBat.y += (redBat.baseY - redBat.y) * 0.18;
    if (Math.abs(redBat.x - redBat.baseX) < 2 && Math.abs(redBat.y - redBat.baseY) < 2) {
      redBat.x = redBat.baseX;
      redBat.y = redBat.baseY;
      redBat.state = 'idle';
      redBat.stateTimer = 300; // 5s before next charge
      redBat.wobble = 0;
    }
    // Still hurt player on contact during return
    const gr2 = { x: redBat.x + 4, y: redBat.y + 4, w: redBat.w - 8, h: redBat.h - 8 };
    const pr2 = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(gr2, pr2) && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 80;
      player.vx = (player.x < redBat.x + redBat.w / 2 ? -1 : 1) * 10;
      player.vy = -6;
      playSound('hurt', 0.6);
      if (hp <= 0) killPlayer();
    }
  }

  // Idle/freeze: player can hit it with dash or homing
  if (redBat.state !== 'charge' && redBat.state !== 'return' && redBat.state !== 'dead') {
    const gr = { x: redBat.x + 4, y: redBat.y + 4, w: redBat.w - 8, h: redBat.h - 8 };
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(gr, pr)) {
      if (player.dashFrames > 0 && !redBat.hitFlash) {
        damageRedBat(1);
        player.vx = -Math.sign(player.vx || 1) * 8; player.vy = -6; player.dashFrames = 0;
      } else if (player.homing) {
        // homing handled in nearestLiveGoomba redirect — handled below
      } else if (player.invincible === 0) {
        hurtPlayer(1); player.invincible = 80;
        player.vx = (player.x < redBat.x + redBat.w / 2 ? -1 : 1) * 10; player.vy = -6;
        playSound('hurt', 0.6);
        if (hp <= 0) killPlayer();
      }
    }
  }
}

function drawRedBat() {
  if (!redBat.active) return;
  const cx = redBat.x + redBat.w / 2 - camera;
  const cy = redBat.y + redBat.h / 2;
  const t = performance.now() / 1000;
  const sc = RB_SIZE / TILE; // ~1.8
  const isFreezing = redBat.state === 'freeze';
  const isCharging = redBat.state === 'charge' || redBat.state === 'return';

  // Sprite sheet frame — same 24fps loop as regular bats, offset by id
  const batFrame = Math.floor((t * 24 + 31)) % BAT_FRAMES;
  const dw = Math.round(TILE * CFG.batScale * sc);
  const dh = Math.round(dw * (BAT_FH / BAT_FW));

  function drawRbSprite(alpha, rotateAngle) {
    ctx.save();
    if (rotateAngle) { ctx.translate(cx, cy); ctx.rotate(rotateAngle); ctx.translate(-cx, -cy); }
    ctx.globalAlpha = alpha;
    drawBatSprite(ctx, batFrame, dw, dh, cx - dw / 2, cy - dh / 2, '#00bb44');
    ctx.restore();
  }

  if (redBat.dead) {
    drawRbSprite(Math.max(0, redBat.deadTimer / 180), redBat.wobble * 3);
    return;
  }

  // Freeze warning — orange pulse ring (no white)
  if (isFreezing) {
    const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t * 12));
    ctx.save();
    ctx.globalAlpha = pulse * 0.8;
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, redBat.w * 0.75, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Charge — motion blur streaks
  if (isCharging) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = '#00cc44';
      ctx.beginPath();
      ctx.arc(cx - redBat.chargeVx * i * 0.08, cy - redBat.chargeVy * i * 0.08, redBat.w * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // HP bar above bat
  const barW = redBat.w * 1.4;
  const barX = cx - barW / 2;
  const barY = cy - dh / 2 - 14;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX - 1, barY - 1, barW + 2, 9);
  ctx.fillStyle = redBat.hp > 3 ? '#22cc55' : '#aaff00';
  ctx.fillRect(barX, barY, barW * (redBat.hp / RB_MAX_HP), 7);

  const hitFading = redBat.hitFlash > 0 && Math.floor(redBat.hitFlash / 3) % 2 === 0;
  drawRbSprite(hitFading ? 0.35 : 1, 0);
}

function _drawBatShape(cx, cy, t, wobble, isRed, fast, isGreen) {
  const wingSpan = (30 + Math.sin(t * (fast ? 12 : 3) + wobble) * 10);
  const flapOff  = Math.abs(Math.sin(t * (fast ? 12 : 3) + wobble)) * 14;
  const w1 = isGreen ? '#1a4a00' : '#5a0000';
  const w2 = isGreen ? '#2d7a10' : '#8b1010';
  const b1 = isGreen ? '#0a2a00' : '#3a0000';
  const b2 = isGreen ? '#1a5500' : '#660000';
  const e1 = isGreen ? '#00ff44' : '#ff6600';
  const e2 = isGreen ? '#aaffcc' : '#ffcc00';
  ctx.fillStyle = w1;
  ctx.beginPath(); ctx.moveTo(cx, cy-2); ctx.lineTo(cx-wingSpan, cy-5-flapOff); ctx.lineTo(cx-wingSpan+12, cy+7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy-2); ctx.lineTo(cx+wingSpan, cy-5-flapOff); ctx.lineTo(cx+wingSpan-12, cy+7); ctx.fill();
  ctx.fillStyle = w2;
  ctx.beginPath(); ctx.moveTo(cx, cy-1); ctx.lineTo(cx-wingSpan*0.6, cy-2-flapOff*0.5); ctx.lineTo(cx-wingSpan*0.55, cy+3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy-1); ctx.lineTo(cx+wingSpan*0.6, cy-2-flapOff*0.5); ctx.lineTo(cx+wingSpan*0.55, cy+3); ctx.fill();
  ctx.fillStyle = b1;
  ctx.beginPath(); ctx.ellipse(cx, cy, 12, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = b2;
  ctx.beginPath(); ctx.ellipse(cx, cy-1, 8, 7, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = e1;
  ctx.beginPath(); ctx.arc(cx-4, cy-2, 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+4, cy-2, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = e2;
  ctx.beginPath(); ctx.arc(cx-4, cy-2, 1.8, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+4, cy-2, 1.8, 0, Math.PI*2); ctx.fill();
}

function damageWraith(dmg) {
  if (wraith.dead || wraith.hitFlash > 0 || wraith.invulTimer > 0) return false;
  wraith.hp -= dmg;
  wraith.hitFlash = 22;
  wraith.shakeX = 10;
  score += 600; updateHUD();
  if (wraith.hp <= 0) {
    wraith.hp = 0;
    wraith.dead = true; wraith.deadTimer = 200;
    wraith.state = 'dead';
    spawnExplosion(wraith.x + wraith.w / 2, wraith.y + wraith.h / 2, true);
    comboCount += 8; comboTimer = 200;
    score += 8000; updateHUD();
    return true;
  }
  // Phase transition invul (4 phases)
  const newPhase = wraith.hp > wraith.maxHp * 0.6 ? 1
                 : wraith.hp > wraith.maxHp * 0.3 ? 2
                 : wraith.hp > wraith.maxHp * 0.1 ? 3 : 4;
  if (newPhase !== wraith.phase) {
    wraith.invulTimer = 90; wraith.phase = newPhase;
    wraith.clones = []; wraith.shockwaves = [];
    // Phase 4 entry: enter enrage immediately
    if (newPhase === 4) { wraith.state = 'surge'; wraith.stateTimer = 50; wraith.surgeCount = 0; }
  }
  spawnExplosion(wraith.x + wraith.w / 2, wraith.y + wraith.h / 2, true);
  return false;
}

function wraithSpawnClone() {
  // Assign sequential order numbers; must be killed in order 1→2→3
  const orderNum = wraith.clones.filter(c => !c.dead).length + 1;
  // Spawn near player to get in the way
  const spawnX = player.x + (Math.random() - 0.5) * 160;
  wraith.clones.push({
    x: Math.max(WRAITH_ARENA_X, Math.min(WRAITH_ARENA_R - 44, spawnX)),
    y: player.y,
    vx: -player.vx * 0.85,
    vy: 0,
    w: 44, h: 44,
    hp: 1, maxHp: 1,
    hitFlash: 0, lockFlash: 0,
    dead: false, deadTimer: 0,
    flying: false,
    onGround: false,
    angle: 0,
    orderNum,         // 1, 2, or 3 — must kill in this order
  });
}

function updateWraith() {
  if (!wraith.active) return;
  if (wraith.dead) {
    wraith.deadTimer--;
    if (wraith.deadTimer <= 0) { won = true; player.wonSlide = true; score += 1000; updateHUD(); }
    return;
  }

  wraith.eyePulse += 0.07;
  if (wraith.hitFlash > 0) wraith.hitFlash--;
  if (wraith.shakeX > 0) wraith.shakeX = Math.max(0, wraith.shakeX - 1.5);
  if (wraith.invulTimer > 0) wraith.invulTimer--;

  const px = player.x + player.w / 2, py = player.y + player.h / 2;
  const wx = wraith.x + wraith.w / 2, wy = wraith.y + wraith.h / 2;

  // ── Clones ──────────────────────────────────────────────────────────────────
  for (let i = wraith.clones.length - 1; i >= 0; i--) {
    const cl = wraith.clones[i];
    if (cl.dead) { cl.deadTimer--; if (cl.deadTimer <= 0) wraith.clones.splice(i, 1); continue; }
    if (cl.hitFlash > 0) cl.hitFlash--;
    if (cl.lockFlash > 0) cl.lockFlash--;

    // Mirror player movement (inverted X)
    cl.vx = -player.vx;
    cl.vy += 0.32;
    if (cl.vy > 20) cl.vy = 20;
    cl.x += cl.vx;
    cl.y += cl.vy;
    cl.angle += 12;

    // Ground collision for clone
    const clGround = WRAITH_GROUND;
    if (cl.y + cl.h >= clGround) { cl.y = clGround - cl.h; cl.vy = 0; cl.onGround = true; }
    cl.x = Math.max(WRAITH_ARENA_X, Math.min(WRAITH_ARENA_R - cl.w, cl.x));

    // Only killable if no lower-order clone is still alive
    const clKillable = !wraith.clones.some(other => !other.dead && other.orderNum < cl.orderNum);

    // Homing into clone
    if (player.homingTarget === cl) {
      const tx = cl.x + cl.w / 2, ty = cl.y + cl.h / 2;
      const dx = tx - (player.x + player.w / 2), dy = ty - (player.y + player.h / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        if (clKillable) {
          cl.dead = true; cl.deadTimer = 30;
          player.homing = false; player.homingTarget = null;
          player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
           comboCount++; comboTimer = 120;
          damageWraith(1);
        } else {
          // bounce off — clone is locked
          player.homing = false; player.homingTarget = null;
          player.vy = -8; player.vx = -player.vx;
          if (player.invincible === 0) { hurtPlayer(1); player.invincible = 60; if (hp <= 0) { killPlayer(); return; } }
        }
      } else {
        player.vx = (dx / dist) * HOMING_SPEED;
        player.vy = (dy / dist) * HOMING_SPEED;
        if (player.vx > 0) player.dir = 1; else player.dir = -1;
        spawnTrail(player.x + player.w / 2, player.y + player.h / 2);
      }
    }

    // Stomp / dash kill
    const clRect = { x: cl.x + 3, y: cl.y + 3, w: cl.w - 6, h: cl.h - 6 };
    const pRect  = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (!cl.dead && rectsOverlap(clRect, pRect)) {
      if (player.dashFrames > 0 && cl.hitFlash === 0 && clKillable) {
        cl.dead = true; cl.deadTimer = 30;
        player.vx = -Math.sign(player.vx) * 9; player.vy = -6;
        player.dashFrames = 0; comboCount++; comboTimer = 120;
        damageWraith(1);
      } else if (!player.homing && player.vy > 0 && player.y + player.h < cl.y + cl.h * 0.5 + 10 && clKillable) {
        cl.dead = true; cl.deadTimer = 30;
        player.vy = Math.min(player.vy, -6); comboCount++; comboTimer = 120;
        damageWraith(1);
      } else if (!player.homing && !player.ballForm && !player.dashFrames && player.invincible === 0) {
        hurtPlayer(1); player.invincible = 80;
        player.vy = -9; player.vx = (player.x < cl.x + cl.w / 2 ? -1 : 1) * 10;
        if (hp <= 0) { killPlayer(); return; }
      }
    }

  }

  // ── Shockwaves ──────────────────────────────────────────────────────────────
  for (let i = wraith.shockwaves.length - 1; i >= 0; i--) {
    const sw = wraith.shockwaves[i];
    sw.r += 6 + wraith.phase;
    sw.life--;
    if (sw.life <= 0 || sw.r > sw.maxR) { wraith.shockwaves.splice(i, 1); continue; }
    // Damage player if touching ring (thin band)
    const pdx = px - sw.cx, pdy = py - (WRAITH_GROUND - 4);
    const dist = Math.hypot(pdx, pdy);
    if (Math.abs(dist - sw.r) < 14 && player.onGround && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 60;
      player.vy = -10;
      if (hp <= 0) { killPlayer(); return; }
    }
  }

  // ── Tentacles (phase 3 visual + hitbox) ─────────────────────────────────────
  if (wraith.phase >= 3 && wraith.tentacles.length === 0) {
    for (let i = 0; i < 6; i++) {
      wraith.tentacles.push({ angle: (i / 6) * Math.PI * 2, length: 40, targetLen: 80 + i * 15, speed: 0.025 + i * 0.004 });
    }
  }
  for (const tent of wraith.tentacles) {
    tent.angle += tent.speed;
    tent.length += (tent.targetLen - tent.length) * 0.05;
    // Tentacle tip
    const tipX = wraith.x + wraith.w / 2 + Math.cos(tent.angle) * tent.length;
    const tipY = wraith.y + wraith.h / 2 + Math.sin(tent.angle) * tent.length;
    if (rectsOverlap({ x: tipX - 10, y: tipY - 10, w: 20, h: 20 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      if (player.dashFrames > 0) {
        // Dash through — cut the tentacle briefly
        tent.targetLen = 20; setTimeout(() => { tent.targetLen = 80 + Math.random() * 40; }, 800);
        damageWraith(1);
        player.vx = -Math.sign(player.vx) * 8; player.vy = -5; player.dashFrames = 0;
      } else if (!player.homing && !player.ballForm && player.invincible === 0) {
        hurtPlayer(1); player.invincible = 70;
        player.vy = -8; player.vx = (player.x < tipX ? -1 : 1) * 9;
        if (hp <= 0) { killPlayer(); return; }
      }
    }
  }

  // ── State machine ───────────────────────────────────────────────────────────
  wraith.stateTimer--;

  // Float toward player menacingly
  const targetX = Math.max(WRAITH_ARENA_X, Math.min(WRAITH_ARENA_R - wraith.w, px - wraith.w / 2 + (Math.sin(wraith.eyePulse * 0.4) * 60)));
  const targetY = Math.max(TILE, Math.min(WRAITH_GROUND - wraith.h * 1.5, py - wraith.h * 1.2));
  wraith.x += (targetX - wraith.x) * 0.018;
  wraith.y += (targetY - wraith.y) * 0.018;
  wraith.dir = px < wx ? -1 : 1;

  if (wraith.state === 'idle') {
    if (wraith.stateTimer <= 0) {
      const r = Math.random();
      if (wraith.phase === 1) {
        if      (r < 0.5)  { wraith.state = 'clonewave'; wraith.stateTimer = 30; }
        else               { wraith.state = 'ring';      wraith.stateTimer = 40; }
      } else if (wraith.phase === 2) {
        if      (r < 0.4)  { wraith.state = 'clonewave'; wraith.stateTimer = 25; }
        else if (r < 0.7)  { wraith.state = 'stomp';     wraith.stateTimer = 40; }
        else               { wraith.state = 'ring';      wraith.stateTimer = 40; }
      } else if (wraith.phase === 3) {
        if      (r < 0.35) { wraith.state = 'clonewave'; wraith.stateTimer = 20; }
        else if (r < 0.65) { wraith.state = 'stomp';     wraith.stateTimer = 32; }
        else               { wraith.state = 'ring';      wraith.stateTimer = 32; }
      } else {
        // Phase 4 — pure aggression: surge after every clone clear
        if      (r < 0.4)  { wraith.state = 'clonewave'; wraith.stateTimer = 18; }
        else if (r < 0.65) { wraith.state = 'surge';     wraith.stateTimer = 50; wraith.surgeCount = 0; }
        else if (r < 0.8)  { wraith.state = 'stomp';     wraith.stateTimer = 28; }
        else               { wraith.state = 'ring';      wraith.stateTimer = 28; }
      }
    }

  } else if (wraith.state === 'clonewave') {
    if (wraith.stateTimer === 29) wraithSpawnClone();
    if (wraith.phase >= 2 && wraith.stateTimer === 15) wraithSpawnClone();
    if (wraith.phase >= 3 && wraith.stateTimer === 1) wraithSpawnClone();
    if (wraith.stateTimer <= 0) { wraith.state = 'idle'; wraith.stateTimer = 80 + Math.floor(Math.random() * 40); }

  } else if (wraith.state === 'stomp') {
    // Slam down, create ground shockwave
    if (wraith.stateTimer === 39) {
      wraith.vy = 16;
    }
    if (wraith.stateTimer > 0) {
      wraith.y += wraith.vy;
      wraith.vy *= 0.92;
    }
    if (wraith.stateTimer === 1) {
      // Emit shockwaves in both directions from directly below
      const cx = wraith.x + wraith.w / 2;
      wraith.shockwaves.push({ cx, r: 10, maxR: 350, life: 55, maxLife: 55 });
      if (wraith.phase >= 2) wraith.shockwaves.push({ cx: cx - 60, r: 5, maxR: 280, life: 50, maxLife: 50 });
      if (wraith.phase >= 3) wraith.shockwaves.push({ cx: cx + 60, r: 5, maxR: 280, life: 50, maxLife: 50 });
      wraith.vy = -12;
    }
    if (wraith.stateTimer <= 0) {
      wraith.vy = 0;
      wraith.state = 'idle';
      wraith.stateTimer = 50 + Math.floor(Math.random() * 30);
    }

  } else if (wraith.state === 'ring') {
    // One ring burst, once, at the start
    if (wraith.stateTimer === 39) {
      const count = 8 + wraith.phase * 2;
      for (let a = 0; a < count; a++) {
        const ang = (a / count) * Math.PI * 2;
        const spd = 2.5 + wraith.phase * 0.5;
        projectiles.push({ x: wx, y: wy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 150, flying: true });
      }
      playSound('laser', 0.5);
    }
    if (wraith.stateTimer <= 0) { wraith.state = 'idle'; wraith.stateTimer = 80 + Math.floor(Math.random() * 50); }

  } else if (wraith.state === 'surge') {
    // Phase 4 anti-hover: wraith snaps directly beneath the player then rockets up
    // Telegraph: stateTimer 50→35 — wraith slides horizontally under player (telegraphed)
    // Launch:    stateTimer 35 — fire upward
    // Chase:     wraith.vy carries it up, deal damage if it hits player from below
    if (wraith.stateTimer === 49) {
      // Lock target X (player's current position)
      wraith.surgeLockX = Math.max(WRAITH_ARENA_X + 10, Math.min(WRAITH_ARENA_R - wraith.w - 10, player.x + player.w / 2 - wraith.w / 2));
      wraith.surgePhase = 'snap';
    }
    if (wraith.surgePhase === 'snap') {
      // Slide quickly beneath player horizontally
      wraith.x += (wraith.surgeLockX - wraith.x) * 0.18;
      // Move below player (just off screen if needed)
      const targetSurgeY = Math.min(WRAITH_GROUND - wraith.h, player.y + player.h + 20);
      wraith.y += (targetSurgeY - wraith.y) * 0.15;
      if (wraith.stateTimer === 36) {
        wraith.surgePhase = 'rise';
        wraith.vy = -28;  // fast upward rocket
        wraith.vx = (player.x + player.w / 2 > wraith.x + wraith.w / 2 ? 1 : -1) * 3;
      }
    }
    if (wraith.surgePhase === 'rise') {
      wraith.x += wraith.vx;
      wraith.y += wraith.vy;
      wraith.vy += 0.6;  // gravity pulls back
      wraith.x = Math.max(WRAITH_ARENA_X, Math.min(WRAITH_ARENA_R - wraith.w, wraith.x));
      // Damage player on contact during rise
      const wRise = { x: wraith.x + 4, y: wraith.y + 4, w: wraith.w - 8, h: wraith.h - 8 };
      const pR = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (rectsOverlap(wRise, pR)) {
        if (player.dashFrames > 0) {
          damageWraith(2);  // reward the counter-dash
          player.vx = -Math.sign(player.vx || 1) * 14; player.vy = -10; player.dashFrames = 0;
          wraith.surgePhase = 'cooldown'; wraith.vy = -5;
        } else if (player.invincible === 0) {
          hurtPlayer(2); player.invincible = 100;
          player.vy = player.vy < 0 ? 12 : -10;
          player.vx = (player.x < wraith.x + wraith.w / 2 ? -1 : 1) * 12;
          if (hp <= 0) { killPlayer(); return; }
        }
      }
      // After apex, go to cooldown
      if (wraith.vy > 4) { wraith.surgePhase = 'cooldown'; }
    }
    if (wraith.stateTimer <= 0) {
      wraith.surgeCount++;
      if (wraith.surgeCount < 3) {
        // Surge again — snap to new position
        wraith.stateTimer = 50;
        wraith.surgeLockX = Math.max(WRAITH_ARENA_X + 10, Math.min(WRAITH_ARENA_R - wraith.w - 10, player.x + player.w / 2 - wraith.w / 2));
        wraith.surgePhase = 'snap';
      } else {
        wraith.surgePhase = 'none';
        wraith.state = 'idle'; wraith.stateTimer = 40 + Math.floor(Math.random() * 20);
      }
    }
  }

  wraith.x = Math.max(WRAITH_ARENA_X, Math.min(WRAITH_ARENA_R - wraith.w, wraith.x));
  wraith.y = Math.max(TILE, Math.min(WRAITH_GROUND - wraith.h, wraith.y));

  // ── Direct hit detection ─────────────────────────────────────────────────────
  // Wraith is only directly damageable when all clones are dead
  const allClonesDead = wraith.clones.every(c => c.dead);
  const wRect = { x: wraith.x + 8, y: wraith.y + 8, w: wraith.w - 16, h: wraith.h - 16 };
  const pRect2 = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectsOverlap(wRect, pRect2)) {
    if (player.dashFrames > 0 && wraith.hitFlash === 0 && allClonesDead) {
      damageWraith(1);
      player.vx = -Math.sign(player.vx) * 10; player.vy = -7;
      player.dashFrames = 0; player.onGround = false;
    } else if (player.homing && player.homingTarget === wraith && allClonesDead) {
      damageWraith(1);
      player.homing = false; player.homingTarget = null;
      player.vy = Math.min(player.vy, -CFG.jump1 * 0.35);
      player.vx = player.dir * CFG.moveSpeed * 1.5;
       comboCount++; comboTimer = 120;
    } else if (!player.homing && !player.ballForm && !player.dashFrames && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 80;
      player.vy = -9; player.vx = (player.x < wx ? -1 : 1) * 11;
      if (hp <= 0) { killPlayer(); return; }
    }
  }
}

function drawWraith() {
  if (!wraith.active) return;
  const wsx = wraith.x - camera;
  if (wsx < -200 || wsx > W + 200) return;

  const t = performance.now() / 400;
  const phase = wraith.phase;
  const shk = Math.sin(performance.now() * 0.9) * (wraith.shakeX > 0 ? wraith.shakeX : 0);

  const bodyColor   = phase === 1 ? '#080818' : phase === 2 ? '#180808' : phase === 3 ? '#000000' : '#111100';
  const accentColor = phase === 1 ? '#3300aa' : phase === 2 ? '#aa0000' : phase === 3 ? '#ff6600' : '#dddd00';
  const glowColor   = phase === 1 ? '#6644ff' : phase === 2 ? '#ff3300' : phase === 3 ? '#ffaa00' : '#ffffaa';

  // ── Draw shockwaves ──────────────────────────────────────────────────────────
  for (const sw of wraith.shockwaves) {
    const fade = sw.life / sw.maxLife;
    ctx.save();
    ctx.globalAlpha = fade * 0.8;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5 * fade + 1;
    ctx.beginPath();
    ctx.arc(sw.cx - camera, WRAITH_GROUND - 4, sw.r, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }

  // ── Draw clones ──────────────────────────────────────────────────────────────
  for (const cl of wraith.clones) {
    if (cl.dead) continue;
    const clsx = cl.x - camera;
    ctx.save();
    ctx.translate(clsx + cl.w / 2, cl.y + cl.h / 2);
    ctx.rotate(cl.angle * Math.PI / 180);
    const flash = cl.hitFlash > 0 && Math.floor(cl.hitFlash / 3) % 2 === 0;
    ctx.fillStyle = flash ? '#ffffff' : '#220011';
    ctx.beginPath(); ctx.ellipse(0, 0, cl.w / 2, cl.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accentColor; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(0, 0, cl.w / 2 - 6, cl.h / 2 - 6, 0, 0, Math.PI * 2); ctx.fill();
    // Glowing eyes
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(wraith.eyePulse * 4);
    ctx.fillStyle = glowColor;
    ctx.beginPath(); ctx.arc(-8, -5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (player.homingTarget === cl || cl.lockFlash > 0) drawLockOn(cl);

    // Order number — dim if not yet killable, bright if it's this clone's turn
    const killable = !wraith.clones.some(other => !other.dead && other.orderNum < cl.orderNum);
    ctx.save();
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (killable) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = glowColor; ctx.shadowBlur = 12;
    } else {
      ctx.fillStyle = '#666688';
      ctx.shadowBlur = 0;
    }
    ctx.fillText(String(cl.orderNum), clsx + cl.w / 2, cl.y + cl.h / 2);
    ctx.restore();
  }

  // ── Phase 4 surge telegraph ──────────────────────────────────────────────────
  if (phase === 4 && wraith.surgePhase === 'snap') {
    const tx = wraith.surgeLockX + wraith.w / 2 - camera;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.025);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * pulse;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, H); ctx.stroke();
    ctx.setLineDash([]);
    // Warning chevron above player
    ctx.fillStyle = '#ffff44';
    ctx.globalAlpha = 0.8 * pulse;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ SURGE ▼', tx, player.y - 20);
    ctx.restore();
  }

  // ── Draw wraith body ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(wsx + wraith.w / 2 + shk, wraith.y + wraith.h / 2);

  // Outer smear aura
  const aGrad = ctx.createRadialGradient(0, 0, wraith.w * 0.2, 0, 0, wraith.w * 1.2);
  aGrad.addColorStop(0, glowColor + '55');
  aGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, wraith.w, wraith.h * 1.1, 0, 0, Math.PI * 2); ctx.fill();

  // Tentacles (phase 3)
  if (phase >= 3) {
    for (const tent of wraith.tentacles) {
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.85;
      const segments = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let s = 1; s <= segments; s++) {
        const frac = s / segments;
        const wobble = Math.sin(tent.angle * 2 + s) * 10 * frac;
        ctx.lineTo(
          Math.cos(tent.angle) * tent.length * frac + wobble * Math.sin(tent.angle),
          Math.sin(tent.angle) * tent.length * frac + wobble * Math.cos(tent.angle)
        );
      }
      ctx.stroke();
      // Tip glow
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(Math.cos(tent.angle) * tent.length, Math.sin(tent.angle) * tent.length, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Body
  const hitFlashing = wraith.hitFlash > 0 && Math.floor(wraith.hitFlash / 3) % 2 === 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = hitFlashing ? '#ffffff' : bodyColor;
  ctx.beginPath(); ctx.ellipse(0, 0, wraith.w / 2, wraith.h / 2, 0, 0, Math.PI * 2); ctx.fill();

  // Phase fractures — cracks that grow with damage
  const crackCount = wraith.phase * 3;
  ctx.strokeStyle = glowColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
  for (let i = 0; i < crackCount; i++) {
    const a = (i / crackCount) * Math.PI * 2 + t * 0.1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.lineTo(Math.cos(a) * (wraith.w * 0.45), Math.sin(a) * (wraith.h * 0.44));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Eyes — four eyes, no face, just horror
  const epGlow = 0.5 + 0.5 * Math.abs(Math.sin(wraith.eyePulse * 2.5));
  ctx.globalAlpha = epGlow;
  ctx.fillStyle = glowColor;
  for (const [ex, ey, er] of [[-16,-12,8],[16,-12,8],[-6,8,5],[6,8,5]]) {
    ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1;
  for (const [ex, ey, er] of [[-16,-12,4],[16,-12,4],[-6,8,2.5],[6,8,2.5]]) {
    ctx.beginPath(); ctx.ellipse(ex + wraith.dir * 2, ey, er, er, 0, 0, Math.PI * 2); ctx.fill();
  }

  // HP bar
  const barW = wraith.w * 2, barH = 8;
  const barX = -barW / 2, barY = -wraith.h / 2 - 22;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#110000'; ctx.fillRect(barX, barY, barW, barH);
  const hpR = wraith.hp / wraith.maxHp;
  ctx.fillStyle = phase === 1 ? '#6644ff' : phase === 2 ? '#ff3300' : '#ffaa00';
  ctx.fillRect(barX, barY, barW * hpR, barH);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('ABYSSAL WRAITH', 0, barY - 3);

  ctx.restore();

  if (player.homingTarget === wraith || wraith.lockFlash > 0) drawLockOn(wraith);
}

// ── Warden functions ──────────────────────────────────────────────────────────
function damageWarden(dmg) {
  if (warden.dead || warden.hitFlash > 0 || warden.invulTimer > 0) return false;
  if (warden.vulnTimer <= 0) return false; // sentinels must all be dead first
  warden.hp -= dmg;
  warden.hitFlash = 20;
  warden.shakeX = 8;
  score += 500; updateHUD();
  if (warden.hp <= 0) {
    warden.hp = 0;
    warden.dead = true; warden.deadTimer = 300; // 5s total: 3s shake + 2s grand explosion
    warden.state = 'dead';
    warden.deathPhase = 'shake';
    warden.deathExpTimer = 0;
    comboCount += 8; comboTimer = 200;
    score += 8000; updateHUD();
    return true;
  }
  const newPhase = warden.hp > warden.maxHp * 0.5 ? 1 : 2;
  if (newPhase !== warden.phase) {
    warden.invulTimer = 80; warden.phase = newPhase;
    warden.shockwaves = []; warden.rocks = [];
  }
  spawnExplosion(warden.x + warden.w / 2, warden.y + warden.h / 2, false);
  return false;
}

function updateWarden() {
  if (!warden.active) return;
  if (warden.dead) {
    warden.deadTimer--;
    if (warden.deathPhase === 'shake') {
      // 3s violent shake with escalating small bursts
      const intensity = 1 + (180 - warden.deadTimer) / 60;
      warden.shakeX = (10 + intensity * 6) * (Math.random() > 0.5 ? 1 : -1);
      warden.deathExpTimer--;
      const burstRate = Math.max(3, 10 - Math.floor(intensity * 2));
      if (warden.deathExpTimer <= 0) {
        warden.deathExpTimer = burstRate;
        const ox = (Math.random() - 0.5) * warden.w * 1.2;
        const oy = (Math.random() - 0.5) * warden.h * 1.2;
        spawnExplosion(warden.x + warden.w / 2 + ox, warden.y + warden.h / 2 + oy, false);
      }
      if (warden.deadTimer <= 120) { warden.deathPhase = 'explode'; warden.deathExpTimer = 0; }
    } else if (warden.deathPhase === 'explode') {
      // 2s massive slow-motion chain explosions across whole screen width
      warden.shakeX = 20 * (Math.random() > 0.5 ? 1 : -1);
      warden.deathExpTimer--;
      if (warden.deathExpTimer <= 0) {
        warden.deathExpTimer = 10;
        for (let e = 0; e < 3; e++) {
          spawnExplosion(
            warden.x + warden.w / 2 + (Math.random() - 0.5) * 200,
            warden.y + warden.h / 2 + (Math.random() - 0.5) * 120,
            e % 2 === 0
          );
        }
      }
    }
    if (warden.deadTimer <= 0) { won = true; player.wonSlide = true; score += 1000; updateHUD(); }
    return;
  }

  warden.eyePulse += 0.06;
  if (warden.hitFlash > 0) warden.hitFlash--;
  if (warden.shakeX > 0) warden.shakeX = Math.max(0, warden.shakeX - 1.5);
  if (warden.invulTimer > 0) warden.invulTimer--;
  if (warden.homingCooldown > 0) warden.homingCooldown--;
  if (warden.vulnTimer > 0) warden.vulnTimer--;

  // ── Sentinel bats ─────────────────────────────────────────────────────────
  const allSentinelsDead = warden.sentinels.every(s => s.dead);
  for (let si = warden.sentinels.length - 1; si >= 0; si--) {
    const s = warden.sentinels[si];
    if (s.dead) {
      s.deadTimer--;
      if (s.deadTimer <= 0) warden.sentinels.splice(si, 1);
      continue;
    }
    if (s.hitFlash > 0) s.hitFlash--;
    // Wobble patrol
    s.wobble += 0.05;
    s.x += s.vx;
    if (s.x < s.pl || s.x + s.w > s.pr) s.vx *= -1;
    s.y = s.baseY + Math.sin(s.wobble) * 22;
    // Respawn vulnTimer when last sentinel dies
    if (!allSentinelsDead && warden.sentinels.filter(x => !x.dead).length === 1) {
      // handled below after hit detection
    }
    // Player collision
    const sr = { x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 };
    const pr0 = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(sr, pr0)) {
      const canKill = player.dashFrames > 0 || player.homing || player.spinning ||
                      (player.vy > 0 && player.y + player.h < s.y + s.h / 2 + 10);
      if (canKill && !s.hitFlash) {
        s.dead = true; s.deadTimer = 30;
        spawnExplosion(s.x + s.w / 2, s.y + s.h / 2, true);
        playSound('hit', 0.7);
        score += 300; updateHUD();
        comboCount++; comboTimer = 120;
        if (player.homing) { player.homing = false; player.homingTarget = null; player.vy = -6; }
        else if (player.dashFrames > 0) { player.vx = -Math.sign(player.vx||1)*8; player.vy = -6; player.dashFrames = 0; }
        else { player.vy = Math.min(player.vy, -6); }
        // (vulnerability now only opens after ground pound)
      } else if (!canKill && player.invincible === 0) {
        hurtPlayer(1); player.invincible = 60;
        player.vy = -8; player.vx = (player.x < s.x ? -1 : 1) * 9;
        if (hp <= 0) { killPlayer(); return; }
      }
    }
  }

  const px = player.x + player.w / 2;
  const wx = warden.x + warden.w / 2;

  // Gravity — stomp lands on actual ground, otherwise hover 1 tile up
  const floorY = (warden.state === 'stomp' || warden.state === 'stomp_recover') ? WARDEN_GROUND : WARDEN_HOVER;
  const skipGravity = warden.state === 'charge';
  if (!warden.onGround && !skipGravity) {
    warden.vy += 0.5;
    if (warden.vy > 22) warden.vy = 22;
  }
  if (!skipGravity) warden.y += warden.vy;
  if (warden.y + warden.h >= floorY) {
    warden.y = floorY - warden.h;
    const wasFalling = warden.vy > 8;
    warden.vy = 0; warden.onGround = true;
    if (wasFalling && warden.state === 'stomp') {
      const cx = warden.x + warden.w / 2;
      warden.shockwaves.push({ cx, dir:  1, r: 12, maxR: 500, life: 60, maxLife: 60 });
      warden.shockwaves.push({ cx, dir: -1, r: 12, maxR: 500, life: 60, maxLife: 60 });
      if (warden.phase === 2) {
        warden.shockwaves.push({ cx: cx + 80, dir:  1, r: 8, maxR: 380, life: 50, maxLife: 50 });
        warden.shockwaves.push({ cx: cx - 80, dir: -1, r: 8, maxR: 380, life: 50, maxLife: 50 });
      }
      warden.stompCount = (warden.stompCount || 0) + 1;
      if (warden.stompCount >= 3) {
        warden.stompCount = 0;
        warden.state = 'stomp_recover';
        warden.stateTimer = 180;
        warden.vulnTimer = 180;
      } else {
        warden.state = 'stomp_recover';
        warden.stateTimer = 60; // short recover, not vulnerable
      }
    }
  }
  warden.x += warden.vx;
  warden.x = Math.max(WARDEN_ARENA_X, Math.min(WARDEN_ARENA_R - warden.w, warden.x));
  // Clamp warden above ground during dive
  if (warden.y + warden.h > WARDEN_GROUND) {
    warden.y = WARDEN_GROUND - warden.h;
    warden.vy = 0;
  }

  // Shockwaves
  for (let i = warden.shockwaves.length - 1; i >= 0; i--) {
    const sw = warden.shockwaves[i];
    sw.r += 5 + warden.phase;
    sw.life--;
    if (sw.life <= 0 || sw.r > sw.maxR) { warden.shockwaves.splice(i, 1); continue; }
    const dist = Math.abs(px - sw.cx);
    if (Math.abs(dist - sw.r) < 16 && player.onGround && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 60;
      player.vy = -10;
      if (hp <= 0) { killPlayer(); return; }
    }
  }

  // Rocks (phase 2 charge debris)
  for (let i = warden.rocks.length - 1; i >= 0; i--) {
    const rk = warden.rocks[i];
    if (rk.dead) { rk.deadTimer--; if (rk.deadTimer <= 0) warden.rocks.splice(i, 1); continue; }
    rk.vy += 0.4;
    rk.x += rk.vx; rk.y += rk.vy;
    if (rk.y + 12 >= WARDEN_GROUND) { rk.y = WARDEN_GROUND - 12; rk.vy = -rk.vy * 0.5; rk.vx *= 0.85; }
    rk.x = Math.max(WARDEN_ARENA_X, Math.min(WARDEN_ARENA_R - 12, rk.x));
    const pR = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap({ x: rk.x - 10, y: rk.y - 10, w: 20, h: 20 }, pR)) {
      if (player.dashFrames > 0 || (player.homing && player.homingTarget === rk)) {
        rk.dead = true; rk.deadTimer = 20;
        if (player.homing) { player.homing = false; player.homingTarget = null; player.vy = -9; }
        else { player.vx = -Math.sign(player.vx || 1) * 8; player.vy = -5; player.dashFrames = 0; }
      } else if (player.invincible === 0) {
        hurtPlayer(1); player.invincible = 60;
        player.vy = -8; player.vx = (player.x < rk.x ? -1 : 1) * 9;
        if (hp <= 0) { killPlayer(); return; }
      }
    }
  }

  // State machine
  warden.stateTimer--;
  warden.dir = px < wx ? -1 : 1;

  if (warden.state === 'idle') {
    if (warden.onGround) warden.vx += (warden.dir * (1.5 + warden.phase * 0.5) - warden.vx) * 0.08;
    if (warden.stateTimer <= 0) {
      warden.vx = 0;
      if (Math.random() < 0.45) {
        warden.state = 'stomp'; warden.stateTimer = 80;
        warden.onGround = false;
        const dx = px - wx;
        warden.vx = Math.sign(dx) * Math.min(Math.abs(dx) * 0.06, 8) * (1 + warden.phase * 0.3);
        warden.vy = -(13 + warden.phase * 2);
      } else {
        warden.state = 'charge_telegraph'; warden.stateTimer = 70;
      }
    }

  } else if (warden.state === 'charge_telegraph') {
    warden.vx = 0;
    if (warden.stateTimer <= 0) {
      warden.state = 'charge'; warden.stateTimer = 35 + Math.floor(Math.random() * 10);
      warden.vx = warden.dir * (9 + warden.phase * 2);
    }

  } else if (warden.state === 'charge') {
    // Bob vertically so player can't just crouch on the ground
    warden.chargeWobble += 0.18;
    warden.y = WARDEN_HOVER - warden.h + Math.sin(warden.chargeWobble) * 38;
    warden.onGround = false;
    if (warden.stateTimer <= 0 ||
        warden.x <= WARDEN_ARENA_X + 4 || warden.x >= WARDEN_ARENA_R - warden.w - 4) {
      if (warden.phase === 2) {
        for (let r = 0; r < 2; r++) {
          warden.rocks.push({
            x: warden.x + warden.w / 2 + (r === 0 ? -20 : 20),
            y: warden.y,
            vx: (r === 0 ? -3 : 3) * (0.8 + Math.random() * 0.4),
            vy: -8 - Math.random() * 4,
            dead: false, deadTimer: 0, flying: true, w: 20, h: 20,
          });
        }
      }
      warden.vx = 0; warden.state = 'idle';
      warden.stateTimer = 60 + Math.floor(Math.random() * 40);
    }

  } else if (warden.state === 'stomp') {
    if (warden.stateTimer <= 0 && !warden.onGround) {
      warden.y = WARDEN_GROUND - warden.h; warden.vy = 0; warden.onGround = true;
      warden.stompCount = (warden.stompCount || 0) + 1;
      if (warden.stompCount >= 3) {
        warden.stompCount = 0;
        warden.state = 'stomp_recover'; warden.stateTimer = 180;
        warden.vulnTimer = 180;
      } else {
        warden.state = 'stomp_recover'; warden.stateTimer = 60;
      }
    }

  } else if (warden.state === 'stomp_recover') {
    // Stay on ground for 2s, then float back up
    warden.vx = 0;
    if (warden.stateTimer <= 0) {
      warden.state = 'idle';
      warden.stateTimer = 60 + Math.floor(Math.random() * 40);
      warden.onGround = false;
      warden.vy = -4; // gentle rise back to hover height
    }

  }

  // Direct hit detection
  const wRect = { x: warden.x + 6, y: warden.y + 6, w: warden.w - 12, h: warden.h - 12 };
  const pRect2 = { x: player.x, y: player.y, w: player.w, h: player.h };
  const wardenVuln = warden.vulnTimer > 0;
  if (rectsOverlap(wRect, pRect2)) {
    if (player.dashFrames > 0 && warden.hitFlash === 0) {
      if (wardenVuln) {
        damageWarden(1);
        player.vx = -Math.sign(player.vx) * 10; player.vy = -7;
        player.dashFrames = 0; player.onGround = false;
      } else {
        // Not vulnerable — bounce hard
        player.vx = -Math.sign(player.vx || 1) * 12; player.vy = -8;
        player.dashFrames = 0;
        hurtPlayer(1); player.invincible = 60;
        if (hp <= 0) { killPlayer(); return; }
      }
    } else if (player.homing && player.homingTarget === warden) {
      player.homing = false; player.homingTarget = null;
      
      if (wardenVuln) {
        damageWarden(1);
        player.vy = Math.min(player.vy, -CFG.jump1 * 0.35);
        player.vx = player.dir * CFG.moveSpeed * 1.5;
        comboCount++; comboTimer = 120;
      } else {
        // Bounce off — no damage
        player.vy = Math.min(player.vy, -CFG.jump1 * 0.8);
        player.vx = -Math.sign(player.vx || 1) * CFG.moveSpeed * 2;
      }
    } else if (warden.state === 'charge' && player.invincible === 0) {
      // Charge attack damages player
      hurtPlayer(1); player.invincible = 80;
      player.vy = -9; player.vx = (player.x < wx ? -1 : 1) * 13;
      if (hp <= 0) { killPlayer(); return; }
    } else if (!player.homing && !player.ballForm && !player.dashFrames && player.invincible === 0) {
      hurtPlayer(1); player.invincible = 80;
      player.vy = -9; player.vx = (player.x < wx ? -1 : 1) * 11;
      if (hp <= 0) { killPlayer(); return; }
    }
  }
}

function drawWarden() {
  if (!warden.active) return;
  const wsx = warden.x - camera;
  if (wsx < -200 || wsx > W + 200) return;

  const phase = warden.phase;
  const shk = warden.shakeX > 0 ? Math.sin(performance.now() * 0.05) * warden.shakeX : 0;
  const accentColor = phase === 1 ? '#cc6600' : '#ff2200';
  const glowColor   = phase === 1 ? '#ff9900' : '#ff4400';

  // Shockwaves
  for (const sw of warden.shockwaves) {
    const fade = sw.life / sw.maxLife;
    ctx.save();
    ctx.globalAlpha = fade * 0.9;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5 * fade + 2;
    const gy2 = WARDEN_GROUND - 4;
    ctx.beginPath();
    if (sw.dir > 0) ctx.arc(sw.cx - camera, gy2, sw.r, Math.PI, 0);
    else            ctx.arc(sw.cx - camera, gy2, sw.r, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  // Rocks
  for (const rk of warden.rocks) {
    if (rk.dead) continue;
    const rx = rk.x - camera;
    ctx.save();
    ctx.fillStyle = '#886644'; ctx.strokeStyle = accentColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rx, rk.y, 10, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    if (player.homingTarget === rk || rk.lockFlash > 0) drawLockOn(rk);
  }

  // Charge telegraph arrow
  if (warden.state === 'charge_telegraph') {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.03);
    ctx.save();
    ctx.globalAlpha = 0.75 * pulse;
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(warden.dir > 0 ? '►' : '◄', wsx + warden.w / 2 + warden.dir * 55, warden.y + warden.h / 2);
    ctx.restore();
  }

  // Body
  ctx.save();
  ctx.translate(wsx + warden.w / 2 + shk, warden.y + warden.h / 2);

  const flash = warden.hitFlash > 0 && Math.floor(warden.hitFlash / 3) % 2 === 0;
  const vulnFlash = warden.vulnTimer > 0 && Math.floor(performance.now() / 120) % 2 === 0;

  const aGrad = ctx.createRadialGradient(0, 0, warden.w * 0.15, 0, 0, warden.w * 0.9);
  aGrad.addColorStop(0, glowColor + '55');
  aGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, warden.w * 0.9, warden.h * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : vulnFlash ? '#cc0000' : (phase === 1 ? '#2a1a0a' : '#3a0a0a');
  const hw = warden.w / 2 - 2, hh = warden.h / 2 - 2;
  ctx.beginPath();
  ctx.moveTo(-hw + 10, -hh); ctx.lineTo(hw - 10, -hh);
  ctx.quadraticCurveTo(hw, -hh, hw, -hh + 10); ctx.lineTo(hw, hh - 10);
  ctx.quadraticCurveTo(hw, hh, hw - 10, hh); ctx.lineTo(-hw + 10, hh);
  ctx.quadraticCurveTo(-hw, hh, -hw, hh - 10); ctx.lineTo(-hw, -hh + 10);
  ctx.quadraticCurveTo(-hw, -hh, -hw + 10, -hh);
  ctx.closePath(); ctx.fill();

  if (!flash) {
    ctx.fillStyle = accentColor; ctx.globalAlpha = 0.7;
    ctx.fillRect(-hw + 6, -hh + 6, (hw - 6) * 2, 10);
    ctx.fillRect(-hw + 6,  hh - 16, (hw - 6) * 2, 10);
    ctx.globalAlpha = 1;
  }

  const ep = 0.6 + 0.4 * Math.abs(Math.sin(warden.eyePulse * 2));
  ctx.globalAlpha = ep; ctx.fillStyle = glowColor;
  ctx.beginPath(); ctx.ellipse(-16, -10, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 16, -10, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.ellipse(-16 + warden.dir * 3, -10, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 16 + warden.dir * 3, -10, 5, 5, 0, 0, Math.PI * 2); ctx.fill();

  if (warden.state === 'charge' || warden.state === 'charge_telegraph') {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(-6, -16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 26, -20); ctx.lineTo(  6, -16); ctx.stroke();
  }

  const barW = warden.w * 2, barH = 8, barX = -barW / 2, barY = -warden.h / 2 - 22;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#220000'; ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = phase === 1 ? '#ff9900' : '#ff2200';
  ctx.fillRect(barX, barY, barW * (warden.hp / warden.maxHp), barH);
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('THE WARDEN', 0, barY - 3);

  ctx.restore();

  // Draw sentinel bats
  const now2 = performance.now() / 1000;
  for (const s of warden.sentinels) {
    if (s.dead) continue;
    const sx = s.x - camera;
    const pulse = 0.6 + 0.4 * Math.sin(now2 * 6);
    ctx.save();
    // Red glow
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 16 * pulse;
    // Body
    ctx.fillStyle = s.hitFlash > 0 ? '#ffffff' : `rgb(${Math.round(180+75*pulse)},0,0)`;
    ctx.beginPath();
    ctx.arc(sx + s.w / 2, s.y + s.h / 2, s.w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.fillStyle = `rgba(220,0,0,${0.5 + 0.4 * pulse})`;
    const wt = Math.sin(now2 * 12) * 0.4;
    ctx.beginPath();
    ctx.ellipse(sx + s.w/2 - 14, s.y + s.h/2, 12, 5, -0.4 + wt, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + s.w/2 + 14, s.y + s.h/2, 12, 5,  0.4 - wt, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(sx + s.w/2 - 5, s.y + s.h/2 - 2, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + s.w/2 + 5, s.y + s.h/2 - 2, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    if (player.homingTarget === s) drawLockOn(s);
  }

  // Vulnerability flash indicator
  if (warden.vulnTimer > 0) {
    const vt = warden.vulnTimer / 300;
    ctx.save();
    ctx.globalAlpha = 0.35 * (0.5 + 0.5 * Math.sin(now2 * 10));
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(wsx - 8, warden.y - 8, warden.w + 16, warden.h + 16);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Shooter Bats ─────────────────────────────────────────────────────────────
// Hover above goomba clusters, shoot one bullet periodically.
// 2 hits to kill — homing or dash contact both deal damage.

let shooterBats = [];

function initShooterBats(clusters) {
  const sz = TILE * 1.8;
  shooterBats = clusters.filter((_, i) => i % 4 === 0).map((g, i) => {
    const midX = ((g.pl + g.pr) / 2) * TILE;
    const y = (groundY - 5) * TILE - TILE;
    return {
      id: i, x: midX - sz / 2, y,
      w: sz, h: sz,
      bobBase: y, bobPhase: Math.random() * Math.PI * 2,
      shootTimer: 90 + Math.floor(Math.random() * 60),
      dead: false, deadTimer: 0, hitFlash: 0,
      hp: 3, maxHp: 3,
    };
  });
}

function updateShooterBats() {
  const px = player.x + player.w / 2, py = player.y + player.h / 2;
  for (const b of shooterBats) {
    if (b.dead) { if (b.deadTimer > 0) b.deadTimer--; continue; }
    if (b.hitFlash > 0) b.hitFlash--;
    b.bobPhase += 0.04;
    b.y = b.bobBase + Math.sin(b.bobPhase) * 8;

    const onScreen = b.x > camera - 200 && b.x < camera + W + 200;
    if (!onScreen) continue;

    b.shootTimer--;
    if (b.shootTimer <= 0) {
      b.shootTimer = 120 + Math.floor(Math.random() * 80);
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      const dx = px - bx, dy = py - by;
      const dist = Math.hypot(dx, dy) || 1;
      projectiles.push({ x: bx, y: by, vx: (dx / dist) * 5, vy: (dy / dist) * 5, life: 180, shooterBatId: b.id });
      playSound('laser', 0.4);
    }

    // Dash contact damage (like stomping a goomba)
    if (player.dashFrames > 0 && b.hitFlash === 0) {
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      const br = { x: b.x, y: b.y, w: b.w, h: b.h };
      if (rectsOverlap(pr, br)) {
        b.hp--; b.hitFlash = 14;
        player.vx = -Math.sign(player.vx) * CFG.moveSpeed * 1.5;
        player.vy = -6;
        if (b.hp <= 0) { b.dead = true; b.deadTimer = 30; spawnExplosion(b.x + b.w / 2, b.y + b.h / 2, false); }
      }
    }
  }
}

function drawShooterBats() {
  for (const b of shooterBats) {
    if (b.dead && b.deadTimer <= 0) continue;
    const cx = b.x + b.w / 2 - camera;
    const cy = b.y + b.h / 2;
    const alpha = b.dead ? b.deadTimer / 30 : 1;
    ctx.globalAlpha = alpha;
    if (b.hitFlash > 0 && Math.floor(b.hitFlash / 2) % 2 === 0) ctx.filter = 'brightness(10) saturate(0)';
    const batFrame = Math.floor(performance.now() / 1000 * 20 + b.id * 5) % BAT_FRAMES;
    const dw = Math.round(b.w);
    const dh = Math.round(dw * (BAT_FH / BAT_FW));
    drawBatSprite(ctx, batFrame, dw, dh, cx - dw / 2, cy - dh / 2, false);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }
}

// ── Chests ───────────────────────────────────────────────────────────────────
// Fixed chests placed by initLevel. Home or dash into to fully heal.

let chests = [];

function updateChests() {
  for (const c of chests) {
    if (c.collected) { if (c.deadTimer > 0) c.deadTimer--; continue; }
    c.bobTimer += 0.05;

    // Homing contact — player homing into it
    if (player.homing && player.homingTarget === c) {
      c.collected = true; c.deadTimer = 30;
      hp = MAX_HP; updateHPBar();
      spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, false);
      player.homing = false; player.homingTarget = null;
      player.vy = -8;
    }

    // Dash contact — bounce player back and collect
    if (!c.collected && player.dashFrames > 0) {
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      const cr = { x: c.x, y: c.y, w: c.w, h: c.h };
      if (rectsOverlap(pr, cr)) {
        c.collected = true; c.deadTimer = 30;
        hp = MAX_HP; updateHPBar();
        spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, false);
        // Bounce player back opposite dash direction
        player.vx = -Math.sign(player.vx || player.dir) * CFG.moveSpeed * 2;
        player.vy = -7;
        player.dashFrames = 0;
      }
    }
  }
  // Cull old collected chests
  for (let i = chests.length - 1; i >= 0; i--) {
    if (chests[i].collected && chests[i].deadTimer <= 0) chests.splice(i, 1);
  }
}

function drawChests() {
  for (const c of chests) {
    if (c.collected && c.deadTimer <= 0) continue;
    const cx = c.x - camera;
    const cy = c.y + Math.sin(c.bobTimer) * 4;
    const alpha = c.collected ? c.deadTimer / 30 : 1;
    ctx.globalAlpha = alpha;
    // Glow
    const grd = ctx.createRadialGradient(cx + c.w / 2, cy + c.h / 2, 2, cx + c.w / 2, cy + c.h / 2, TILE);
    grd.addColorStop(0, 'rgba(255,220,80,0.5)');
    grd.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx + c.w / 2, cy + c.h / 2, TILE, 0, Math.PI * 2); ctx.fill();
    // Chest body
    ctx.fillStyle = '#8B5E1A';
    ctx.fillRect(cx, cy + c.h * 0.35, c.w, c.h * 0.65);
    // Chest lid
    ctx.fillStyle = '#A0722A';
    ctx.fillRect(cx, cy, c.w, c.h * 0.38);
    // Gold band
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx, cy + c.h * 0.33, c.w, c.h * 0.08);
    // Lock
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx + c.w * 0.4, cy + c.h * 0.55, c.w * 0.2, c.h * 0.25);
    ctx.globalAlpha = 1;
  }
}

// ── Sniper ────────────────────────────────────────────────────────────────────
// Ground-walking mini-boss for level 3.
// States: patrol → lock (beam drawn) → fire (bullet) → reload (blue, homing-able)
// 3 homing hits to kill; only homing-able during reload.

let snipers = [];

function initSnipers(defs) {
  snipers = defs.map((d, i) => ({
    id: 9000 + i,
    x: d.x * TILE, y: (groundY - 1) * TILE,
    w: TILE, h: TILE,
    pl: d.pl * TILE, pr: d.pr * TILE,
    vx: -1.2,
    dir: -1,
    hp: 3, maxHp: 3,
    dead: false, deadTimer: 0,
    hitFlash: 0, lockFlash: 0,
    flying: false,
    state: 'patrol',   // patrol | lock | fire | reload
    stateTimer: 140,   // first shot delay
    // laser tracking: current aim position
    aimX: 0, aimY: 0,
    // bullet ref (null or { x,y,vx,vy,life,sniper:true })
    bullet: null,
    frame: 0,
  }));
}

function damageSniperById(id, dmg) {
  const s = snipers.find(s => s.id === id);
  if (!s || s.dead || s.hitFlash > 0) return false;
  // Only homing hits land during reload; all else bounce off
  s.hp -= dmg;
  s.hitFlash = 18;
  spawnExplosion(s.x + s.w / 2, s.y + s.h / 2, false);
  playSound('hit', 0.6);
  if (s.hp <= 0) {
    s.dead = true; s.deadTimer = 40;
    score += 1500; updateHUD();
    comboCount += 3; comboTimer = 160;
    if (!player.onGround) {
      player.dashAvail = Math.min(player.maxDashes, player.dashAvail + 1);
    }
    return true;
  }
  // After a homing hit survive → go back to patrol/lock cycle
  s.state = 'patrol';
  s.stateTimer = 90;
  return false;
}

function updateSnipers() {
  for (const s of snipers) {
    if (s.dead) { if (s.deadTimer > 0) s.deadTimer--; continue; }
    if (s.hitFlash > 0) s.hitFlash--;
    s.frame += 0.12;
    s.stateTimer--;

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const sx = s.x + s.w / 2;
    const sy = s.y + s.h / 2;

    if (s.state === 'patrol') {
      // Walk left-right within patrol bounds
      s.x += s.vx;
      if (s.x <= s.pl) { s.x = s.pl; s.vx = Math.abs(s.vx); s.dir = 1; }
      if (s.x + s.w >= s.pr) { s.x = s.pr - s.w; s.vx = -Math.abs(s.vx); s.dir = -1; }
      // Face player
      s.dir = px < sx ? -1 : 1;

      // Only lock on when player is airborne
      if (!player.onGround && s.stateTimer <= 0) {
        s.state = 'lock';
        s.stateTimer = 90; // ~1.5s lock-on before shot
        s.aimX = px; s.aimY = py;
      }

    } else if (s.state === 'lock') {
      // Track player smoothly while locking
      s.aimX += (px - s.aimX) * 0.08;
      s.aimY += (py - s.aimY) * 0.08;
      s.dir = s.aimX < sx ? -1 : 1;

      if (!player.onGround) {
        // Reset timer as long as player stays airborne — only fires when locked
        if (s.stateTimer <= 0) {
          // Snap aim to current player pos and fire
          s.aimX = px; s.aimY = py;
          const dx = s.aimX - sx, dy = s.aimY - sy;
          const dist = Math.hypot(dx, dy) || 1;
          const spd = 7;
          s.bullet = { x: sx, y: sy, vx: (dx / dist) * spd, vy: (dy / dist) * spd, life: 180, sniperId: s.id };
          projectiles.push(s.bullet);
          s.state = 'reload';
          s.stateTimer = 70; // reload window — blue & homing-able
        }
      } else {
        // Player landed — abort lock, go back to patrol
        s.state = 'patrol';
        s.stateTimer = 80;
      }

    } else if (s.state === 'reload') {
      // Stand still while reloading; homing/dash can hit here
      if (s.stateTimer <= 0) {
        s.state = 'patrol';
        s.stateTimer = 100 + Math.floor(Math.random() * 60);
      }

      // Contact damage during reload (homing handled by main loop)
      const gr = { x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 };
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (rectsOverlap(gr, pr) && !player.homing && !player.ballForm && !player.dashFrames && player.invincible === 0) {
        hurtPlayer(1); player.invincible = 80;
        player.vx = (player.x < sx ? -1 : 1) * 9; player.vy = -7;
        player.onGround = false;
        playSound('hurt', 0.6);
        if (hp <= 0) killPlayer();
      }
    }

    // During patrol/lock, touching player hurts them (not homing-targetable)
    if (s.state === 'patrol' || s.state === 'lock') {
      const gr = { x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 };
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (rectsOverlap(gr, pr) && player.invincible === 0 && !player.homing && !player.ballForm && !player.dashFrames) {
        hurtPlayer(1); player.invincible = 80;
        player.vx = (player.x < sx ? -1 : 1) * 9; player.vy = -7;
        player.onGround = false;
        playSound('hurt', 0.6);
        if (hp <= 0) killPlayer();
      }
    }
  }
}

function drawSnipers() {
  const t = performance.now() / 1000;
  for (const s of snipers) {
    const ssx = s.x - camera;
    if (ssx < -TILE * 3 || ssx > W + TILE * 3) continue;
    const cx = ssx + s.w / 2, cy = s.y + s.h / 2;

    if (s.dead) {
      if (s.deadTimer > 0) {
        ctx.globalAlpha = s.deadTimer / 40;
        ctx.fillStyle = '#446688';
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      continue;
    }

    const isReload = s.state === 'reload';
    const isLock   = s.state === 'lock';

    // ── Draw lock-on laser beam ──────────────────────────────────────────────
    if (isLock) {
      const lockFrac = 1 - s.stateTimer / 90; // 0→1 as lock progresses
      const aimSx = s.aimX - camera;
      ctx.save();
      // Outer glow
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 20);
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(aimSx, s.aimY); ctx.stroke();
      // Core beam — thickens as lock increases
      ctx.globalAlpha = 0.5 + 0.4 * lockFrac;
      ctx.strokeStyle = `hsl(${20 + lockFrac * 30}, 100%, 65%)`;
      ctx.lineWidth = 1.5 + lockFrac * 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(aimSx, s.aimY); ctx.stroke();
      // Pulsing dot at aim point
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 18);
      ctx.fillStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(aimSx, s.aimY, 4 + lockFrac * 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── Body ─────────────────────────────────────────────────────────────────
    if (s.hitFlash > 0 && Math.floor(s.hitFlash / 3) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx, cy, s.w / 2 - 2, s.h / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Still draw HP bar
    } else {
      const bodyColor  = isReload ? '#1a4a88' : '#223344';
      const bodyHilit  = isReload ? '#2266cc' : '#334455';
      const wf = Math.floor(s.frame) % 2;
      const squish = wf ? 1.05 : 0.97;
      ctx.save();
      ctx.translate(cx, s.y + s.h);
      ctx.scale(s.dir, squish); // flip horizontally by dir
      ctx.scale(1 / squish, 1);
      // Torso
      ctx.fillStyle = bodyColor;
      ctx.beginPath(); ctx.ellipse(0, -s.h / 2, s.w / 2 - 2, s.h / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bodyHilit;
      ctx.beginPath(); ctx.ellipse(-2, -s.h / 2 - 1, s.w / 2 - 6, s.h / 2 - 5, 0, 0, Math.PI * 2); ctx.fill();
      // Eyes — red during patrol/lock, blue during reload
      ctx.fillStyle = isReload ? '#0088ff' : '#ff2244';
      ctx.beginPath(); ctx.arc(-5, -s.h * 0.65, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -s.h * 0.65, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isReload ? '#88ccff' : '#ffee00';
      ctx.beginPath(); ctx.arc(-5, -s.h * 0.65, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -s.h * 0.65, 2, 0, Math.PI * 2); ctx.fill();
      // Cannon arm — stub pointing toward aim
      ctx.fillStyle = isReload ? '#112255' : '#111a22';
      ctx.fillRect(4, -s.h * 0.55, 10, 5);
      // Legs
      ctx.strokeStyle = bodyColor; ctx.lineWidth = 3;
      const legOff = wf ? 4 : -4;
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-8 + legOff, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(8 - legOff, 2); ctx.stroke();
      ctx.restore();

      // Reload glow aura
      if (isReload) {
        const pulse = 0.4 + 0.3 * Math.sin(t * 8);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#2266cc';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, s.w * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = pulse * 0.2;
        ctx.fillStyle = '#4488ff';
        ctx.beginPath(); ctx.arc(cx, cy, s.w * 0.65, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Lock-on brackets (like drawLockOn but tighter / orange)
      if (isLock && player.homingTarget === s) drawLockOn(s);
    }

    // HP pips above
    const pipW = 8, pipGap = 3;
    const totalW = s.maxHp * pipW + (s.maxHp - 1) * pipGap;
    let pipX = cx - totalW / 2;
    const pipY = s.y - 10;
    for (let i = 0; i < s.maxHp; i++) {
      ctx.fillStyle = i < s.hp ? '#ff4444' : '#333';
      ctx.fillRect(pipX, pipY, pipW, 5);
      pipX += pipW + pipGap;
    }
  }
}

