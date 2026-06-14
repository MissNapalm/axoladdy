function update(dt) {
  if (won && !player.wonSlide) return;
  if (dead) return;
  if (turboFlash > 0) { turboFlash--; return; } // freeze during turbo activation
  if (LEVELS[currentLevel].isTutorial && tut.frozen) {
    // Run only essential ticks while frozen (particles, timers) but skip gameplay
    if (tut.anyKeyTimer > 0) tut.anyKeyTimer--;
    return;
  }

  player.w = CFG.axoSize;
  player.h = CFG.axoSize;
  if (player.invincible > 0) player.invincible--;
  if (player.ballExitFlash > 0) player.ballExitFlash--;

  const now = performance.now();
  const goLeft  = keys[KEYS.left]  || false;
  const goRight = keys[KEYS.right] || false;
  const jumpKey = keys[KEYS.jump] || false;
  const upKey   = keys[KEYS.up] || false;
  const jumpJustPressed = jumpKey && !prevJumpKey;
  prevJumpKey = jumpKey;
  prevUpKey   = upKey;

  const eKey = keys[KEYS.dash] || false;
  const eJustPressed = eKey && !prevEKey;
  prevEKey = eKey;

  if (lvlComplete.active) {
    lvlComplete.timer++;
    const t = lvlComplete.timer;
    // Always in walk cycle (not ball) during cinematic
    player.ballForm = false;
    player.homing = false;
    if (t < LVC_FADE_IN) {
      // freeze player in place
      player.vx = 0; player.vy = 0;
    } else if (t < LVC_FADE_IN + LVC_ZOOM) {
      // zoom in — camera already handled in draw
      player.vx = 0; player.vy = 0;
    } else if (t < LVC_FADE_IN + LVC_ZOOM + LVC_TEXT + LVC_HOLD) {
      player.vx = 0; player.vy = 0;
    } else {
      // run off right
      player.vx = CFG.moveSpeed * 1.4;
      player.dir = 1;
      player.x += player.vx;
    }
    if (t >= LVC_TOTAL) {
      lvlComplete.active = false;
      zoom = lvlComplete.zoomStart;
      won = true; player.wonSlide = true;
    }
    return;
  }

  if (player.wonSlide) {
    player.vy = 2.5; player.vx = 0;
    player.y += player.vy;
    if (player.y + player.h >= groundY * TILE) player.y = groundY * TILE - player.h;
    camera += (Math.min(player.x - W / 3, LEVEL_W_TILES * TILE - W) - camera) * CAM_EASE;
    return;
  }

  // Space/jump while airborne — homing attack if enemy nearby
  // Frenzy: 3 homes per jump freely; normal: 3 total but need kill to re-enable per use
  const frenzyActive = player.frenzyTimer > 0;
  const homingAllowed = (frenzyActive || (!player.homingUsed && player.homingCount < CFG.homingChain));
  if (jumpJustPressed && !player.onGround && !player.homing && homingAllowed) {
    const target = nearestLiveGoomba(frenzyActive ? HOMING_RANGE : 169);
    if (target) {
      player.homing = true;
      player.homingTarget = target;
      player.homingUsed = !frenzyActive;
      target.lockFlash = 10;
    }
  }

  // F — directional dash, tracked per direction
  if (eJustPressed && !player.homing) {
    const goingUp = keys[KEYS.up] || false;
    const horizDir = goLeft ? -1 : goRight ? 1 : player.dir;
    const wantH = goLeft || goRight || (!goingUp);
    const wantUp = goingUp;
    const frenzy = player.frenzyTimer > 0;
    const maxDash = frenzy ? 3 : CFG.dashCount;
    const canUp = wantUp && player.dashUsedUp < maxDash;
    const canH  = wantH  && player.dashUsedH  < maxDash;

    if (wantUp && wantH && (canUp || canH)) {
      // diagonal — only allowed if both directions still available
      if (canUp && canH) {
        const spd = frenzy ? CFG.dashFrenzyMult : 0.5;
        const diagH = CFG.dashH * 0.707 * spd;
        const diagV = CFG.dashV * 0.707 * spd;
        player.vx = horizDir * diagH;
        player.vy = -diagV;
        player.dashUsedUp++;
        player.dashUsedH++;
        player.dashFrames = frenzy ? CFG.dashLenFrenzy : CFG.dashLen;
        player.ballForm = true;
        player.spinning = false;
      }
    } else if (wantUp && canUp) {
      player.vx = 0;
      player.vy = -(CFG.dashV * (frenzy ? CFG.dashFrenzyMult : 0.5));
      player.dashUsedUp++;
      player.dashFrames = frenzy ? CFG.dashLenFrenzy : CFG.dashLen;
      player.dashingUp = true;
      player.ballForm = true;
      player.spinning = false;
    } else if (canH) {
      player.vx = horizDir * CFG.dashH * (frenzy ? CFG.dashFrenzyMult : 0.5);
      player.vy = 0;
      player.dashUsedH++;
      player.dashFrames = frenzy ? CFG.dashLenFrenzy : CFG.dashLen;
      player.ballForm = true;
      player.spinning = false;
    }
    if (player.dashFrames > 0) playSound('dash', 0.45);
  }

  // Tick dash frames and spawn afterimage trail
  if (player.dashFrames > 0) {
    player.dashFrames--;
    if (player.dashFrames === 0) { player.dashingUp = false; if (!player.homing) { if (player.ballForm) player.ballExitFlash = BALL_EXIT_FLASH; player.ballForm = false; } }
    // dense afterimage trail — two per frame
    spawnDashTrail(player.x + player.w / 2, player.y + player.h / 2);
    spawnDashTrail(player.x + player.w / 2, player.y + player.h / 2);
  }

  // Drive homing movement
  if (player.homing && player.homingTarget) {
    const tg = player.homingTarget;
    if (tg.dead) {
      player.homing = false; player.homingTarget = null; player.ballForm = true;
    } else {
      const tx = tg.x + tg.w / 2, ty = tg.y + tg.h / 2;
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      const dx = tx - px, dy = ty - py;
      const dist = Math.hypot(dx, dy);
      const hitDist = (tg === chaser.bolt) ? 40 : 12;
      if (dist < hitDist) {
        // Chaser bolt — reflect back at chaser
        if (tg === chaser.bolt) {
          const bx = chaser.bolt.x, by = chaser.bolt.y;
          const cx2 = chaser.x + chaser.w / 2, cy2 = chaser.y + chaser.h / 2;
          const dx2 = cx2 - bx, dy2 = cy2 - by;
          const d2 = Math.hypot(dx2, dy2) || 1;
          const spd = Math.hypot(chaser.bolt.vx, chaser.bolt.vy) * 1.3;
          chaser.bolt.vx = (dx2 / d2) * spd;
          chaser.bolt.vy = (dy2 / d2) * spd;
          chaser.bolt.reflected = true;
          chaser.bolt.life = 180;
          player.homing = false; player.homingTarget = null;
          player.ballForm = true; player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
          player.spinning = false;
        // Red bat mini-boss homing hit
        } else if (tg === redBat) {
          damageRedBat(player.frenzyTimer > 0 ? redBat.hp : 1);
          comboCount++; comboTimer = 120;
        } else if (snipers.includes(tg)) {
          damageSniperById(tg.id, 1);
          comboCount++; comboTimer = 120;
        } else {
          const killed = damageEnemy(tg, 1);
          if (killed) { comboCount++; comboTimer = 120; }
        }
        if (tg !== chaser.bolt) {
          checkComboAchievements();
          player.homing = false; player.homingTarget = null;
          player.ballForm = true;
          player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
          player.spinning = false;
        }
      } else {
        player.vx = (dx / dist) * HOMING_SPEED;
        player.vy = (dy / dist) * HOMING_SPEED;
        if (player.vx > 0) player.dir = 1;
        else if (player.vx < 0) player.dir = -1;
        spawnTrail(player.x + player.w / 2, player.y + player.h / 2);
      }
    }
  }

  // Normal movement (not homing, not dashing)
  if (!player.homing && player.dashFrames <= 0) {
    if (goRight) { player.vx = CFG.moveSpeed; player.dir = 1; }
    else if (goLeft) { player.vx = -CFG.moveSpeed; player.dir = -1; }
    else player.vx *= 0.75;
  }

  // Jump from ground only
  if (jumpJustPressed && player.onGround) {
    player.vy = -CFG.jump1;
    player.onGround = false;
    player.homingUsed = false;
    player.homingCount = 0;
    player.dashKills = 0;
    playSound('jump', 0.5);
  }

  // Spin during homing or after a dash
  if (player.spinning || player.homing || player.ballForm) {
    player.spinAngle += player.homing ? 28 : 18;
    if (Math.random() < 0.5) spawnTrail(player.x + player.w / 2, player.y + player.h / 2);
  }

  // Gravity (suppressed during homing and active dash frames)
  if (!player.homing && player.dashFrames <= 0) {
    const g = player.onGround ? CFG.gravity : CFG.gravity1;
    player.vy += g;
    if (player.vy > 20) player.vy = 20;
  }

  // Move X
  player.x += player.vx;
  player.x = Math.max(0, player.x);

  // Ceiling — invisible wall at top of world
  if (player.y < 0) { player.y = 0; if (player.vy < 0) player.vy = 0; }

  // Destroy any platform block touched while dashing or homing — BEFORE collision checks
  if (player.homing || player.dashFrames > 0) {
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (const s of getSolidsNear(player.x, player.y, player.w, player.h)) {
      if (s.key && s.type !== 'wall' && !blockHit[s.key] && rectsOverlap(pr, s)) hitBlock(s);
    }
  }

  // Collide X — skip wall collision while homing so player reaches target
  if (!player.homing) {
    const nearX = getSolidsNear(player.x, player.y, player.w, player.h);
    for (const s of nearX) {
      if (blockHit[s.key]) continue;
      const hitBox = { x: player.x, y: player.y + 2, w: player.w, h: player.h - 4 };
      // Touching check (>=) so frenzy fires even when flush against the tile
      if (!(hitBox.x <= s.x + s.w && hitBox.x + hitBox.w >= s.x && hitBox.y < s.y + s.h && hitBox.y + hitBox.h > s.y)) continue;
      if ((s.type === 'pipe' || s.type === 'pipetop') && player.frenzyTimer > 0) {
        blockHit[s.key] = true;
        score += 50; updateHUD();
        spawnBlockDebris(s.x + s.w / 2, s.y + s.h / 2, 'brick');
        playSound('hit', 0.5);
        const idx = solids.indexOf(s);
        if (idx !== -1) solids.splice(idx, 1);
      } else if (hitBox.x < s.x + s.w && hitBox.x + hitBox.w > s.x) {
        if (player.vx > 0) player.x = s.x - player.w;
        else if (player.vx < 0) player.x = s.x + s.w;
        player.vx = 0;
      }
    }
  }

  // Move Y
  const wasOnGround = player.onGround;
  player.onGround = false;
  player.y += player.vy;

  // Skip Y solid collision while homing — player flies through to reach target
  if (!player.homing) {
    const nearY = getSolidsNear(player.x, player.y, player.w, player.h);
    for (const s of nearY) {
      if (blockHit[s.key]) continue;
      if (!rectsOverlap({ x: player.x + 2, y: player.y, w: player.w - 4, h: player.h }, s)) continue;
      if ((s.type === 'pipe' || s.type === 'pipetop') && player.frenzyTimer > 0) {
        blockHit[s.key] = true;
        score += 50; updateHUD();
        spawnBlockDebris(s.x + s.w / 2, s.y + s.h / 2, 'brick');
        playSound('hit', 0.5);
        const idx = solids.indexOf(s);
        if (idx !== -1) solids.splice(idx, 1);
        continue;
      }
      if (player.vy > 0) {
        player.y = s.y - player.h;
        player.vy = 0;
        if (!wasOnGround) {
          player.lastLandTime = now;
          spawnDust(player.x + player.w / 2, player.y + player.h);
          playSound('land', 0.3);
          player.spinning = false;
          if (player.ballForm) player.ballExitFlash = BALL_EXIT_FLASH;
          player.ballForm = false;
          player.dashingUp = false;
          player.dashFrames = 0;
          comboCount = 0; comboTimer = 0;
        }
        player.onGround = true;
        player.homingUsed = false; player.homingCount = 0;
        player.dashUsedUp = 0; player.dashUsedH = 0; player.dashKills = 0;
      } else if (player.vy < 0) {
        player.y = s.y + s.h;
        player.vy = 1;
        hitBlock(s);
      }
    }
  }


  // Pit death — frenzy wraps to ceiling instead
  if (player.y > H + 200) {
    if (player.frenzyTimer > 0) {
      player.y = -player.h;
      player.vy = Math.abs(player.vy) * 0.5;
    } else {
      killPlayer(); return;
    }
  }

  // Coins
  for (const coin of coins) {
    if (coin.collected) continue;
    coin.bobTimer += 0.05;
    if (rectsOverlap({ x: coin.x + 4, y: coin.y + 4, w: TILE - 8, h: TILE - 8 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      coin.collected = true; coinCount++; score += 200; updateHUD(); playSound('coin', 0.5);
      // Coins nudge frenzy meter (every 3 coins = 1 kill)
      if (player.frenzyTimer <= 0) {
        player.coinFrenzyAcc = (player.coinFrenzyAcc || 0) + 1;
        if (player.coinFrenzyAcc >= 10) { player.coinFrenzyAcc -= 10; player.frenzyKills = Math.min(player.frenzyKills + 1, 12); }
      }
    }
  }

  // Frenzy activation (R or Q)
  if (frenzyKeyPressed) {
    const devMode = frenzyKeyDev;
    frenzyKeyPressed = false; frenzyKeyDev = false;
    if ((devMode || player.frenzyKills >= 12) && player.frenzyTimer <= 0) {
      player.frenzyKills = 0;
      player.frenzyTimer = 540;
      player.homingUsed = false;
      turboFlash = 70;
      hp = MAX_HP; updateHPBar();
      spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, true);
    }
  }

  // Cancel frenzy when entering the boss arena (only once player is close to the boss)
  if (player.frenzyTimer > 0 && redBat.active && !redBat.dead && player.x >= redBat.x - 600) {
    player.frenzyTimer = 0;
    player.frenzyKills = 0;
  }

  // Frenzy tick + trail
  if (player.frenzyTimer > 0) {
    player.frenzyTimer--;
    // Spawn cyan trail every frame
    trailParticles.push({
      x: player.x + player.w / 2 + (Math.random() - 0.5) * 10,
      y: player.y + player.h / 2 + (Math.random() - 0.5) * 10,
      r: Math.random() * 7 + 4,
      life: 18 + Math.floor(Math.random() * 8),
      maxLife: 26,
      hue: 185 + Math.random() * 30,
      bright: true,
      frenzyTrail: true,
    });
  }

  // Heart pickups
  const groundFloor = (groundY - 1) * TILE;
  for (let i = heartPickups.length - 1; i >= 0; i--) {
    const h = heartPickups[i];
    if (h.collected) { heartPickups.splice(i, 1); continue; }
    h.vy += 0.45;
    if (h.vy > 18) h.vy = 18;
    h.x += h.vx;
    h.y += h.vy;
    h.vx *= 0.96;
    if (h.y + 20 >= groundFloor) { h.y = groundFloor - 20; h.vy = 0; h.vx = 0; }
    h.bobTimer += 0.06;
    if (rectsOverlap({ x: h.x, y: h.y, w: 20, h: 20 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      h.collected = true;
      hp = Math.min(MAX_HP, hp + 1); updateHPBar();
    }
  }

  // Ground enemies + flyers — unified update
  const allEnemies = [...goombas, ...flyers];
  for (const g of allEnemies) {
    if (g.dead) { g.deadTimer--; if (g.lockFlash) g.lockFlash--; continue; }
    if (g.lockFlash) g.lockFlash--;
    if (g.shockStun > 0) { g.shockStun--; continue; } // frozen during shockwave
    // Reverse at patrol bounds or pit edges (ground enemies only)
    if (!g.flying) {
      const nextX = g.x + g.vx;
      const edgeTile = Math.floor((g.vx > 0 ? nextX + g.w : nextX) / TILE);
      const onPit = LEVELS[currentLevel].gaps.some(gap => edgeTile >= gap.x && edgeTile < gap.x + gap.w);
      if (onPit) g.vx *= -1;
    }
    g.x += g.vx;
    if (g.x <= g.pl || g.x + g.w >= g.pr) g.vx *= -1;
    g.frame += 0.08;
    if (g.flying) {
      g.wobble += 0.04;
      // Clamp baseY so the full wobble arc (+/-18px) never enters a block
      for (const s of solids) {
        if (s.type === 'ground') continue;
        if (g.x + g.w > s.x && g.x < s.x + s.w) {
          const topEdge = s.y - g.h - 18 - 2; // keep arc bottom clear
          const botEdge = s.y + s.h + 18 + 2;  // keep arc top clear
          if (g.baseY > topEdge && g.baseY < botEdge) {
            // Push baseY to whichever side is closer
            g.baseY = (g.baseY < s.y + s.h / 2) ? topEdge : botEdge;
          }
        }
      }
      g.y = g.baseY + Math.sin(g.wobble) * 18;
    }

    {
      // Shoot logic — flying bats and ground shooters
      if (g.flying || g.type === 'shooter') {
        if (!g.shootCooldown) g.shootCooldown = 180 + Math.floor(Math.random() * 120);
        g.shootCooldown--;
        if (g.shootCooldown <= 0) {
          const dx = (player.x + player.w / 2) - (g.x + g.w / 2);
          const dy = (player.y + player.h / 2) - (g.y + g.h / 2);
          const dist = Math.hypot(dx, dy);
          if (dist < 380) {
            const spd = 4.5, ang = Math.atan2(dy, dx);
            const spreads = (g.flying && g.red) ? [-0.25, 0, 0.25] : [0];
            for (const spread of spreads) {
              projectiles.push({ x: g.x + g.w/2, y: g.y + g.h/2,
                vx: Math.cos(ang + spread) * spd, vy: Math.sin(ang + spread) * spd, life: 130, flying: true });
            }
          }
          g.shootCooldown = 180 + Math.floor(Math.random() * 120);
        }
      }
    }

    if (g.hitFlash > 0) g.hitFlash--;
    const gr = { x: g.x + 2, y: g.y + 2, w: g.w - 4, h: g.h - 4 };
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(gr, pr)) {
      if (player.dashFrames > 0 && !g.hitFlash) {
        if (!g.flying && player.frenzyTimer <= 0) {
          // Normal mode: dash into ground enemy hurts player, bounces back, goomba unharmed
          hurtPlayer(1); player.invincible = 60;
          player.vx = -Math.sign(player.vx) * 10;
          player.vy = -7;
          player.dashFrames = 0;
          player.onGround = false;
          playSound('hurt', 0.6);
          if (hp <= 0) { killPlayer(); return; }
        } else if (g.flying && player.frenzyTimer <= 0) {
          // Normal mode: dash into bat hurts player
          hurtPlayer(1); player.invincible = 60;
          player.vx = -Math.sign(player.vx) * 10;
          player.vy = -7;
          player.dashFrames = 0;
          player.onGround = false;
          playSound('hurt', 0.6);
          if (hp <= 0) { killPlayer(); return; }
        } else {
          // Frenzy: dash kills anything
          if (damageEnemy(g, g.hp)) { comboCount++; comboTimer = 120; checkComboAchievements(); }
          player.vx = -Math.sign(player.vx) * 8;
          player.vy = -6;
          player.dashFrames = 0;
          player.onGround = false;
        }
      } else if (CFG.stompKill && (player.spinning || (player.vy > 0 && !player.homing && player.y + player.h < g.y + g.h / 2 + 10))) {
        if (damageEnemy(g, 1)) { comboCount++; comboTimer = 120; checkComboAchievements(); }
        player.vy = -6;
        player.onGround = false;
      } else if (player.homing) {
        // homing handled separately
      } else if (!player.homing && !player.ballForm && !player.dashFrames && player.invincible === 0) {
        hurtPlayer(1); player.invincible = 80;
        playSound('hurt', 0.6);
        if (hp <= 0) { killPlayer(); return; }
      }
    }
  }

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) { projectiles.splice(i, 1); continue; }
    if (rectsOverlap({ x: p.x - 5, y: p.y - 5, w: 10, h: 10 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      projectiles.splice(i, 1);
      if (player.invincible === 0) {
        hurtPlayer(1);
        // Knockback away from projectile direction
        player.vx = (p.vx > 0 ? 1 : -1) * 9;
        player.vy = -7;
        player.onGround = false;
        player.invincible = 80;
        if (hp <= 0) { killPlayer(); return; }
      }
    }
  }


  // Tutorial step detection
  tutCheck();

  // Boss update
  updateBoss();
  updateWraith();
  updateWarden();
  updateRedBat();
  updateSnipers();
  updateChaser();

  // Flag — level complete on non-boss, non-tutorial levels (not level 1 which ends with red bat)
  if (!LEVELS[currentLevel].isBossLevel && !LEVELS[currentLevel].isTutorial && currentLevel !== 1) {
    if (player.x + player.w > FLAG_X * TILE && !won) {
      {
        lvlComplete.active = true;
        lvlComplete.timer = 0;
        lvlComplete.zoomStart = zoom;
        lvlComplete.camXStart = camera;
        player.vx = 0; player.vy = 0;
        player.x = FLAG_X * TILE - player.w + 6;
        score += 1000; updateHUD();
      }
    }
  }

  // Camera X — keep player horizontally centered at all zoom levels
  const targetCam = player.x + player.w / 2 - W / 2;
  camera += (Math.min(Math.max(targetCam, 0), LEVEL_W_TILES * TILE - W) - camera) * CAM_EASE;

  // Camera Y — keep player vertically centered at all zoom levels
  const targetCamY = player.y + player.h / 2 - H / 2;
  cameraY += (Math.min(Math.max(targetCamY, groundY * TILE - H), 0) - cameraY) * CAM_EASE;

  if (comboTimer > 0) comboTimer--;
  updateHUD();
}

function spawnBlockDebris(x, y, type) {
  const colors = type === 'qblock' ? ['#f5c542','#e8a800','#fff176','#c8960a']
               : type === 'hblock' ? ['#ff6666','#cc0000','#ff9999','#880000']
               : ['#a0522d','#8b3a0f','#c47a3a','#5c2a0a'];
  const count = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI + Math.random() * Math.PI * 2;
    const spd = 3 + Math.random() * 7;
    explosionParticles.push({
      x: x + (Math.random() - 0.5) * TILE,
      y: y + (Math.random() - 0.5) * TILE,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 3,
      r: 4 + Math.random() * 6,
      life: 35 + Math.floor(Math.random() * 25),
      maxLife: 60,
      hue: 0, color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.45, square: true,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.3,
    });
  }
  // bright flash
  explosionParticles.push({ x, y, vx:0, vy:0, r:20, life:5, maxLife:5, hue:45, flash:true });
}

function hitBlock(s) {
  if (!s.key || blockHit[s.key]) return;
  blockHit[s.key] = true;
  if (s.type === 'qblock') { score += 200; }
  else if (s.type === 'brick') score += 50;
  else if (s.type === 'hblock') { hp = Math.min(MAX_HP, hp + 1); updateHPBar(); }
  updateHUD();
  spawnBlockDebris(s.x + s.w / 2, s.y + s.h / 2, s.type);
  playSound('hit', 0.5);
  // Remove block entirely from solids array
  const idx = solids.indexOf(s);
  if (idx !== -1) solids.splice(idx, 1);
  // Tutorial: block destroyed while in frenzy/dash → step 7 complete
  if (LEVELS[currentLevel]?.isTutorial && tut.step === 7 && !tut.hasBrokenBlock && player.frenzyTimer > 0) {
    tut.hasBrokenBlock = true; tutAdvance();
  }
}

function hurtPlayer(dmg = 1) {
  if (player.frenzyTimer > 0) return; // infinite health during frenzy
  hp -= dmg; updateHPBar();
}

function killPlayer() {
  if (dead) return;
  dead = true; player.dead = true; player.vy = -12; player.vx = 0;
  setTimeout(() => {
    document.getElementById('go-score').textContent = 'Score: ' + String(score).padStart(6, '0');
    document.getElementById('gameover').classList.add('show');
  }, 1200);
}

function doRestart() {
  document.getElementById('gameover').classList.remove('show');
  loadLevel(currentLevel);
  hp = MAX_HP;
  updateHPBar();
}

document.getElementById('go-restart').addEventListener('click', doRestart);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && dead) doRestart();
});

let frenzyKeyPressed = false, frenzyKeyDev = false;
document.addEventListener('keydown', e => {
  if ((e.code === 'KeyR' || e.code === 'KeyQ') && !dead) {
    frenzyKeyPressed = true;
    frenzyKeyDev = e.code === 'KeyQ';
  }
});

