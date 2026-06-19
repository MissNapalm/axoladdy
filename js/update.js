
function update(dt) {
  if (won && !player.wonSlide) return;
  if (dead) return;

  player.w = CFG.axoSize;
  player.h = CFG.axoSize;
  if (player.invincible > 0) player.invincible--;
  if (player.ballExitFlash > 0) player.ballExitFlash--;

  const now = performance.now();

  {
  }

  const goLeft  = keys[KEYS.left]  || false;
  const goRight = keys[KEYS.right] || false;
  const jumpKey = keys[KEYS.jump] || false;
  const upKey   = keys[KEYS.up] || false;
  const jumpJustPressed = jumpKey && !prevJumpKey;
  prevJumpKey = jumpKey;
  prevUpKey   = upKey;

  const eKey    = keys[KEYS.dash] || false;
  const downKey = keys[KEYS.down] || false;
  const yKey    = keys['KeyY'] || false;
  const rKey    = keys['KeyR'] || false;
  const eJustPressed    = eKey    && !prevEKey;
  const downJustPressed = downKey && !prevDownKey;
  const yJustPressed    = yKey    && !prevYKey;
  const rJustPressed    = rKey    && !prevRKey;
  prevEKey    = eKey;
  prevDownKey = downKey;
  prevYKey    = yKey;
  prevRKey    = rKey;

  if (rJustPressed) {
    player.homingBonus = 4;
    player.homingRechargeTimer = 0;
    playSound('gem', 0.6);
    spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, true);
  }

  // Homing cooldown: once fully depleted, timer runs 5 seconds (300 frames) then refills to 4
  if (player.homingBonus === 0 && player.homingRechargeTimer > 0) {
    player.homingRechargeTimer--;
    if (player.homingRechargeTimer <= 0) {
      player.homingBonus = 4;
      player.homingRechargeTimer = 0;
    }
  }

  if (yJustPressed && medPacks > 0 && hp < MAX_HP) {
    medPacks--;
    hp++;
    updateHPBar();
    updateMedPackHUD();
  }

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
  const homingOnCooldown = player.homingBonus === 0 && player.homingRechargeTimer > 0;
  const canHoming = !homingOnCooldown && (player.homingBonus > 0 || (CFG.homingChain > 0 && player.homingAvail > 0));
  if (jumpJustPressed && !player.onGround && !player.homing && canHoming) {
    const target = nearestLiveGoomba(HOMING_RANGE);
    if (target) {
      player.homing = true;
      player.homingTarget = target;
      if (player.homingBonus > 0) {
        player.homingBonus--;
        if (player.homingBonus === 0) player.homingRechargeTimer = 300;
      } else {
        player.homingAvail = 0;
      }
      target.lockFlash = 10;
    }
  }

  // F — directional dash
  if (eJustPressed && !player.homing && player.dashAvail > 0) {
    const goingUp = keys[KEYS.up] || false;
    const horizDir = goLeft ? -1 : goRight ? 1 : player.dir;
    const wantDown = downKey && !player.onGround;
    const wantUp = !wantDown && goingUp;
    const prevFrames = player.dashFrames;

    if (wantDown && !CFG.slamUnlocked) {
      player.vx = 0;
      player.vy = CFG.dashV * 0.5;
      player.dashAngle = Math.PI / 2;
      player.dashFrames = CFG.dashLen;
      player.spinning = false;
      playSound('dash', 0.45);
    } else if (wantUp && (goLeft || goRight)) {
      const diagH = CFG.dashH * 0.707 * 0.5;
      const diagV = CFG.dashV * 0.707 * 0.5;
      player.vx = horizDir * diagH;
      player.vy = -diagV;
      player.dashAngle = Math.atan2(-diagV, horizDir * diagH);
      player.dashFrames = CFG.dashLen;
      player.spinning = false;
    } else if (wantUp) {
      player.vx = 0;
      player.vy = -(CFG.dashV * 0.5);
      player.dashAngle = -Math.PI / 2;
      player.dashFrames = CFG.dashLen;
      player.dashingUp = true;
      player.spinning = false;
    } else if (!wantDown) {
      player.vx = horizDir * CFG.dashH * 0.5;
      player.vy = 0;
      player.dashAngle = horizDir > 0 ? 0 : Math.PI;
      player.dashFrames = CFG.dashLen;
      player.spinning = false;
    }
    if (player.dashFrames > prevFrames) {
      player.dashAvail--;
      playSound('dash', 0.45);
    }
  }

  // X+F — slam dash downward (independent of dash count, 1 use per airtime)
  if (CFG.slamUnlocked && eJustPressed && downKey && !player.onGround && !player.homing && !player.dashingDown && player.slamFreezeTimer === 0 && !player.slamUsed) {
    player.slamFreezeTimer = 12;
    player.slamUsed = true;
    player.spinning = false;
  }
  // Tick slam freeze — float up then launch downward
  if (player.slamFreezeTimer > 0) {
    player.slamFreezeTimer--;
    player.vx = 0;
    player.vy = -3; // drift upward during freeze
    if (player.slamFreezeTimer === 0) {
      player.vy = CFG.dashV * 0.6;
      player.dashingDown = true;
      playSound('dash', 0.45);
    }
  }

  // Tick dash frames and spawn afterimage trail
  if (player.dashFrames > 0) {
    player.dashFrames--;
    if (player.dashFrames === 0) { player.dashingUp = false; if (!player.homing) { if (player.ballForm) player.ballExitFlash = BALL_EXIT_FLASH; player.ballForm = false; } }
    spawnDashTrail(player.x + player.w / 2, player.y + player.h / 2);
    spawnDashTrail(player.x + player.w / 2, player.y + player.h / 2);
    spawnDashTrail(player.x + player.w / 2, player.y + player.h / 2);
    spawnDashTrail(player.x + player.w / 2, player.y + player.h / 2);
  }

  // Drive homing movement
  if (player.homing && player.homingTarget) {
    const tg = player.homingTarget;
    if (tg.dead) {
      player.homing = false; player.homingTarget = null;
    } else {
      // If homing at the chaser bolt, track the live bolt position
      if (tg._isChaserBolt && chaser.bolt && !chaser.bolt.dead && !chaser.bolt.reflected) {
        tg.x = chaser.bolt.x - 8; tg.y = chaser.bolt.y - 8;
      } else if (tg._isChaserBolt) {
        // Bolt gone — cancel homing
        player.homing = false; player.homingTarget = null;
      }
      const tx = tg.x + tg.w / 2, ty = tg.y + tg.h / 2;
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      const dx = tx - px, dy = ty - py;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) {
        if (tg._isChaserBolt) {
          // Bolt reflect is handled in enemies.js when player.homing && overlapping bolt
          // Just cancel homing here so the reflect check fires cleanly next frame
          player.homing = false; player.homingTarget = null;
        } else if (tg === redBat) {
          damageRedBat(1);
          comboCount++; comboTimer = 120;
          checkComboAchievements();
          player.homing = false; player.homingTarget = null;
          if (player.homingBonus <= 0) { player.homingAvail = CFG.homingChain > 1 ? CFG.homingChain - 1 : 0; }
          player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
          player.spinning = false;
          player.onGround = false;
          player.invincible = 30; player.invincibleNoFlash = true;
        } else if (snipers.includes(tg)) {
          damageSniperById(tg.id, 1);
          comboCount++; comboTimer = 120;
          checkComboAchievements();
          player.homing = false; player.homingTarget = null;
          if (player.homingBonus <= 0) { player.homingAvail = CFG.homingChain > 1 ? CFG.homingChain - 1 : 0; }
          player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
          player.spinning = false;
          player.onGround = false;
          player.invincible = 30; player.invincibleNoFlash = true;
        } else if (shooterBats.includes(tg)) {
          tg.hp--; tg.hitFlash = 14;
          if (tg.hp <= 0) { tg.dead = true; tg.deadTimer = 30; spawnExplosion(tg.x + tg.w / 2, tg.y + tg.h / 2, false); playSound('dies', 0.7); }
          comboCount++; comboTimer = 120;
          checkComboAchievements();
          player.homing = false; player.homingTarget = null;
          if (player.homingBonus <= 0) { player.homingAvail = CFG.homingChain > 1 ? CFG.homingChain - 1 : 0; }
          player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
          player.spinning = false;
          player.onGround = false;
          player.invincible = 30; player.invincibleNoFlash = true;
        } else if (chests.includes(tg)) {
          player.homing = false; player.homingTarget = null;
          player.vy = -8;
          player.onGround = false;
          player.invincible = 30; player.invincibleNoFlash = true;
        } else {
          const killed = damageEnemy(tg, tg.flying ? 1 : tg.hp);
          if (killed) { comboCount++; comboTimer = 120; }
          checkComboAchievements();
          player.homing = false; player.homingTarget = null;
          if (player.homingBonus <= 0) { player.homingAvail = CFG.homingChain > 1 ? CFG.homingChain - 1 : 0; }
          player.vy = -6;
          player.vx = player.dir * CFG.moveSpeed * 1.5;
          player.spinning = false;
          player.onGround = false;
          player.invincible = 30; player.invincibleNoFlash = true;
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

  // Normal movement (not homing, not dashing, not in knockback)
  if (player.knockbackTimer > 0) { player.knockbackTimer--; player.vx *= 0.82; }
  else if (!player.homing && player.dashFrames <= 0) {
    if (goRight) { player.vx = CFG.moveSpeed; player.dir = 1; }
    else if (goLeft) { player.vx = -CFG.moveSpeed; player.dir = -1; }
    else player.vx *= 0.75;
  }

  // Jump from ground only
  if (jumpJustPressed && player.onGround) {
    player.vy = -CFG.jump1;
    player.onGround = false;
    player.homingAvail = CFG.homingChain;
    player.dashAvail = player.maxDashes;
    jumpAnimState = 'air'; jumpAnimFrame = 0; jumpAnimTick = 0;
    playSound('jump', 0.5);
  }

  // Spin during homing or after a dash
  if (player.spinning || player.homing || player.ballForm) {
    player.spinAngle += player.homing ? 28 : 18;
    if (Math.random() < 0.5) spawnTrail(player.x + player.w / 2, player.y + player.h / 2);
  }

  // Stomp kill flip — one clockwise 360 over 20 frames
  if (player.stompFlipTimer > 0) {
    player.stompFlipTimer--;
    player.stompFlipAngle += 360 / 14;
  } else {
    player.stompFlipAngle = 0;
  }

  // Gravity (suppressed during homing and active dash frames)
  if (!player.homing && player.dashFrames <= 0) {
    const g = player.onGround ? CFG.gravity : CFG.gravity1;
    player.vy += g;
    if (player.vy > 20) player.vy = 20;
  }

  // Loop-the-loop — scripted path system
  if (LEVELS[currentLevel].isLoopLevel) {
    const lv = LEVELS[currentLevel];
    const lcx = lv.loopCenterTX * TILE + TILE / 2;
    const lcy = lv.loopCenterTY * TILE + TILE / 2;
    const lR = lv.loopRadiusTiles * TILE;

    if (player.onLoop) {
      // ── Scripted path: move player along the circle ──
      // Sonic formula: tangential deceleration on uphill, acceleration on downhill
      // loopAngle starts at PI/2 (bottom), decreases (counter-clockwise) for a lap
      player.loopSpeed -= Math.sin(player.loopAngle) * CFG.gravity1 * 0.7;
      // Clamp so player can't reverse inside the loop
      if (player.loopSpeed > -1) player.loopSpeed = -1;
      player.loopAngle += player.loopSpeed / lR;

      // Position player on circle surface (feet on the inside of the ring)
      player.x = lcx + Math.cos(player.loopAngle) * lR - player.w / 2;
      player.y = lcy + Math.sin(player.loopAngle) * lR - player.h / 2;

      // Suppress all other physics this frame
      player.onGround = false;
      player.vy = 0; player.vx = 0;

      // Exit: completed a full lap (angle gone past PI/2 - 2PI = -3PI/2)
      if (player.loopAngle <= Math.PI / 2 - Math.PI * 2) {
        player.onLoop = false;
        // Release onto ground going right, speed preserved as vx
        player.vx = -player.loopSpeed; // loopSpeed is negative, so vx is positive
        player.vy = 0;
        player.y = lcy + lR - player.h; // snap to bottom of loop
        player.onGround = true;
        player.homingAvail = CFG.homingChain;
        player.dashAvail = player.maxDashes;
        player.dir = 1;
      }
      return; // skip all normal physics while on loop
    } else {
      // ── Entry trigger ──
      // Player must be on the ground, moving right, past the loop entry X, fast enough
      const entryX = lcx - lR; // left side of loop at ground level
      const px = player.x + player.w / 2;
      const MIN_ENTRY_SPEED = 3.5;
      if (player.onGround && player.vx >= MIN_ENTRY_SPEED && px >= entryX && px < entryX + TILE * 2) {
        player.onLoop = true;
        player.loopAngle = Math.PI / 2; // start at bottom
        player.loopSpeed = -Math.hypot(player.vx, player.vy); // negative = counter-clockwise
      }
    }
  }

  // Reset wall bubble each frame — stays true only if collision fires this frame
  chaserWallBubble = false;
  // Remove chaser wall from solids once homing is unlocked
  if (CFG.homingChain > 0 && solids.some(s => s.type === 'chaserwall')) {
    for (let i = solids.length - 1; i >= 0; i--) {
      if (solids[i].type === 'chaserwall') solids.splice(i, 1);
    }
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
      if (s.key && s.type !== 'wall' && !blockHit[s.key] && rectsOverlap(pr, s)) {
        const sideHit = player.vy === 0 || Math.abs(player.vx) > Math.abs(player.vy) * 1.5;
        hitBlock(s, sideHit ? Math.sign(player.vx) : 0);
      }
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
      if (hitBox.x < s.x + s.w && hitBox.x + hitBox.w > s.x) {
        if (player.vx > 0) player.x = s.x - player.w;
        else if (player.vx < 0) player.x = s.x + s.w;
        player.vx = 0;
        if (s.type === 'chaserwall') chaserWallBubble = true;
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
      if (player.vy > 0) {
        player.y = s.y - player.h;
        player.vy = 0;
        if (!wasOnGround) {
          player.lastLandTime = now;
          spawnDust(player.x + player.w / 2, player.y + player.h);
          if (player.dashingDown) {
            // Ground slam
            screenShake = 18;
            player.vy = -7; // half-jump bounce
            player.dashingDown = false;
            if (player.ballForm) player.ballExitFlash = BALL_EXIT_FLASH;
            player.ballForm = false;
            player.dashFrames = 0;
            playSound('stomp', 0.8);
            // Kill all enemies within 3 tiles either side
            const slamX = player.x + player.w / 2;
            const slamRange = 3 * TILE;
            for (const g of [...goombas, ...flyers]) {
              if (g.dead) continue;
              const gx = g.x + g.w / 2;
              if (Math.abs(gx - slamX) <= slamRange) {
                if (damageEnemy(g, g.hp)) { comboCount++; comboTimer = 120; checkComboAchievements(); }
              }
            }
            // spawn extra dust/debris
            for (let i = 0; i < 3; i++) spawnDust(slamX + (i - 1) * TILE, player.y + player.h);
            // Break blocks within 3 tiles on either side at ground level
            for (const sol of [...solids]) {
              if (Math.abs((sol.x + sol.w / 2) - slamX) <= slamRange) hitBlock(sol);
            }
          } else {
            playSound('land', 0.3);
            player.spinning = false;
            if (player.ballForm) player.ballExitFlash = BALL_EXIT_FLASH;
            player.ballForm = false;
            player.dashingUp = false;
            player.dashFrames = 0;
            comboCount = 0; comboTimer = 0;
          }
        }
        player.dashingDown = false;
        player.slamFreezeTimer = 0;
        player.onGround = true;
        player.homingAvail = CFG.homingChain;
        player.dashAvail = player.maxDashes;
        player.slamUsed = false;
      } else if (player.vy < 0) {
        player.y = s.y + s.h;
        player.vy = 1;
        hitBlock(s);
      }
    }
  }


  // Pit death
  if (player.y > H + 200) {
    if (CFG.godMode) { player.y = (groundY - 1) * TILE - player.h; player.vy = 0; return; }
    killPlayer(); return;
  }

  // Coins
  const groundFloorY = (groundY - 1) * TILE;
  for (const coin of coins) {
    if (coin.collected) continue;
    coin.bobTimer += 0.05;
    // Block-spawned coins arc with physics until they settle
    if (coin.fromBlock) {
      coin.vy = (coin.vy || 0) + 0.45;
      coin.vx = (coin.vx || 0) * 0.94;
      coin.x += coin.vx;
      coin.y += coin.vy;
      const floatOffset = player.h; // hover at player foot level
      if (coin.y + TILE >= groundFloorY - floatOffset) {
        coin.y = groundFloorY - TILE - floatOffset;
        coin.vy *= -0.25; // tiny bounce
        if (Math.abs(coin.vy) < 0.5) { coin.vy = 0; coin.vx = 0; coin.fromBlock = false; }
      }
    }
    if (coin.fromBlock) continue; // not collectible until settled
    if (CFG.vortexRange > 0) {
      const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
      const ccx = coin.x + TILE / 2,       ccy = coin.y + TILE / 2;
      const dx = pcx - ccx, dy = pcy - ccy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.vortexRange && dist > 1) {
        const pull = Math.max(7.0 * (1 - dist / CFG.vortexRange), 3.5);
        coin.x += (dx / dist) * pull;
        coin.y += (dy / dist) * pull;
      }
    }
    if (rectsOverlap({ x: coin.x + 4, y: coin.y + 4, w: TILE - 8, h: TILE - 8 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      coin.collected = true; coinCount++; score += 200; updateHUD(); playSound('gem', 0.5);
      coinPopups.push({ x: coin.x + TILE / 2, y: coin.y, timer: 50 });
      if (typeof totalCoins !== 'undefined') {
        totalCoins++;
        if (totalCoins % 115 === 0) { totalTokens++; showAmuletBanner('token'); }
        saveAbilities();
      }
    }
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
    if (rectsOverlap({ x: h.x, y: h.y, w: 36, h: 36 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      h.collected = true;
      hp = MAX_HP; updateHPBar();
    }
  }




  // Med pack drops — fall to ground, walk into to pick up
  const groundFloorMed = (groundY - 1) * TILE;
  for (let i = medPackDrops.length - 1; i >= 0; i--) {
    const m = medPackDrops[i];
    if (m.collected) { medPackDrops.splice(i, 1); continue; }
    m.vy += 0.45;
    if (m.vy > 18) m.vy = 18;
    m.y += m.vy;
    if (m.y + 20 >= groundFloorMed) { m.y = groundFloorMed - 20; m.vy = 0; }
    m.bob = (m.bob || 0) + 0.06;
    if (rectsOverlap({ x: m.x, y: m.y, w: 20, h: 20 }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      m.collected = true;
      medPacks = Math.min(MAX_MED_PACKS, medPacks + 1);
      updateMedPackHUD();
    }
  }

  // Ground enemies + flyers — unified update
  const allEnemies = [...goombas, ...flyers];
  for (const g of allEnemies) {
    if (g.dead) {
      if (g.deadTimer > 0) { g.deadTimer--; if (g.lockFlash) g.lockFlash--; }
      else if (g.spawnX !== undefined) {
        const offscreen = g.spawnX < camera - W || g.spawnX > camera + W * 2;
        if (offscreen) {
          g.dead = false; g.deadTimer = 0; g.hitFlash = 0; g.lockFlash = 0;
          g.x = g.spawnX; g.y = g.spawnY; g.vx = g.spawnVx; g.vy = 0;
          g.pl = g.spawnPl; g.pr = g.spawnPr;
          g.hp = enemyMaxHp(g);
          g.shockStun = 0; g.frame = 0;
          if (g.flying) g.wobble = Math.random() * Math.PI * 2;
        }
      }
      continue;
    }
    if (g.lockFlash) g.lockFlash--;
    if (g.shockStun > 0) { g.shockStun--; continue; } // frozen during shockwave
    if (g.knockbackTimer > 0) {
      g.knockbackTimer--;
      g.vx *= 0.80;
      if (!g.flying) {
        g.vy = (g.vy || 0) + 0.6;
        g.y += g.vy;
        const floor = groundY * TILE - g.h;
        if (g.y >= floor) { g.y = floor; g.vy = 0; if (g.knockbackTimer > 7) g.knockbackTimer = 7; }
      }
      g.x += g.vx;
      if (g.knockbackTimer === 0) {
        g.x = Math.max(g.pl, Math.min(g.x, g.pr - g.w));
        g.vx = g.spawnVx * (g.lastDir || 1);
      }
    } else {
      // Normal patrol — reverse at bounds or pit edges
      if (!g.flying) {
        const nextX = g.x + g.vx;
        const edgeTile = Math.floor((g.vx > 0 ? nextX + g.w : nextX) / TILE);
        const onPit = LEVELS[currentLevel].gaps.some(gap => edgeTile >= gap.x && edgeTile < gap.x + gap.w);
        if (onPit) g.vx *= -1;
      }
      g.x += g.vx;
      if (g.x <= g.pl || g.x + g.w >= g.pr) g.vx *= -1;
      g.lastDir = g.vx < 0 ? -1 : 1;
    }
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
      // Shoot logic — flying bats only (ground shooters no longer fire)
      if (g.flying) {
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
            playSound('laser', 0.35);
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
        {
          if (damageEnemy(g, 1)) { comboCount++; comboTimer = 120; checkComboAchievements(); }
          player.vx = -player.dir * 10;
          player.vy = 0;
          player.dashFrames = 0;
          player.onGround = false;
          player.knockbackTimer = 18;
          player.invincible = Math.max(player.invincible, 12); player.invincibleNoFlash = true;
        }
      } else if (!g.hitFlash && (player.spinning || (player.vy > 0 && !player.homing && player.y + player.h < g.y + g.h / 2 + 10))) {
        const stompKilled = damageEnemy(g, g.hp);
        if (stompKilled) { comboCount++; comboTimer = 120; checkComboAchievements(); player.stompFlipTimer = 14; player.stompFlipAngle = 0; }
        player.invincible = Math.max(player.invincible, 12); player.invincibleNoFlash = true;
        player.vy = -6;
        player.onGround = false;
      } else if (player.homing) {
        // homing handled separately
      } else if (!player.homing && !player.ballForm && !player.dashFrames && !g.knockbackTimer && !g.hitFlash && player.invincible === 0) {
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


  updateShooterBats();
  updateChests();

  // Boss update
  updateBoss();
  updateWraith();
  updateWarden();
  updateRedBat();
  updateSnipers();
  updateChaser();

  // Flag — level complete on non-boss, non-tutorial levels
  if (!LEVELS[currentLevel].isBossLevel) {
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

function hitBlock(s, hitDir = 0) {
  if (!s.key || blockHit[s.key]) return;
  blockHit[s.key] = true;
  if (s.type === 'qblock') { score += 200; }
  else if (s.type === 'brick') score += 50;
  else if (s.type === 'hblock') {
    heartPickups.push({ x: s.x + TILE / 2 - 16, y: s.y, vy: -9, vx: 0, bobTimer: 0, collected: false });
  }
  updateHUD();
  spawnBlockDebris(s.x + s.w / 2, s.y + s.h / 2, s.type);
  playSound('crate', 0.6);
  // Spawn 1–3 gems from block
  const gemCount = 1 + Math.floor(Math.random() * 3);
  const gemDirs = [-5, -2, 2, 5];
  for (let gi = 0; gi < gemCount; gi++) {
    const dir = gemDirs[gi % gemDirs.length];
    const sideVx = hitDir !== 0
      ? hitDir * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2
      : dir + (Math.random() - 0.5);
    const sideVy = hitDir !== 0
      ? -(1 + Math.random() * 4)
      : -4 - Math.random() * 3;
    coins.push({ id: Date.now() + Math.random(),
      x: s.x + TILE / 2 - 8,
      y: s.y,
      collected: false, bobTimer: Math.random() * Math.PI * 2,
      vy: sideVy,
      vx: sideVx,
      fromBlock: true });
  }

  // Remove block entirely from solids array
  const idx = solids.indexOf(s);
  if (idx !== -1) solids.splice(idx, 1);

  // Every 10th block on level 2 drops a homing upgrade
  if (currentLevel === 2 && CFG.homingChain > 0) {
    blocksBroken++;
    if (blocksBroken % 10 === 0 && CFG.homingChain < 3) {
      powerBoxes.push({
        x: s.x, y: s.y - TILE,
        w: TILE, h: TILE,
        collected: false, bobTimer: 0, isHomingDrop: true,
      });
    }
  }
}

function hurtPlayer(dmg = 1) {
  if (CFG.godMode) return;
  hp -= dmg; updateHPBar();
  player.invincibleNoFlash = false;
}

function killPlayer() {
  if (dead) return;
  dead = true; player.dead = true; player.vy = -12; player.vx = 0;
  deathCount++;
  setTimeout(() => {
    document.getElementById('go-score').textContent = 'Score: ' + String(score).padStart(6, '0');
    document.getElementById('gameover').classList.add('show');
  }, 1200);
}

function doRestart() {
  document.getElementById('gameover').classList.remove('show');
  loadLevel(currentLevel, true);
  hp = MAX_HP;
  updateHPBar();
}

document.getElementById('go-restart').addEventListener('click', doRestart);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && dead) doRestart();
  if (e.key === 'Enter' && won && wonScreenTimer > 120) {
    loadLevel(currentLevel, false);
    hp = MAX_HP;
    updateHPBar();
  }
});


