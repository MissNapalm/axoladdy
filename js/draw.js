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
    _batTintCtx.globalAlpha = 0.55;
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
    _baddieTintCtx.globalAlpha = 0.8;
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
  {ox:0,   y:30}, {ox:280, y:18}, {ox:530, y:42},
  {ox:760, y:22}, {ox:990, y:38}, {ox:1220,y:14},
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

function drawPlatforms() {
  for (const p of LEVELS[currentLevel].platforms) {
    for (let i = 0; i < p.w; i++) {
      const tx = p.x + i, sx = tx * TILE - camera;
      if (sx < -TILE || sx > W + TILE) continue;
      const key = `${tx}_${p.y}`;
      if (blockHit[key]) continue; // block destroyed — gone completely
      drawBlock(sx, p.y * TILE, p.t);
    }
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


function drawHeartPickups() {
  for (const h of heartPickups) {
    if (h.collected) continue;
    const sx = h.x - camera;
    if (sx < -40 || sx > W + 40) continue;
    const bob = Math.sin(h.bobTimer) * 2;
    const sy = h.y + bob;
    ctx.save();
    ctx.translate(sx + 10, sy + 10);
    // Simple heart shape
    const pulse = 1 + 0.08 * Math.sin(h.bobTimer * 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ff4466';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-10, -4, -10, -10, 0, -6);
    ctx.bezierCurveTo(10, -10, 10, -4, 0, 4);
    ctx.fill();
    ctx.fillStyle = '#ff88aa';
    ctx.beginPath();
    ctx.ellipse(-3, -5, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
      drawBaddieSprite(ctx, bFrame2, dw, dh, cx - dw / 2, g.y + g.h - dh, '#ff6600');
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
    drawBatSprite(ctx, batFrame, dw, dh, cx - dw / 2, cy - dh / 2, isRedBat);
  } else {
    // Ground goomba — sprite from baddie.mov sheet
    const baddieFrame = Math.floor((performance.now() / 1000 * 24 + g.id * 7)) % BADDIE_FRAMES;
    const dw = Math.round(TILE * CFG.gnomeScale);
    const dh = Math.round(dw * BADDIE_FH / BADDIE_FW);
    const dx = cx - dw / 2, dy = g.y + g.h - dh;
    ctx.save();
    if (g.vx < 0) {
      // mirror: translate to right edge of sprite, flip X
      ctx.translate(dx + dw, 0);
      ctx.scale(-1, 1);
      drawBaddieSprite(ctx, baddieFrame, dw, dh, 0, dy, null);
    } else {
      drawBaddieSprite(ctx, baddieFrame, dw, dh, dx, dy, null);
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
  if (LEVELS[currentLevel]?.isTutorial || currentLevel === 1) return;
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
  // Flicker every 4 frames while invincible — but not during frenzy
  if (player.frenzyTimer <= 0 && player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) return;
  const sx = player.x - camera;
  ctx.save();
  // Frenzy: periodic white flash every ~40 frames
  if (player.frenzyTimer > 0) {
    ctx.filter = 'brightness(1.5) saturate(0.15)';
  }
  const dh = player.h * 1.0;
  const footOffset = CFG.spriteOffset;

  if ((player.homing || player.ballForm) && fireballSheet.complete && fireballSheet.naturalWidth > 0) {
    const bd = CFG.ballSize;
    // Advance fireball animation
    fbTick++;
    if (fbTick >= FB_SPEED) { fbTick = 0; fbFrame = (fbFrame + 1) % FB_FRAMES; }
    ctx.translate(sx + player.w / 2, player.y + player.h / 2);
    ctx.imageSmoothingEnabled = CFG.smoothing === 1;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'grayscale(1) brightness(1.4) sepia(0.4) saturate(3) hue-rotate(170deg)';
    const fbW = Math.round(bd * (FB_FW / FB_FH));
    ctx.drawImage(fireballSheet, fbFrame * FB_FW + 1, 1, FB_FW - 2, FB_FH - 2, -fbW / 2, -bd / 2, fbW, bd);
    ctx.filter = 'none';
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
    // All sprites pre-baked to exact draw size — drawn 1:1, no scaling
    if (walkSheet.complete && walkSheet.naturalWidth > 0) {
      let frameIdx;
      if (!player.onGround || player.spinning) {
        walkFrame = 0; walkTick = 0;
        frameIdx = 0; // stand pose for air
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
  if (player.frenzyTimer > 0) {
    const pcx = player.x + player.w / 2 - camera;
    const pcy = player.y + player.h / 2;
    const t = Date.now() / 300;
    const pulseR = player.w * 0.9 + Math.sin(t) * 8;
    const alpha = 0.35 + 0.25 * Math.abs(Math.sin(t));
    ctx.save();
    ctx.strokeStyle = `rgba(80,220,255,${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#50dcff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(pcx, pcy, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    // second ring offset
    const pulseR2 = pulseR + 10 + Math.sin(t + 1) * 5;
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(pcx, pcy, pulseR2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

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
  // Trail
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i]; p.r *= 0.9; p.life--;
    if (p.life <= 0) { trailParticles.splice(i, 1); continue; }
    const a = p.life / p.maxLife;
    if (p.bright) {
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = `hsl(${p.hue},100%,85%)`;
      ctx.beginPath(); ctx.arc(p.x - camera, p.y, p.r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x - camera, p.y, p.r * 0.45, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.globalAlpha = a * 0.75;
      ctx.fillStyle = `hsl(${p.hue},100%,70%)`;
      ctx.beginPath(); ctx.arc(p.x - camera, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
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
    const alpha = p.flash ? (p.life / p.maxLife) : (p.life / p.maxLife) * 0.92;
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
      ctx.fillStyle = p.flash ? `hsl(${p.hue},100%,90%)` : `hsl(${p.hue},100%,60%)`;
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

