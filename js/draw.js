// ── Drawing ───────────────────────────────────────────────────────────────────
// Persistent offscreen canvases for tint compositing (avoids per-frame alloc)
const _batTintCanvas    = document.createElement('canvas');
const _batTintCtx       = _batTintCanvas.getContext('2d');
const _baddieTintCanvas = document.createElement('canvas');
const _baddieTintCtx    = _baddieTintCanvas.getContext('2d');

function drawBatSprite(targetCtx, frame, dw, dh, dx, dy, tintColor) {
  const col = frame % BAT_COLS, row = Math.floor(frame / BAT_COLS);
  if (tintColor) {
    const color = tintColor === true ? '#cc1100' : tintColor;
    if (_batTintCanvas.width !== dw || _batTintCanvas.height !== dh) {
      _batTintCanvas.width = dw; _batTintCanvas.height = dh;
    }
    _batTintCtx.clearRect(0, 0, dw, dh);
    _batTintCtx.drawImage(batSheet, col * BAT_FW, row * BAT_FH, BAT_FW, BAT_FH, 0, 0, dw, dh);
    _batTintCtx.globalCompositeOperation = 'source-atop';
    _batTintCtx.globalAlpha = 0.35;
    _batTintCtx.fillStyle = color;
    _batTintCtx.fillRect(0, 0, dw, dh);
    _batTintCtx.globalCompositeOperation = 'source-over';
    _batTintCtx.globalAlpha = 1;
    targetCtx.drawImage(_batTintCanvas, dx, dy);
  } else {
    targetCtx.drawImage(batSheet, col * BAT_FW, row * BAT_FH, BAT_FW, BAT_FH, dx, dy, dw, dh);
  }
}
function drawBaddieSprite(targetCtx, frame, dw, dh, dx, dy, tint) {
  const col = frame % BADDIE_COLS, row = Math.floor(frame / BADDIE_COLS);
  if (tint) {
    if (_baddieTintCanvas.width !== dw || _baddieTintCanvas.height !== dh) {
      _baddieTintCanvas.width = dw; _baddieTintCanvas.height = dh;
    }
    _baddieTintCtx.clearRect(0, 0, dw, dh);
    _baddieTintCtx.drawImage(baddieSheet, col * BADDIE_FW, row * BADDIE_FH, BADDIE_FW, BADDIE_FH, 0, 0, dw, dh);
    _baddieTintCtx.globalCompositeOperation = 'source-atop';
    _baddieTintCtx.globalAlpha = 0.45;
    _baddieTintCtx.fillStyle = tint;
    _baddieTintCtx.fillRect(0, 0, dw, dh);
    _baddieTintCtx.globalCompositeOperation = 'source-over';
    _baddieTintCtx.globalAlpha = 1;
    targetCtx.drawImage(_baddieTintCanvas, dx, dy);
  } else {
    targetCtx.drawImage(baddieSheet, col * BADDIE_FW, row * BADDIE_FH, BADDIE_FW, BADDIE_FH, dx, dy, dw, dh);
  }
}

