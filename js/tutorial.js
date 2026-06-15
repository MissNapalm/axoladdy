function nearestLiveGoomba(range = HOMING_RANGE) {
  const px = player.x + player.w / 2, py = player.y + player.h / 2;
  let best = null, bestDist = Infinity;
  // Include boss orbs and boss itself as homing targets
  const candidates = [...goombas, ...flyers];
  if (boss.active && !boss.dead) {
    const allOrbsDead = boss.orbs.every(o => o.dead);
    if (boss.orbs.length > 0) {
      for (const o of boss.orbs) { if (!o.dead) candidates.push(o); }
    }
    if (allOrbsDead) candidates.push(boss);
  }
  if (wraith.active && !wraith.dead) {
    const liveClones = wraith.clones.filter(c => !c.dead);
    if (liveClones.length > 0) {
      const minOrder = Math.min(...liveClones.map(c => c.orderNum));
      for (const c of liveClones) { if (c.orderNum === minOrder) candidates.push(c); }
    } else {
      candidates.push(wraith);
    }
  }
  if (warden.active && !warden.dead) {
    for (const rk of warden.rocks) { if (!rk.dead) candidates.push(rk); }
    for (const s of warden.sentinels) { if (!s.dead) candidates.push(s); }
    candidates.push(warden); // always targetable; homing bounces unless red
  }
  // Chaser bolt — homing-lock onto the bolt so player can dash into it and reflect
  if (chaser.active && !chaser.dead && chaser.bolt && !chaser.bolt.reflected && !chaser.bolt.dead) {
    const boltProxy = { x: chaser.bolt.x - 8, y: chaser.bolt.y - 8, w: 16, h: 16, dead: false, _isChaserBolt: true };
    candidates.push(boltProxy);
  }
  // Red bat mini-boss — homing target during idle/freeze only
  if (redBat.active && !redBat.dead && (redBat.state === 'idle' || redBat.state === 'freeze')) {
    candidates.push(redBat);
  }
  // Snipers — homing target only during reload
  for (const sn of snipers) {
    if (!sn.dead && sn.state === 'reload') candidates.push(sn);
  }
  for (const g of candidates) {
    if (g.dead) continue;
    const gx = g.x + g.w / 2, gy = g.y + g.h / 2;
    const dist = Math.hypot(px - gx, py - gy);
    if (dist < range && dist < bestDist) { best = g; bestDist = dist; }
  }
  return best;
}

function tutAdvance() {
  tut.step++;
  // Side effects when entering a step
  if (tut.step === 6) {
    // (reserved)
  }
  if (tut.step >= TUT_STEPS.length - 1) {
    // Show final "tutorial complete" card then auto-load level 1
    tut.step = TUT_STEPS.length - 1;
    tut.frozen = true;
    tut.anyKeyTimer = 999999; // no any-key dismiss on final step
    setTimeout(() => {
      tut.done = true;
      tut.frozen = false;
      loadLevel(1);
      player.x = 2 * TILE; player.y = groundY * TILE - player.h;
      player.vx = 0; player.vy = 0; camera = 0;
    }, 2500);
    return;
  }
  tut.frozen = true;
  tut.anyKeyTimer = 30; // grace frames before any-key detection
}

function tutCheck() {
  if (!LEVELS[currentLevel].isTutorial || tut.done) return;
  if (tut.frozen) { if (tut.anyKeyTimer > 0) tut.anyKeyTimer--; return; }
  const s = tut.step;
  if (s === 0 && !tut.hasMoved) {
    if (keys[KEYS.left] || keys[KEYS.right]) { tut.hasMoved = true; tutAdvance(); }
  } else if (s === 1 && !tut.hasJumped) {
    if (!player.onGround && player.vy < 0) { tut.hasJumped = true; tutAdvance(); }
  } else if (s === 2 && !tut.hasDashed) {
    if (!player.onGround && player.dashFrames > 0 && !player.dashingUp) { tut.hasDashed = true; tutAdvance(); }
  } else if (s === 3 && !tut.hasUpDashed) {
    if (!player.onGround && player.dashFrames > 0 && player.dashingUp) { tut.hasUpDashed = true; tutAdvance(); }
  } else if (s === 4 && !tut.hasHomed) {
    if (player.homing) { tut.hasHomed = true; tutAdvance(); }
  } else if (s === 5 && !tut.hasHitTough) {
    // Detected in damageEnemy when enemy survives
  } else if (s === 6 && !tut.hasActivatedTurbo) {
    if (player.frenzyTimer > 0) { tut.hasActivatedTurbo = true; tutAdvance(); }
  } else if (s === 7 && !tut.hasBrokenBlock) {
    // Detected in hitBlock
  }
}

let tutAnyKeyListener = null;
function tutSetupAnyKey() {
  if (tutAnyKeyListener) return;
  tutAnyKeyListener = (e) => {
    if (!LEVELS[currentLevel]?.isTutorial || tut.done) return;
    if (!tut.frozen || tut.anyKeyTimer > 0) return;
    if (e.code === 'KeyR' || e.code === 'KeyQ') return; // don't consume frenzy key
    tut.frozen = false;
  };
  document.addEventListener('keydown', tutAnyKeyListener);
}

