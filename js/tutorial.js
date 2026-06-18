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
  // Shooter bats — always homing-able
  for (const b of shooterBats) {
    if (!b.dead) candidates.push(b);
  }
  // Chests — homing target to collect
  for (const c of chests) {
    if (!c.collected) candidates.push(c);
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