// cloud.jpg is 1200x864 — draw tiled instances scrolling at parallax speed
const CLOUD_W = 220, CLOUD_H = 120; // display size per cloud instance
const CLOUD_POSITIONS = [
  {ox:0, y:28}, {ox:380, y:14}, {ox:720, y:38},
];
function drawClouds(parallaxX, parallaxY) {
  if (!cloudImg.complete || !cloudImg.naturalWidth) return;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const c of CLOUD_POSITIONS) {
    // wrap horizontally across the full level so clouds are always on screen
    let cx2 = (c.ox - camera * parallaxX) % (W + CLOUD_W + 40);
    if (cx2 < -CLOUD_W) cx2 += W + CLOUD_W + 40;
    const cy2 = c.y + cameraY * parallaxY;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(cloudImg, cx2, cy2, CLOUD_W, CLOUD_H);
    // second tile to the right so there are no gaps when scrolling wraps
    ctx.drawImage(cloudImg, cx2 + W + CLOUD_W + 40, cy2, CLOUD_W, CLOUD_H);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBg() {
  const t = performance.now() / 1000;
  if (currentTheme === 'city') {
    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 397 + 50) % (LEVEL_W_TILES * TILE)) - camera * 0.04;
      const sy = 8 + (i * 137 % 200) + cameraY * 0.01;
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(t * 1.5 + i);
      ctx.fillStyle = i % 5 === 0 ? '#ffcc44' : i % 4 === 0 ? '#4488cc' : '#ffffff';
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;
    // Far buildings
    for (let i = 0; i < 40; i++) {
      const bx = (i * 220 + 30) - camera * 0.08;
      const bw = 30 + (i % 5) * 18, bh = 60 + (i % 7) * 30;
      const by = H * 0.88 + cameraY * 0.06 - bh;
      ctx.fillStyle = '#060d18'; ctx.fillRect(bx - bw/2, by, bw, bh);
      ctx.fillStyle = i % 3 === 0 ? '#ffcc66' : i % 2 === 0 ? '#4488cc' : '#aaaacc';
      for (let wy = 4; wy < bh - 4; wy += 8)
        for (let wx = 4; wx < bw - 4; wx += 7) {
          if ((i*7+wy*3+wx) % 4 !== 0) continue;
          ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 0.4 + i + wy);
          ctx.fillRect(bx - bw/2 + wx, by + wy, 3, 4);
        }
    }
    ctx.globalAlpha = 1;
    // Near buildings
    for (let i = 0; i < 25; i++) {
      const bx = (i * 340 + 80) - camera * 0.18;
      const bw = 40 + (i % 4) * 22, bh = 80 + (i % 6) * 35;
      const by = H * 0.9 + cameraY * 0.1 - bh;
      ctx.fillStyle = '#040c1a'; ctx.fillRect(bx - bw/2, by, bw, bh);
      ctx.fillStyle = '#4488cc'; ctx.globalAlpha = 0.7;
      ctx.fillRect(bx - 1, by - 10, 2, 10);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      ctx.fillStyle = '#ff4466';
      ctx.beginPath(); ctx.arc(bx, by - 10, 2, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#4488cc';
      ctx.fillRect(bx - bw/2, by, 1, bh); ctx.fillRect(bx + bw/2 - 1, by, 1, bh);
    }
    ctx.globalAlpha = 1;
    // Grid
    const gridY = groundY * TILE - cameraY;
    ctx.strokeStyle = 'rgba(80,140,220,0.06)'; ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) {
      ctx.globalAlpha = 0.04 + r * 0.015;
      ctx.beginPath(); ctx.moveTo(0, gridY + r*10); ctx.lineTo(W, gridY + r*10); ctx.stroke();
    }
    const vp = W / 2;
    for (let c = -20; c <= 20; c++) {
      ctx.globalAlpha = 0.04;
      const x0 = vp + c * 40 - (camera * 0.3) % 40;
      ctx.beginPath(); ctx.moveTo(x0, gridY - 20); ctx.lineTo(vp + c * 120, gridY + 60); ctx.stroke();
    }
    ctx.globalAlpha = 1;

  } else if (currentTheme === 'forest') {
    // Sun
    const sunX = W * 0.8 - camera * 0.01, sunY = 55 + cameraY * 0.01;
    const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 50);
    sg.addColorStop(0, '#ffff88'); sg.addColorStop(0.4, '#ffee44'); sg.addColorStop(1, 'rgba(255,220,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, 50, 0, Math.PI*2); ctx.fill();
    // Far hills
    for (let i = 0; i < 12; i++) {
      const hx = (i * 500 + 40) - camera * 0.1;
      const hy = H * 0.75 + cameraY * 0.08;
      const hw = 150 + (i%3)*60, hh = 70 + (i%4)*30;
      ctx.fillStyle = '#1a0a5c'; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(hx - hw, hy); ctx.quadraticCurveTo(hx, hy - hh, hx + hw, hy); ctx.fill();
    }
    // Mid hills
    for (let i = 0; i < 16; i++) {
      const hx = (i * 370 + 80) - camera * 0.2;
      const hy = H * 0.82 + cameraY * 0.12;
      const hw = 110 + (i%4)*40, hh = 50 + (i%3)*20;
      ctx.fillStyle = '#3a147a'; ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(hx - hw, hy); ctx.quadraticCurveTo(hx, hy - hh, hx + hw, hy); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Trees
    for (let i = 0; i < 28; i++) {
      const tx2 = (i * 310 + 60) - camera * 0.3;
      const ty2 = H * 0.85 + cameraY * 0.18;
      const th2 = 45 + (i%4)*20, tw = 16 + (i%3)*6;
      ctx.fillStyle = '#1e1060'; ctx.globalAlpha = 0.6;
      ctx.fillRect(tx2 - 2, ty2 - th2*0.4, 4, th2*0.4);
      ctx.beginPath(); ctx.ellipse(tx2, ty2 - th2*0.5, tw, th2*0.55, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2e2080'; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(tx2 - tw*0.2, ty2 - th2*0.65, tw*0.7, th2*0.4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawClouds(0.06, 0.03);

  } else if (currentTheme === 'happy') {
    // Big cheerful sun
    const sunX = W * 0.15 - camera * 0.005, sunY = 70 + cameraY * 0.01;
    const sg2 = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
    sg2.addColorStop(0, '#ffffff'); sg2.addColorStop(0.3, '#ffee44'); sg2.addColorStop(0.7, '#ffcc00'); sg2.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = sg2; ctx.beginPath(); ctx.arc(sunX, sunY, 60, 0, Math.PI*2); ctx.fill();
    // Sun rays
    ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
    for (let r = 0; r < 8; r++) {
      const ang = (r/8)*Math.PI*2 + t*0.3;
      ctx.beginPath(); ctx.moveTo(sunX + Math.cos(ang)*35, sunY + Math.sin(ang)*35);
      ctx.lineTo(sunX + Math.cos(ang)*55, sunY + Math.sin(ang)*55); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Rolling hills — bright green
    for (let i = 0; i < 14; i++) {
      const hx = (i*440+20) - camera*0.09;
      const hy = H*0.72 + cameraY*0.08;
      const hw = 180+(i%3)*70, hh = 90+(i%4)*35;
      ctx.fillStyle = i%2===0 ? '#dd8833' : '#ee9944'; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(hx-hw,hy); ctx.quadraticCurveTo(hx, hy-hh, hx+hw, hy); ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const hx = (i*310+70) - camera*0.2;
      const hy = H*0.8 + cameraY*0.12;
      const hw = 120+(i%4)*40, hh = 60+(i%3)*22;
      ctx.fillStyle = '#cc6611'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(hx-hw,hy); ctx.quadraticCurveTo(hx, hy-hh, hx+hw, hy); ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawClouds(0.07, 0.03);
    // Flowers near ground
    for (let i = 0; i < 40; i++) {
      const fx = (i*230+50) - camera*0.28;
      const fy = groundY*TILE - cameraY - 4;
      ctx.fillStyle = i%3===0?'#ff6644':i%2===0?'#ff88cc':'#ffcc00';
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  } else if (currentTheme === 'ice') {
    // Stars through ice cave ceiling
    for (let i = 0; i < 50; i++) {
      const sx = ((i*431+60) % (LEVEL_W_TILES*TILE)) - camera*0.03;
      const sy = 6+(i*97%140) + cameraY*0.01;
      ctx.globalAlpha = 0.2+0.15*Math.sin(t*1.2+i);
      ctx.fillStyle = '#cceeff'; ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;
    // Distant ice stalactites / stalagmites
    for (let i = 0; i < 35; i++) {
      const ix = (i*290+30) - camera*0.1;
      const ih = 30+(i%5)*25, iw = 8+(i%4)*5;
      ctx.fillStyle = '#446688'; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(ix-iw,0); ctx.lineTo(ix,ih); ctx.lineTo(ix+iw,0); ctx.fill();
    }
    // Mid icicles
    for (let i = 0; i < 22; i++) {
      const ix = (i*410+80) - camera*0.2;
      const ih = 45+(i%4)*30, iw = 10+(i%3)*6;
      ctx.fillStyle = '#6898c8'; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(ix-iw,0); ctx.lineTo(ix,ih); ctx.lineTo(ix+iw,0); ctx.fill();
      ctx.fillStyle = '#aaddff'; ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.moveTo(ix-iw*0.4,0); ctx.lineTo(ix-iw*0.2,ih*0.7); ctx.lineTo(ix,0); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Aurora shimmer bands
    for (let i = 0; i < 4; i++) {
      const ay = 60+i*30 + cameraY*0.05;
      const ax = -camera*0.06 + i*80;
      ctx.globalAlpha = 0.04+0.03*Math.sin(t*0.5+i*1.3);
      ctx.fillStyle = i%2===0?'#88ddff':'#aaddff';
      ctx.beginPath(); ctx.ellipse(W/2+ax, ay, W*0.7, 18+i*8, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

  } else if (currentTheme === 'woods') {
    // Sun
    const sunX = W * 0.82 - camera * 0.003;
    const sunY = 52 + cameraY * 0.005;
    for (let r = 80; r > 0; r -= 16) {
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#fff176';
      ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff9aa';
    ctx.beginPath(); ctx.arc(sunX - 7, sunY - 7, 14, 0, Math.PI*2); ctx.fill();

    drawClouds(0.12, 0.04);

    // Far round trees (light green, distant)
    for (let i = 0; i < 18; i++) {
      const tx2 = (i * 580 + 120) - camera * 0.07;
      const baseY = H * 0.80 + cameraY * 0.09;
      const r = 34 + (i%4)*12;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#88cc44';
      ctx.fillRect(tx2 - 5, baseY - r * 0.9, 10, r * 0.9);
      ctx.fillStyle = '#99dd55';
      ctx.beginPath(); ctx.arc(tx2, baseY - r * 0.9, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#bbee77';
      ctx.beginPath(); ctx.arc(tx2 - r*0.2, baseY - r * 1.1, r * 0.55, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Near round trees (bright Kirby greens)
    for (let i = 0; i < 26; i++) {
      const tx2 = (i * 390 + 40) - camera * 0.18;
      const baseY = H * 0.86 + cameraY * 0.14;
      const r = 28 + (i%5)*10;
      // trunk
      ctx.fillStyle = '#8b5c2a';
      ctx.fillRect(tx2 - 5, baseY - r * 0.7, 10, r * 0.7);
      // main canopy
      ctx.fillStyle = i%3===0 ? '#44cc22' : i%3===1 ? '#55dd33' : '#33bb11';
      ctx.beginPath(); ctx.arc(tx2, baseY - r * 0.75, r, 0, Math.PI*2); ctx.fill();
      // highlight blob
      ctx.fillStyle = '#88ee55';
      ctx.beginPath(); ctx.arc(tx2 - r*0.25, baseY - r * 1.0, r * 0.5, 0, Math.PI*2); ctx.fill();
      // tiny highlight dot
      ctx.fillStyle = '#ccff99';
      ctx.beginPath(); ctx.arc(tx2 - r*0.3, baseY - r * 1.1, r * 0.18, 0, Math.PI*2); ctx.fill();
    }

    // Flowers along the ground horizon
    for (let i = 0; i < 40; i++) {
      const fx = (i * 310 + 55) - camera * 0.35;
      const fy = H * 0.91 + cameraY * 0.18 - 6;
      const fc = ['#ff88cc','#ffcc44','#ff6688','#ff99dd','#ffee66'][i%5];
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#55cc22';
      ctx.fillRect(fx - 1, fy, 2, 10);
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff9cc';
      ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawGround() {
  const lv = LEVELS[currentLevel];
  const groundEnd = lv.groundEnd != null ? lv.groundEnd : LEVEL_W_TILES;
  for (let tx = 0; tx < groundEnd; tx++) {
    if (groundInGap(tx)) continue;
    const sx = tx * TILE - camera;
    if (sx < -TILE || sx > W + TILE) continue;
    for (let ty = groundY; ty <= groundY + 2; ty++) drawGroundTile(sx, ty * TILE, ty === groundY);
    if (showTileNumbers && tx % 10 === 0) {
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(tx, sx + TILE / 2, groundY * TILE - 3);
      ctx.restore();
    }
  }
}
let showTileNumbers = true;

function drawGroundTile(sx, sy, isTop) {
  const t = performance.now() / 2000;
  const th = THEMES[currentTheme];
  ctx.fillStyle = isTop ? th.ground : th.groundSub;
  ctx.fillRect(sx, sy, TILE, TILE);
  if (isTop) {
    ctx.fillStyle = th.groundEdge;
    ctx.globalAlpha = 1; ctx.fillRect(sx, sy, TILE, 2);
    ctx.globalAlpha = 0.2; ctx.fillRect(sx, sy + 2, TILE, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.groundTrace;
    ctx.fillRect(sx + 4, sy + 8, TILE - 8, 1);
    ctx.fillRect(sx + TILE/2, sy + 8, 1, 10);
    const tx = Math.floor(sx / TILE + camera / TILE);
    if ((tx * 7 + 3) % 9 === 0) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t + tx);
      ctx.fillStyle = th.groundNode;
      ctx.beginPath(); ctx.arc(sx + TILE/2, sy + 14, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = th.groundTrace;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(sx, sy, 1, TILE);
    ctx.fillRect(sx, sy + TILE/2, TILE, 1);
    ctx.globalAlpha = 1;
  }
}

function drawLoopLevel() {
  const lv = LEVELS[currentLevel];
  if (!lv.isLoopLevel) return;
  const cx = lv.loopCenterTX * TILE - camera;
  const cy = lv.loopCenterTY * TILE;
  const R = lv.loopRadiusTiles * TILE;
  const th = THEMES[currentTheme];
  // Outer ring fill (track body)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + TILE, 0, Math.PI * 2);
  ctx.arc(cx, cy, R - TILE * 0.5, 0, Math.PI * 2, true);
  ctx.fillStyle = th.brick;
  ctx.fill();
  // Inner ring edge highlight
  ctx.strokeStyle = th.brickEdge;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, R + TILE, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - TILE * 0.5, 0, Math.PI * 2); ctx.stroke();
  // Cross-lines to give tiled feel
  ctx.strokeStyle = th.brickCross;
  ctx.lineWidth = 1;
  const segs = 24;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (R - TILE * 0.5), cy + Math.sin(a) * (R - TILE * 0.5));
    ctx.lineTo(cx + Math.cos(a) * (R + TILE), cy + Math.sin(a) * (R + TILE));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatforms() {
  const lv = LEVELS[currentLevel];
  if (lv.isLoopLevel) {
    drawLoopLevel();
    return;
  }
  for (const p of lv.platforms) {
    for (let i = 0; i < p.w; i++) {
      const tx = p.x + i, sx = tx * TILE - camera;
      if (sx < -TILE || sx > W + TILE) continue;
      const key = `${tx}_${p.y}`;
      if (blockHit[key]) continue;
      drawBlock(sx, p.y * TILE, p.t);
    }
  }
  // Chaser wall
  if (lv.hasChaserEncounter) {
    const wallScreenX = lv.chaserTriggerX - TILE - camera;
    if (wallScreenX > -TILE && wallScreenX < W + TILE) {
      drawChaserWall(wallScreenX);
    }
  }
}

function drawChaserWall(sx) {
  const t = performance.now() / 800;
  const wallH = groundY * TILE; // full height from y=0 to ground

  // Animated energy wall — dark with purple/pink shimmer
  ctx.save();

  // Base fill
  const wg = ctx.createLinearGradient(sx, 0, sx + TILE, 0);
  wg.addColorStop(0,   'rgba(10,0,30,0.92)');
  wg.addColorStop(0.4, 'rgba(80,0,120,0.85)');
  wg.addColorStop(0.6, 'rgba(80,0,120,0.85)');
  wg.addColorStop(1,   'rgba(10,0,30,0.92)');
  ctx.fillStyle = wg;
  ctx.fillRect(sx, 0, TILE, wallH);

  // Animated energy scanlines
  const lineCount = 16;
  for (let i = 0; i < lineCount; i++) {
    const yf = ((i / lineCount) + t * 0.18) % 1;
    const ly = yf * wallH;
    const alpha = 0.15 + 0.12 * Math.sin(t * 3 + i);
    ctx.fillStyle = `rgba(200,80,255,${alpha})`;
    ctx.fillRect(sx + 2, ly, TILE - 4, 2);
  }

  // Glowing edges
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
  ctx.strokeStyle = `rgba(${180 + pulse*60|0},60,255,${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(160,40,255,0.8)'; ctx.shadowBlur = 12 + pulse * 8;
  ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, wallH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + TILE, 0); ctx.lineTo(sx + TILE, wallH); ctx.stroke();
  ctx.shadowBlur = 0;

  // Bright center energy line
  ctx.fillStyle = `rgba(240,160,255,${0.3 + pulse * 0.2})`;
  ctx.fillRect(sx + TILE/2 - 1, 0, 2, wallH);

  ctx.restore();

  // Speech bubble if player is touching and doesn't have homing
  if (chaserWallBubble && CFG.homingChain === 0) {
    const bx = sx - 180, by = groundY * TILE - 120;
    const bw = 210, bh = 60, br = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(10,2,20,0.93)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, br); ctx.fill();
    ctx.strokeStyle = `rgba(200,80,255,${0.7 + 0.3 * Math.sin(t*2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, br); ctx.stroke();
    // Tail pointing right toward wall
    const tailX = bx + bw, tailY = by + bh * 0.7;
    ctx.fillStyle = 'rgba(10,2,20,0.93)';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY - 8);
    ctx.lineTo(tailX + 14, tailY);
    ctx.lineTo(tailX, tailY + 8);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,80,255,${0.7 + 0.3 * Math.sin(t*2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY - 8);
    ctx.lineTo(tailX + 14, tailY);
    ctx.lineTo(tailX, tailY + 8);
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#e880ff';
    ctx.fillText('Unlock  HOMING ATTACK', bx + bw/2, by + bh/2 - 8);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(220,160,255,0.7)';
    ctx.fillText('to continue past here', bx + bw/2, by + bh/2 + 10);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
}


function drawBlock(sx, sy, type) {
  const th = THEMES[currentTheme];
  if (type === 'brick') {
    ctx.fillStyle = th.brick; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = th.brickInner; ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4);
    ctx.fillStyle = th.brickEdge;
    ctx.fillRect(sx, sy, TILE, 2); ctx.fillRect(sx, sy+TILE-2, TILE, 2);
    ctx.fillRect(sx, sy, 2, TILE); ctx.fillRect(sx+TILE-2, sy, 2, TILE);
    ctx.fillStyle = th.brickCross;
    ctx.fillRect(sx+4, sy+TILE/2, TILE-8, 1); ctx.fillRect(sx+TILE/2, sy+4, 1, TILE-8);
  } else if (type === 'qblock') {
    const t = performance.now() / 600;
    ctx.fillStyle = th.qOuter; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = th.qInner; ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4);
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t);
    ctx.fillStyle = th.qGlow; ctx.fillRect(sx+7, sy+7, TILE-14, TILE-14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.qBorder;
    ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy+TILE-1, TILE, 1);
    ctx.fillRect(sx, sy, 1, TILE); ctx.fillRect(sx+TILE-1, sy, 1, TILE);
    ctx.fillStyle = th.qHi; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.globalAlpha = 0.9; ctx.fillText(th.qChar, sx+TILE/2, sy+TILE-8); ctx.globalAlpha = 1;
  } else if (type === 'hblock') {
    const t = performance.now() / 500;
    ctx.fillStyle = th.hpBlock; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = th.hpBlockInner; ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4);
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t);
    ctx.fillStyle = th.hpGlow; ctx.fillRect(sx+6, sy+6, TILE-12, TILE-12);
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.hpText; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText('+', sx+TILE/2, sy+TILE-8);
  } else {
    ctx.fillStyle = th.groundSub; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = th.ground; ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4);
    ctx.fillStyle = th.groundTrace; ctx.globalAlpha = 0.4;
    ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy, 1, TILE);
    ctx.globalAlpha = 1;
  }
}

function drawPipes() {
  for (const pipe of LEVELS[currentLevel].pipes) {
    const sx = pipe.x * TILE - camera;
    if (sx < -64 || sx > W + 64) continue;
    for (let j = 0; j < pipe.h; j++) {
      const ty = groundY - j;
      if (blockHit[`pipe_${pipe.x}_${ty}`]) continue;
      drawPipeTile(sx, ty * TILE, j === 0);
    }
  }
}

function drawPipeTile(sx, sy, isTop) {
  const pw = TILE * 2;
  const t = performance.now() / 1200;
  const th = THEMES[currentTheme];
  ctx.fillStyle = th.pipe; ctx.fillRect(sx, sy, pw, TILE);
  ctx.fillStyle = th.pipeRail; ctx.globalAlpha = 0.9;
  ctx.fillRect(sx+3, sy, 3, TILE); ctx.fillRect(sx+pw-6, sy, 3, TILE);
  ctx.globalAlpha = 0.12; ctx.fillStyle = th.pipeCap;
  ctx.fillRect(sx+6, sy, pw-12, TILE); ctx.globalAlpha = 1;
  const flowOffset = (performance.now() / 80) % TILE;
  ctx.fillStyle = th.pipeFlow; ctx.globalAlpha = 0.35;
  ctx.fillRect(sx+pw/2-1, sy+(flowOffset%TILE), 2, 4);
  ctx.fillRect(sx+pw/2-1, sy+((flowOffset+TILE/2)%TILE), 2, 4);
  ctx.globalAlpha = 1;
  if (isTop) {
    ctx.fillStyle = th.pipeCap; ctx.fillRect(sx-4, sy, pw+8, 6);
    ctx.fillStyle = th.pipeCapDk; ctx.fillRect(sx-2, sy+6, pw+4, 6);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 2.5);
    ctx.fillStyle = th.pipeCore;
    ctx.beginPath(); ctx.arc(sx+pw/2, sy+3, 4, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawCoins() {
  const t = performance.now() / 400;
  for (const coin of coins) {
    if (coin.collected) continue;
    const sx = coin.x + TILE/2 - camera;
    if (sx < -TILE || sx > W + TILE) continue;
    const sy = coin.y + TILE/2 + Math.sin(coin.bobTimer) * 3;
    const spin = (performance.now() / 600 + coin.id) % (Math.PI * 2);
    const th = THEMES[currentTheme];
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t + coin.id);
    ctx.fillStyle = th.orb;
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(spin);
    ctx.fillStyle = th.orb;
    ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(5,0); ctx.lineTo(0,6); ctx.lineTo(-5,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.orbHi;
    ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(2.5,0); ctx.lineTo(0,3); ctx.lineTo(-2.5,0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawCoinPopups() {
  for (let i = coinPopups.length - 1; i >= 0; i--) {
    const p = coinPopups[i];
    p.timer--;
    if (p.timer <= 0) { coinPopups.splice(i, 1); continue; }
    const sx = p.x - camera;
    const progress = 1 - p.timer / 50;
    const sy = p.y - progress * 28; // float upward
    const alpha = p.timer < 15 ? p.timer / 15 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    // little gem icon + +1
    const scale = 1 + (1 - progress) * 0.4;
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    // glow
    ctx.shadowColor = '#ffd84a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffe566';
    ctx.fillText('✦ +1', 0, 0);
    ctx.restore();
  }
}

function drawHeartPickups() {
  for (const h of heartPickups) {
    if (h.collected) continue;
    const sx = h.x - camera;
    if (sx < -40 || sx > W + 40) continue;
    const bob = Math.sin(h.bobTimer) * 3;
    const sy = h.y + bob;
    const pulse = 1 + 0.15 * Math.sin(h.bobTimer * 2.5);
    ctx.save();
    ctx.translate(sx + 16, sy + 16);
    ctx.scale(pulse * 2.8, pulse * 2.8);
    // golden outer glow (full heal indicator)
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-11, -4, -11, -11, 0, -7);
    ctx.bezierCurveTo(11, -11, 11, -4, 0, 5);
    ctx.fill();
    // red heart on top
    ctx.shadowColor = '#ff2255';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff3355';
    ctx.scale(0.78, 0.78);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-11, -4, -11, -11, 0, -7);
    ctx.bezierCurveTo(11, -11, 11, -4, 0, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    // shine
    ctx.fillStyle = '#ff88aa';
    ctx.beginPath();
    ctx.ellipse(-3, -5, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMedPackDrops() {
  for (const m of medPackDrops) {
    if (m.collected) continue;
    const sx = m.x - camera;
    if (sx < -40 || sx > W + 40) continue;
    const bob = Math.sin(m.bob || 0) * 3;
    ctx.save();
    ctx.translate(sx + 10, m.y + 10 + bob);
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 10;
    // small cross / medkit icon
    ctx.fillStyle = '#00cc88';
    ctx.fillRect(-7, -2, 14, 4);
    ctx.fillRect(-2, -7, 4, 14);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

let amuletBanner = null; // { text, timer }

function showAmuletBanner(abilityId) {
  const labels = { token: 'SKILL TOKEN EARNED', home1: 'HOMING UNLOCKED', home2: '2-KILL CHAIN', home3: '3-KILL CHAIN', dash2: '2 DASHES', dash3: '3 DASHES', stomp: 'DOWN POUND' };
  amuletBanner = { text: labels[abilityId] || 'ABILITY UNLOCKED', timer: 220 };
}

function drawAmulets() {
  if (!levelAmulets) return;
  const t = performance.now() / 1000;
  for (const a of levelAmulets) {
    if (a.collected) continue;
    const sx = a.x - camera;
    if (sx < -60 || sx > W + 60) continue;
    const bob = Math.sin(a.bobTimer * 2) * 4;
    const sy = a.y + bob;
    const r = 14 + Math.sin(t * 3) * 1.5;
    ctx.save();
    // Outer glow
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
    glow.addColorStop(0, 'rgba(180,60,255,0.55)');
    glow.addColorStop(0.5, 'rgba(120,0,200,0.25)');
    glow.addColorStop(1, 'rgba(80,0,160,0)');
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    // Core gem
    const gem = ctx.createRadialGradient(sx - r*0.3, sy - r*0.3, 0, sx, sy, r);
    gem.addColorStop(0, '#e8aaff');
    gem.addColorStop(0.4, '#9b30d0');
    gem.addColorStop(1, '#4a006e');
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = gem;
    ctx.fill();
    // Shimmer
    ctx.beginPath();
    ctx.arc(sx - r*0.35, sy - r*0.35, r*0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
    ctx.restore();
  }

}

function drawTokenBanner() {
  if (!amuletBanner || amuletBanner.timer <= 0) return;
  amuletBanner.timer--;
  const progress = amuletBanner.timer / 220;
  const alpha = Math.min(1, amuletBanner.timer / 30);
  // slide in from top
  const slideY = progress > 0.9 ? (1 - (progress - 0.9) / 0.1) * -60 : 0;
  ctx.save();
  ctx.scale(DPR, DPR);
  ctx.globalAlpha = alpha;
  ctx.translate(0, slideY);
  // Big background bar
  const barH = 80;
  const barY = H / 2 - 90;
  ctx.fillStyle = 'rgba(30,0,50,0.82)';
  ctx.fillRect(0, barY, W, barH);
  ctx.strokeStyle = 'rgba(180,80,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, barY, W, barH);
  // Main text
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px "Courier New", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#cc00ff';
  ctx.shadowBlur = 24;
  ctx.fillText('NEW SKILL AVAILABLE!', W / 2, barY + 38);
  // Sub text
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillStyle = '#cc88ff';
  ctx.shadowBlur = 10;
  ctx.fillText('PRESS TAB TO BUY NEW SKILLS', W / 2, barY + 62);
  ctx.restore();
  if (amuletBanner.timer <= 0) amuletBanner = null;
}

function drawPowerBoxes() {
  for (const pb of powerBoxes) {
    if (pb.collected) continue;
    const sx = pb.x - camera;
    if (sx < -40 || sx > W + 40) continue;
    const bob = Math.sin(pb.bobTimer) * 3;
    const sy = pb.y + bob;
    const t = pb.bobTimer;
    // Glowing crate
    const glow = Math.abs(Math.sin(t * 1.5));
    ctx.save();
    // Outer glow
    ctx.shadowColor = `rgba(80,220,255,${0.4 + glow * 0.5})`;
    ctx.shadowBlur = 12 + glow * 10;
    // Box body
    ctx.fillStyle = '#0a2a40';
    ctx.strokeStyle = `rgba(80,220,255,${0.7 + glow * 0.3})`;
    ctx.lineWidth = 2;
    ctx.fillRect(sx, sy, pb.w, pb.h);
    ctx.strokeRect(sx, sy, pb.w, pb.h);
    // Inner cross lines
    ctx.strokeStyle = `rgba(80,220,255,${0.4 + glow * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + pb.w / 2, sy + 4);
    ctx.lineTo(sx + pb.w / 2, sy + pb.h - 4);
    ctx.moveTo(sx + 4, sy + pb.h / 2);
    ctx.lineTo(sx + pb.w - 4, sy + pb.h / 2);
    ctx.stroke();
    // "F" letter
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(80,220,255,${0.8 + glow * 0.2})`;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', sx + pb.w / 2, sy + pb.h / 2);
    ctx.restore();
  }
}

function drawLockOn(g) {
  const sx = g.x + g.w / 2 - camera;
  const sy = g.y + g.h / 2;
  const t = performance.now() / 150;
  const r = g.w * 0.8 + Math.sin(t) * 4;
  ctx.save();
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  // Corner brackets
  const hs = r * 0.5;
  for (const [ox, oy, sx2, sy2] of [[-r,-r,1,0],[-r,-r,0,1],[r,-r,-1,0],[r,-r,0,1],[-r,r,1,0],[-r,r,0,-1],[r,r,-1,0],[r,r,0,-1]]) {
    ctx.beginPath();
    ctx.moveTo(sx + ox, sy + oy);
    ctx.lineTo(sx + ox + sx2 * hs, sy + oy + sy2 * hs);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEnemy(g) {
  const sx = g.x - camera;
  if (sx < -TILE * 2 || sx > W + TILE * 2) return;
  if (player.homingTarget === g || g.lockFlash > 0) drawLockOn(g);
  const cx = sx + g.w / 2, cy = g.y + g.h / 2;
  const t = performance.now() / 400;
  // Hit flash overlay
  const es = CFG.enemySize;
  const er = es / 2;
  if (g.hitFlash > 0 && Math.floor(g.hitFlash / 3) % 2 === 0) {
    if (g.flying) {
      const batFrame2 = Math.floor((performance.now() / 1000 * 24 + g.id * 7)) % BAT_FRAMES;
      const scale = g.red ? 1.5 : 1;
      const dw = Math.round(TILE * CFG.batScale * scale), dh = Math.round(dw * BAT_FH / BAT_FW);
      const col2 = batFrame2 % BAT_COLS, row2 = Math.floor(batFrame2 / BAT_COLS);
      if (_batTintCanvas.width !== dw || _batTintCanvas.height !== dh) {
        _batTintCanvas.width = dw; _batTintCanvas.height = dh;
      }
      _batTintCtx.clearRect(0, 0, dw, dh);
      _batTintCtx.drawImage(batSheet, col2 * BAT_FW, row2 * BAT_FH, BAT_FW, BAT_FH, 0, 0, dw, dh);
      _batTintCtx.globalCompositeOperation = 'source-atop';
      _batTintCtx.globalAlpha = 0.8;
      _batTintCtx.fillStyle = '#ff6600';
      _batTintCtx.fillRect(0, 0, dw, dh);
      _batTintCtx.globalCompositeOperation = 'source-over';
      _batTintCtx.globalAlpha = 1;
      ctx.drawImage(_batTintCanvas, cx - dw/2, cy - dh/2);
    } else {
      const bFrame2 = Math.floor((performance.now() / 1000 * 24 + g.id * 7)) % BADDIE_FRAMES;
      const dw = Math.round(TILE * CFG.gnomeScale), dh = Math.round(dw * BADDIE_FH / BADDIE_FW);
      drawBaddieSprite(ctx, bFrame2, dw, dh, cx - dw / 2, g.y + g.h - dh + CFG.spriteOffset, '#ff6600');
    }
    return;
  }

  // Shocker ring aura
  if (g.type === 'shocker') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + g.id);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * pulse;
    ctx.strokeStyle = '#ffee44';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, er + 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.15 + 0.1 * pulse;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath(); ctx.arc(cx, cy, er + 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (g.flying) {
    const isRedBat = g.red;
    const scale = isRedBat ? 1.5 : 1;
    const batFrame = Math.floor((performance.now() / 1000 * 24 + g.id * 7)) % BAT_FRAMES;
    const dw = Math.round(TILE * CFG.batScale * scale);
    const dh = Math.round(dw * (BAT_FH / BAT_FW));
    drawBatSprite(ctx, batFrame, dw, dh, cx - dw / 2, cy - dh / 2, false);
  } else {
    // Ground goomba — sprite from baddie.mov sheet
    const baddieFrame = Math.floor((performance.now() / 1000 * 24 + g.id * 7)) % BADDIE_FRAMES;
    const dw = Math.round(TILE * CFG.gnomeScale);
    const dh = Math.round(dw * BADDIE_FH / BADDIE_FW);
    const dx = cx - dw / 2, dy = g.y + g.h - dh + CFG.spriteOffset;
    const shooterTint = g.type === 'shooter' ? '#6688cc' : null;
    ctx.save();
    const facingLeft = (g.lastDir ?? -1) < 0;
    if (facingLeft) {
      ctx.translate(dx + dw, 0);
      ctx.scale(-1, 1);
      drawBaddieSprite(ctx, baddieFrame, dw, dh, 0, dy, shooterTint);
    } else {
      drawBaddieSprite(ctx, baddieFrame, dw, dh, dx, dy, shooterTint);
    }
    ctx.restore();
  }
}

function drawGoombas() {
  for (const g of [...goombas, ...flyers]) {
    if (g.dead) {
      if (g.deadTimer > 0) {
        const sx = g.x + g.w/2 - camera;
        ctx.globalAlpha = g.deadTimer / 40;
        ctx.fillStyle = g.flying ? '#2a2018' : '#cc3a7a';
        ctx.beginPath(); ctx.arc(sx, g.y + g.h/2, 8, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    drawEnemy(g);
  }
}

function drawFlagPole() {
  if (LEVELS[currentLevel]?.isTestLevel || currentLevel === 1) return;
  const sx = FLAG_X * TILE - camera;
  const t = performance.now() / 500;
  // Beacon pillar
  ctx.fillStyle = '#2a2040'; ctx.fillRect(sx + TILE/2 - 4, 40, 8, groundY * TILE - 40);
  ctx.fillStyle = '#4a3a70'; ctx.fillRect(sx + TILE/2 - 2, 40, 4, groundY * TILE - 40);
  // Pulsing orb at top
  for (let r = 24; r > 0; r -= 6) {
    ctx.globalAlpha = (0.08 + 0.06 * Math.sin(t)) * (24 - r) / 24;
    ctx.fillStyle = COLORS.crystalGlow;
    ctx.beginPath(); ctx.arc(sx + TILE/2, 40, r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.crystalGlow;
  ctx.beginPath(); ctx.arc(sx + TILE/2, 40, 8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx + TILE/2 - 2, 37, 3, 0, Math.PI*2); ctx.fill();
  // Energy rings rising
  for (let i = 0; i < 3; i++) {
    const ry = 40 + ((t * 60 + i * 40) % 180);
    ctx.globalAlpha = 1 - ry / 200;
    ctx.strokeStyle = COLORS.crystalGlow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sx + TILE/2, ry, 12, 4, 0, 0, Math.PI*2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  // Flicker every 4 frames while invincible from damage (not from homing hit)
  if (player.invincible > 0 && !player.invincibleNoFlash && Math.floor(player.invincible / 4) % 2 === 0) return;
  const sx = player.x - camera;

  ctx.save();
  const footOffset = CFG.spriteOffset;

  if ((player.homing || player.dashFrames > 0 || player.ballForm) && walkSheet.complete && walkSheet.naturalWidth > 0) {
    const bx = sx + player.w / 2;
    const by = player.y + player.h / 2;
    const now = performance.now();

    const bd = CFG.ballSize * 1.3;

    if (player.dashFrames > 0) {
      fbTick++;
      if (fbTick >= FB_SPEED) { fbTick = 0; fbFrame = (fbFrame + 1) % FB_FRAMES; }
      const dashAngle = player.dashAngle || 0;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.04);
      const auraLen = bd * (1.0 + pulse * 0.2);

      // plasma trail opposite to velocity
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(dashAngle + Math.PI);
      const aura = ctx.createLinearGradient(0, 0, auraLen, 0);
      aura.addColorStop(0,    `rgba(255,255,255,${0.95 + pulse * 0.05})`);
      aura.addColorStop(0.15, `rgba(180,240,255,${0.85 + pulse * 0.1})`);
      aura.addColorStop(0.5,  'rgba(80,180,255,0.5)');
      aura.addColorStop(1,    'rgba(40,120,255,0)');
      ctx.lineWidth = bd * 0.6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = aura;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(auraLen, 0); ctx.stroke();
      const core = ctx.createLinearGradient(0, 0, auraLen * 0.5, 0);
      core.addColorStop(0,   'rgba(255,255,255,1.0)');
      core.addColorStop(0.4, 'rgba(220,240,255,0.8)');
      core.addColorStop(1,   'rgba(180,220,255,0)');
      ctx.lineWidth = bd * 0.3;
      ctx.strokeStyle = core;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(auraLen * 0.5, 0); ctx.stroke();
      ctx.restore();

      // sprite — gradient white (transparent at head, white at tail), vibrates, rotated to dash direction
      {
        const angle = player.dashAngle || 0;
        const isVertical = Math.abs(Math.sin(angle)) > 0.7;
        const vibrate = Math.floor(performance.now() / 80) % 2 === 0 ? -2 : 2;
        ctx.save();
        ctx.translate(bx, by + vibrate - 10);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        if (isVertical && diveImg.complete && diveImg.naturalWidth > 0) {
          const diveAngle = angle > 0 ? Math.PI : 0;
          const diveMult = angle > 0 ? CFG.diveScale : CFG.diveScale * 0.65;
          const dW = Math.round(player.h * 2 * (WALK_FW / WALK_FH) * diveMult);
          const dH = Math.round(dW * (918 / 546));
          ctx.rotate(diveAngle);
          ctx.drawImage(diveImg, -dW / 2, -dH / 2, dW, dH);
          // white overlay fading from head (top, transparent) to tail (bottom, opaque)
          const oc = document.createElement('canvas'); oc.width = dW; oc.height = dH;
          const ox = oc.getContext('2d');
          ox.filter = 'brightness(10) saturate(0)';
          ox.drawImage(diveImg, 0, 0, dW, dH);
          ox.filter = 'none';
          ox.globalCompositeOperation = 'destination-in';
          const g = ox.createLinearGradient(0, 0, 0, dH);
          g.addColorStop(0.0, 'rgba(0,0,0,0)');
          g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
          g.addColorStop(1.0, 'rgba(0,0,0,1)');
          ox.fillStyle = g; ox.fillRect(0, 0, dW, dH);
          ctx.drawImage(oc, -dW / 2, -dH / 2);
        } else if (dashImg.complete && dashImg.naturalWidth > 0) {
          const flipX = Math.cos(angle) < -0.001 ? -1 : 1;
          const drawAngle = flipX === -1 ? -(Math.PI + angle) : angle;
          const dW = Math.round(player.h * 2 * (WALK_FW / WALK_FH) * 1.284);
          const dH = Math.round(dW * (371 / 779));
          ctx.scale(flipX, 1);
          ctx.rotate(drawAngle);
          ctx.drawImage(dashImg, -dW / 2, -dH / 2, dW, dH);
          // white overlay: head is on right side of dashImg, tail on left → gradient right→left
          const oc = document.createElement('canvas'); oc.width = dW; oc.height = dH;
          const ox = oc.getContext('2d');
          ox.filter = 'brightness(10) saturate(0)';
          ox.drawImage(dashImg, 0, 0, dW, dH);
          ox.filter = 'none';
          ox.globalCompositeOperation = 'destination-in';
          const g = ox.createLinearGradient(dW, 0, 0, 0);
          g.addColorStop(0.0, 'rgba(0,0,0,0)');
          g.addColorStop(0.45, 'rgba(0,0,0,0.5)');
          g.addColorStop(1.0, 'rgba(0,0,0,1)');
          ox.fillStyle = g; ox.fillRect(0, 0, dW, dH);
          ctx.drawImage(oc, -dW / 2, -dH / 2);
        }
        ctx.restore();
      }

    } else if (player.homing) {
      // Homing: white fireball + plasma trail
      const rawAngle = Math.atan2(player.vy, player.vx);
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.05);
      const auraLen = bd * (1.0 + pulse * 0.2);

      // plasma trail opposite to velocity
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rawAngle + Math.PI);
      const aura = ctx.createLinearGradient(0, 0, auraLen, 0);
      aura.addColorStop(0,    `rgba(255,255,255,${0.95 + pulse * 0.05})`);
      aura.addColorStop(0.15, `rgba(180,240,255,${0.85 + pulse * 0.1})`);
      aura.addColorStop(0.5,  `rgba(80,180,255,0.5)`);
      aura.addColorStop(1,    'rgba(40,120,255,0)');
      ctx.lineWidth = bd * 0.6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = aura;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(auraLen, 0); ctx.stroke();
      const core = ctx.createLinearGradient(0, 0, auraLen * 0.5, 0);
      core.addColorStop(0,   'rgba(255,255,255,1.0)');
      core.addColorStop(0.4, 'rgba(220,240,255,0.8)');
      core.addColorStop(1,   'rgba(180,220,255,0)');
      ctx.lineWidth = bd * 0.3;
      ctx.strokeStyle = core;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(auraLen * 0.5, 0); ctx.stroke();
      ctx.restore();

      // dive.png sprite facing homing direction — same as up-dash
      if (diveImg.complete && diveImg.naturalWidth > 0) {
        const dW = Math.round(player.h * 2 * (WALK_FW / WALK_FH) * CFG.diveScale * 0.65);
        const dH = Math.round(dW * (918 / 546));
        const homingDrawAngle = rawAngle + Math.PI / 2;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(homingDrawAngle);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(diveImg, -dW / 2, -dH / 2, dW, dH);
        const oc = document.createElement('canvas'); oc.width = dW; oc.height = dH;
        const ox = oc.getContext('2d');
        ox.filter = 'brightness(10) saturate(0)';
        ox.drawImage(diveImg, 0, 0, dW, dH);
        ox.filter = 'none';
        ox.globalCompositeOperation = 'destination-in';
        const g = ox.createLinearGradient(0, 0, 0, dH);
        g.addColorStop(0.0, 'rgba(0,0,0,0)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
        g.addColorStop(1.0, 'rgba(0,0,0,1)');
        ox.fillStyle = g; ox.fillRect(0, 0, dW, dH);
        ctx.drawImage(oc, -dW / 2, -dH / 2);
        ctx.restore();
      }
    } else {
      // post-homing bounce, airborne — hold frame 50
      if (jumpSheet.complete && jumpSheet.naturalWidth > 0) {
        const fW = Math.round(player.h * 2 * (WALK_FW / WALK_FH) * CFG.jumpScale);
        const fH = Math.round(fW * (JUMP_FH / JUMP_FW));
        const scaleX = player.dir === -1 ? -1 : 1;
        const airFrame = 41;
        const jCol = airFrame % JUMP_COLS;
        const jRow = Math.floor(airFrame / JUMP_COLS);
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(scaleX, 1);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(jumpSheet, jCol * JUMP_FW, jRow * JUMP_FH, JUMP_FW, JUMP_FH, -fW / 2, -fH / 2, fW, fH);
        ctx.restore();
      }
    }
  } else {
    fbFrame = 0; fbTick = 0;
    // Normal / walk / air sprite — with ball-exit white flash
    if (player.ballExitFlash > 0) {
      const t = player.ballExitFlash / BALL_EXIT_FLASH; // 1→0
      const brightness = 1 + t * 5;
      const saturate = 1 - t * 0.9;
      ctx.filter = `brightness(${brightness.toFixed(2)}) saturate(${saturate.toFixed(2)})`;
    }
    ctx.translate(sx + player.w / 2, player.y + player.h);
    const scaleX = player.dir === -1 ? -1 : 1;
    ctx.scale(scaleX, 1);
    if (player.dashingUp) {
      ctx.rotate(-Math.PI / 2);
    } else {
      ctx.rotate(CFG.spriteRot * Math.PI / 180);
    }
    if (player.spinning) ctx.rotate((player.spinAngle * Math.PI) / 180);
    if (player.stompFlipTimer > 0) {
      const centerY = -(player.h + footOffset) / 2;
      ctx.translate(0, centerY);
      ctx.rotate((player.stompFlipAngle * Math.PI) / 180);
      ctx.translate(0, -centerY);
    }
    // Jump anim state machine — transition on ground change
    if (!prevOnGround && player.onGround && (jumpAnimState === 'air' || jumpAnimState === 'crouch')) {
      jumpAnimState = 'idle'; jumpAnimFrame = 0; jumpAnimTick = 0;
    }
    // Only transition to 'air' on intentional jump (set in update.js on key press)
    // Do NOT auto-trigger on slam bounce or safe bounce
    prevOnGround = player.onGround;

    const useJumpSheet = jumpSheet.complete && jumpSheet.naturalWidth > 0 &&
                         jumpAnimState === 'air';

    if (useJumpSheet && !player.spinning) {
      let srcFrame;
      if (jumpAnimState === 'crouch') {
        srcFrame = JUMP_CROUCH_FRAMES[Math.min(jumpAnimFrame, JUMP_CROUCH_FRAMES.length - 1)];
        jumpAnimTick++;
        if (jumpAnimTick >= JUMP_ANIM_SPEED) {
          jumpAnimTick = 0; jumpAnimFrame++;
          if (jumpAnimFrame >= JUMP_CROUCH_FRAMES.length) { jumpAnimState = 'air'; jumpAnimFrame = 0; }
        }
      } else if (jumpAnimState === 'air') {
        srcFrame = Math.min(JUMP_AIR_START + jumpAnimFrame, JUMP_AIR_END);
        jumpAnimTick++;
        if (jumpAnimTick >= JUMP_AIR_SPEED && srcFrame < JUMP_AIR_END) {
          jumpAnimTick = 0; jumpAnimFrame++;
        }
      }
      const scaleFactor = 1.0;
      const baseW = Math.round(player.h * 2 * (WALK_FW / WALK_FH) * CFG.jumpScale);
      const dispW = Math.round(baseW * scaleFactor);
      const dispH = Math.round(dispW * (JUMP_FH / JUMP_FW));
      const jCol = srcFrame % JUMP_COLS;
      const jRow = Math.floor(srcFrame / JUMP_COLS);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const jumpYOffset = jumpAnimState === 'land' ? CFG.landSpriteOffset : CFG.jumpSpriteOffset;
      ctx.drawImage(jumpSheet, jCol * JUMP_FW, jRow * JUMP_FH, JUMP_FW, JUMP_FH, -dispW / 2, -dispH + footOffset + jumpYOffset, dispW, dispH);
    } else if (walkSheet.complete && walkSheet.naturalWidth > 0) {
      let frameIdx;
      if (!player.onGround || player.spinning) {
        walkFrame = 0; walkTick = 0;
        frameIdx = 0;
      } else if (Math.abs(player.vx) > 0.2) {
        walkTick++;
        if (walkTick >= WALK_SPEED) { walkTick = 0; walkFrame = (walkFrame + 1) % WALK_FRAMES; }
        frameIdx = walkFrame;
      } else {
        walkFrame = 0; walkTick = 0;
        frameIdx = 0;
      }
      const dispH = player.h * 2;
      const dispW = Math.round(dispH * (WALK_FW / WALK_FH));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(walkSheet,
        frameIdx * WALK_FW + 1, 1, WALK_FW - 2, WALK_FH - 2,
        -dispW / 2, -dispH + footOffset, dispW, dispH);
    } else {
      ctx.fillStyle = '#ff69b4';
      ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
    }
    ctx.filter = 'none';
  }

  // Frenzy pulse ring (drawn in screen space, independent of transform)
  ctx.restore();
}

function drawParticlesAll() {
  // Coin pops
  for (let i = coinParticles.length - 1; i >= 0; i--) {
    const p = coinParticles[i]; p.y += p.vy; p.vy += 0.3; p.life--;
    if (p.life <= 0) { coinParticles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = COLORS.orb;
    ctx.beginPath(); ctx.arc(p.x - camera, p.y, 5, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Dust
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.r *= 0.93; p.life--;
    if (p.life <= 0) { dustParticles.splice(i, 1); continue; }
    ctx.globalAlpha = (p.life / p.maxLife) * 0.65;
    ctx.fillStyle = '#d4b483';
    ctx.beginPath(); ctx.arc(p.x - camera, p.y, p.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Trail — white electric sparks
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.85; p.vy *= 0.85;
    p.life--;
    if (p.life <= 0) { trailParticles.splice(i, 1); continue; }
    const t = p.life / p.maxLife;
    const alpha = t * (p.bright ? 1.0 : 0.8);
    const px = p.x - camera;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(px, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Spindash sparks
  for (let i = spindashParticles.length - 1; i >= 0; i--) {
    const p = spindashParticles[i]; p.x += p.vx; p.y += p.vy; p.r *= 0.9; p.life--;
    if (p.life <= 0) { spindashParticles.splice(i, 1); continue; }
    ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
    ctx.fillStyle = `hsl(${50 + Math.random()*20},100%,65%)`;
    ctx.beginPath(); ctx.arc(p.x - camera, p.y, p.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Kill explosions + block debris
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    if (!p.flash) {
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity !== undefined ? p.gravity : 0.15;
      if (p.rot !== undefined) { p.rot += p.rotV; p.vx *= 0.97; }
    }
    p.r *= p.flash ? 0.75 : 0.97; p.life--;
    if (p.life <= 0) { explosionParticles.splice(i, 1); continue; }
    const alpha = p.opaque ? 1 : (p.flash ? (p.life / p.maxLife) : (p.life / p.maxLife) * 0.92);
    ctx.globalAlpha = alpha;
    if (p.square) {
      // Block debris chunk
      ctx.save();
      ctx.translate(p.x - camera, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-p.r / 2, -p.r / 2, p.r, p.r);
      ctx.restore();
    } else {
      ctx.fillStyle = p.white ? '#ffffff' : (p.flash ? `hsl(${p.hue},100%,90%)` : `hsl(${p.hue},100%,60%)`);
      ctx.beginPath(); ctx.arc(p.x - camera, p.y, Math.max(p.r, 0.5), 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Enemy projectiles
  for (const p of projectiles) {
    const sx = p.x - camera;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = p.flying ? '#203058' : '#c02020';
    ctx.beginPath(); ctx.arc(sx, p.y, 9, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.flying ? '#4080d8' : '#e84040';
    ctx.beginPath(); ctx.arc(sx, p.y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx - 1.5, p.y - 1.5, 2, 0, Math.PI*2); ctx.fill();
  }
}

function drawDeathAnimation() {
  if (!dead || !player.dead) return;
  player.y += player.vy; player.vy += CFG.gravity;
  const sx = player.x - camera;
  ctx.save();
  ctx.translate(sx + player.w / 2, player.y + player.h);
  ctx.rotate(Math.PI);
  if (walkSheet.complete && walkSheet.naturalWidth > 0) {
    const dispH = player.h * 2;
    const dispW = Math.round(dispH * (WALK_FW / WALK_FH));
    ctx.drawImage(walkSheet, 0, 0, WALK_FW, WALK_FH, -dispW/2, 0, dispW, dispH);
  }
  ctx.restore();
}

