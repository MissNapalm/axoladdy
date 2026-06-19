const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// HiDPI: render at device pixel ratio so sprites are sharp on retina screens
const DPR = Math.min(window.devicePixelRatio || 1, 3);
canvas.style.width  = canvas.width  + 'px';
canvas.style.height = canvas.height + 'px';
canvas.width  *= DPR;
canvas.height *= DPR;

const walkSheet     = new Image(); walkSheet.src     = 'assets/images/walk_sheet.png';
const dashImg       = new Image(); dashImg.src       = 'dash.png';
const diveImg       = new Image(); diveImg.src       = 'dive.png';
const fallingImg    = new Image(); fallingImg.src    = 'falling.png';
const jumpSheet     = new Image(); jumpSheet.src     = 'assets/images/jump_sheet.png';
const JUMP_FRAMES   = 101; // frames 45–145
const JUMP_START    = 44;  // 0-based index of source frame 45
const JUMP_COLS     = 10;
const JUMP_FW       = 732;
const JUMP_FH       = 672;
const fireballSheet = new Image(); fireballSheet.src = 'assets/images/fireball_sheet.png';
const dashSheet     = new Image(); dashSheet.src     = 'assets/images/dash_sheet.png';
const ballImg       = new Image(); ballImg.src       = 'assets/images/ball.png';
const batSheet      = new Image(); batSheet.src      = 'assets/images/bat_sheet.png';
const baddieSheet   = new Image(); baddieSheet.src   = 'assets/images/baddie_sheet.png';
const cloudImg      = new Image(); cloudImg.src      = 'assets/images/cloud.png';
const eyeImg        = new Image(); eyeImg.src        = 'assets/images/eye.png';

const BAT_FRAMES    = 59;
const BAT_COLS      = 10;
const BAT_FW        = 128;
const BAT_FH        = 135;

const BADDIE_FRAMES = 65;
const BADDIE_COLS   = 10;
const BADDIE_FW     = 122;
const BADDIE_FH     = 160;

// ── Audio ────────────────────────────────────────────────────────────────────
const SOUNDS = {
  dash:     new Audio('dash.mp3'),
  gem:      new Audio('gem.mp3'),
  laser:    new Audio('laser.mp3'),
  explode:  new Audio('explode.mp3'),
  crate:    new Audio('crate.mp3'),
  stomp:    new Audio('stomp.mp3'),
  dies:     new Audio('dies.mp3'),
  charging: new Audio('charging.mp3'),
  dial:     new Audio('dial.wav'),
  hit:      new Audio('hit.wav'),
  jump:     new Audio('jump.wav'),
};
function playSound(name, vol = 1) {
  const snd = SOUNDS[name];
  if (!snd) return;
  const clone = snd.cloneNode();
  clone.volume = Math.min(1, Math.max(0, vol));
  clone.play().catch(() => {});
}
const WALK_FRAMES   = 27;
const WALK_FW       = 354;
const WALK_FH       = 256;
let   walkFrame     = 0;
let   walkTick      = 0;
const WALK_SPEED    = 4;
// Jump animation state machine
// States: 'idle' | 'crouch' | 'air' | 'land'
let   jumpAnimState = 'idle';
let   jumpAnimFrame = 0;  // index into current sequence
let   jumpAnimTick  = 0;
let   prevOnGround  = false;
const JUMP_CROUCH_FRAMES  = [5, 6, 7];
const JUMP_AIR_START      = 58;   // 0-based frame 59
const JUMP_AIR_END        = 92;   // 0-based frame 93
const JUMP_LAND_FRAMES    = Array.from({length: 43}, (_, i) => 79 + i); // frames 80-122 (0-based 79-121)
const JUMP_ANIM_SPEED     = 2;
const JUMP_AIR_SPEED      = 3;
// Per-frame scale factors to normalize character body size (ref = frame 50)
const JUMP_SCALE = {
  5:1.0054, 6:1.0054, 7:1.0754,
  44:1.5787, 45:1.3110, 46:1.2164, 47:1.0600, 48:1.0109, 49:1.0000,
  50:1.0054, 51:1.0137, 52:1.0249, 53:1.0363, 54:1.0451, 55:1.0510,
  56:1.0570, 57:1.0570, 58:1.0630, 59:1.0510, 60:1.0510, 61:1.0421,
  62:1.0421, 63:1.0306, 64:1.0306, 65:1.0054, 66:1.0054, 67:0.9946,
  68:0.9946, 69:0.9738, 70:0.9738, 71:0.9537, 72:0.9537, 73:0.9392,
  74:0.9392, 75:0.9252, 76:0.9252, 77:0.8854, 78:0.8854, 79:0.8791,
  80:0.8791, 81:0.8854, 82:0.8854, 83:0.9115, 84:0.9115, 85:0.9587,
  86:0.9587, 87:1.0277, 88:1.0249, 89:1.0451, 90:1.0451, 91:1.0027,
  92:0.9738, 93:0.9440, 94:0.9206, 95:0.9206, 96:0.8983, 97:0.8961,
  98:0.8791, 99:0.8812, 100:0.8983, 101:0.9005, 102:0.9636, 103:0.9636,
  104:1.0944, 105:1.1929, 106:1.3250, 107:1.3590, 108:1.6787, 109:1.4549,
  110:1.3203, 111:1.3018, 112:1.2576, 113:1.2326, 114:1.2085, 115:1.2492,
  116:1.3203, 117:1.4215, 118:1.4215, 119:1.6201, 120:1.6201, 121:1.7256, 122:1.7256,
};
const FB_FRAMES     = 77;
const FB_FW         = 132;
const FB_FH         = 96;
let   fbFrame       = 0;
let   fbTick        = 0;
const FB_SPEED      = 2;
const DASH_FRAMES   = 78;
const DASH_FW       = 132;
const DASH_FH       = 96;
let   dashFrame     = 0;
let   dashTick      = 0;
const DASH_SPEED    = 2;
const BALL_EXIT_FLASH = 6; // frames for white-flash-to-normal transition

const W = 800, H = 450;
const TILE = 32;

const DEFAULTS = {
  gravity:  0.32,
  gravity1: 0.24,
  jump1: 6.4,
  dashH: 26,
  dashV: 14,
  dashLen: 15,
  dashLenFrenzy: 14,
  dashFrenzyMult: 0.6,
  moveSpeed: 3.5,
  axoSize: 44,
  enemySize: 32,
  gnomeScale: 1.0,
  batScale: 1.26,
  smoothing: 1,
  spriteRot: 20,
  spriteOffset: 4,
  jumpSpriteOffset: 0,
  landSpriteOffset: 0,
  diveScale: 1.369,
  jumpScale: 1.910,
  ballSize: 48,
  homingChain: 0,

  stompKill: 1,
  slamUnlocked: 0,
  godMode: 0,
};

function loadCFG() {
  // Load axolotl.cfg synchronously — values override hardcoded DEFAULTS
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'axolotl.cfg?' + Date.now(), false);
    xhr.send();
    if (xhr.status === 200) {
      for (const line of xhr.responseText.split('\n')) {
        const eq = line.indexOf('=');
        if (eq < 0) continue;
        const k = line.slice(0, eq).trim(), v = line.slice(eq + 1).trim();
        if (k in DEFAULTS) DEFAULTS[k] = parseFloat(v);
      }
    }
  } catch(e) {}
  try { const s = localStorage.getItem('axo_cfg'); if (s) return { ...DEFAULTS, ...JSON.parse(s) }; } catch(e) {}
  return { ...DEFAULTS };
}
function saveCFG() { localStorage.setItem('axo_cfg', JSON.stringify(CFG)); }

const CFG = loadCFG();

const KEY_DEFAULTS = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'KeyL', up: 'KeyE', dash: 'KeyF', down: 'KeyX' };
function loadKeys() {
  try {
    const s = localStorage.getItem('axo_keys');
    if (s) {
      const saved = JSON.parse(s);
      // migrate: reset stale jump/up bindings to new defaults
      return { ...KEY_DEFAULTS, ...saved };
    }
  } catch(e) {}
  return { ...KEY_DEFAULTS };
}
function saveKeys() { localStorage.setItem('axo_keys', JSON.stringify(KEYS)); }
const KEYS = loadKeys();

const CAM_EASE = 0.12;

let zoom = parseFloat(localStorage.getItem('axo_zoom') || '1.40');

// ── Input ────────────────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });
function pressed(codes) { return codes.some(c => keys[c]); }

// ── Colours ──────────────────────────────────────────────────────────────────
let currentTheme = localStorage.getItem('axo_theme') || 'city';
function setTheme(t) { currentTheme = t; localStorage.setItem('axo_theme', t); }

const THEMES = {
  city: {
    skyTop:'#04081c', skyBot:'#0c1632',
    ground:'#070f1e', groundSub:'#040b16', groundEdge:'#88bbff', groundTrace:'#1a2a44', groundNode:'#6699ff',
    brick:'#070f1e', brickInner:'#0c1e38', brickEdge:'#4488cc', brickCross:'#1a2e48',
    qOuter:'#030e1c', qInner:'#003848', qGlow:'#6699ff', qBorder:'#6699ff', qHi:'#aaccff', qChar:'⬡',
    pipe:'#060d18', pipeRail:'#3366aa', pipeFlow:'#aaccff', pipeCap:'#3366aa', pipeCapDk:'#162240', pipeCore:'#88bbff',
    orb:'#ffcc44', orbHi:'#fff0aa',
    hpBlock:'#120008', hpBlockInner:'#300018', hpGlow:'#ff2255', hpText:'#ff88aa',
  },
  forest: {
    skyTop:'#1a0a3a', skyBot:'#2a1858',
    ground:'#6b4423', groundSub:'#4a2e14', groundEdge:'#8a5c30', groundTrace:'#7a5228', groundNode:'#a06c3a',
    brick:'#3a1858', brickInner:'#2a1048', brickEdge:'#aa66dd', brickCross:'#4a2278',
    qOuter:'#1a0838', qInner:'#2a1050', qGlow:'#cc44ff', qBorder:'#aa66dd', qHi:'#eeccff', qChar:'❀',
    pipe:'#1e0a3a', pipeRail:'#7744aa', pipeFlow:'#eeccff', pipeCap:'#7744aa', pipeCapDk:'#3a1858', pipeCore:'#cc44ff',
    orb:'#ffdd44', orbHi:'#fff8aa',
    hpBlock:'#120008', hpBlockInner:'#300018', hpGlow:'#ff2255', hpText:'#ff88aa',
  },
  happy: {
    skyTop:'#44aaff', skyBot:'#88ddff',
    ground:'#cc6611', groundSub:'#aa4408', groundEdge:'#ffee44', groundTrace:'#dd8833', groundNode:'#ffcc00',
    brick:'#cc8833', brickInner:'#dd9944', brickEdge:'#ffcc44', brickCross:'#aa6622',
    qOuter:'#dd9900', qInner:'#eeaa00', qGlow:'#ffee44', qBorder:'#ffcc00', qHi:'#fff8cc', qChar:'★',
    pipe:'#aa4408', pipeRail:'#dd7722', pipeFlow:'#ffdd88', pipeCap:'#cc5511', pipeCapDk:'#882200', pipeCore:'#ffbb44',
    orb:'#ff8844', orbHi:'#ffcc99',
    hpBlock:'#880022', hpBlockInner:'#cc0033', hpGlow:'#ff6688', hpText:'#ffaacc',
  },
  ice: {
    skyTop:'#0a1828', skyBot:'#162438',
    ground:'#8ab8d8', groundSub:'#6898b8', groundEdge:'#ddeeff', groundTrace:'#a8ccee', groundNode:'#ffffff',
    brick:'#6898c8', brickInner:'#88aad8', brickEdge:'#cceeff', brickCross:'#88aacc',
    qOuter:'#4878a8', qInner:'#6898c8', qGlow:'#ddeeff', qBorder:'#cceeff', qHi:'#ffffff', qChar:'❄',
    pipe:'#5888b8', pipeRail:'#88bbdd', pipeFlow:'#ffffff', pipeCap:'#88bbdd', pipeCapDk:'#5888b8', pipeCore:'#ddeeff',
    orb:'#88eeff', orbHi:'#ffffff',
    hpBlock:'#880022', hpBlockInner:'#cc0033', hpGlow:'#ff6688', hpText:'#ffaacc',
  },
  woods: {
    skyTop:'#4a9ec8', skyBot:'#7ac4e8',
    ground:'#6b4423', groundSub:'#4a2e14', groundEdge:'#8a5c30', groundTrace:'#5a3818', groundNode:'#a06a38',
    brick:'#d4703a', brickInner:'#e8884a', brickEdge:'#f0a060', brickCross:'#b85a28',
    qOuter:'#f5c542', qInner:'#ffe066', qGlow:'#ff9900', qBorder:'#cc8800', qHi:'#fff5aa', qChar:'⭐',
    pipe:'#44aa22', pipeRail:'#66cc44', pipeFlow:'#aaff55', pipeCap:'#2a8810', pipeCapDk:'#1a5c08', pipeCore:'#88ee44',
    orb:'#ffdd44', orbHi:'#ffffaa',
    hpBlock:'#cc3366', hpBlockInner:'#ee5588', hpGlow:'#ff88aa', hpText:'#ffe0ee',
  },
};
// alias for legacy references
const COLORS = { orb:'#ffcc44', orbDim:'#aa8822', pole:'#4488cc', crystalGlow:'#6699ff' };

// ── Sonic-style level (1200 tiles wide) ──────────────────────────────────────
const LEVEL_W_TILES = 1200;
const groundY = 12;

// ── Level generator helpers ───────────────────────────────────────────────────
function makeCoinDefs(fn) {
  const defs = [];
  const cl = (x1,x2,y) => { for(let x=x1;x<=x2;x++) defs.push({x,y}); };
  const ca = (cx,y,r,n) => { for(let i=0;i<n;i++){const a=Math.PI+(Math.PI*i/(n-1)); defs.push({x:Math.round(cx+Math.cos(a)*r),y:Math.round(y+Math.sin(a)*r*0.6)});} };
  fn(cl, ca);
  return defs;
}

// ── 11 levels ─────────────────────────────────────────────────────────────────
const LEVELS = [
  // Level 0 — TUTORIAL
  {
    gaps: [{x:28,w:3}],
    platforms: [
      {x:5,y:8,w:8,t:'brick'},
      {x:14,y:8,w:6,t:'brick'},
      {x:22,y:6,w:6,t:'brick'},
      {x:35,y:6,w:5,t:'qblock'},{x:42,y:7,w:5,t:'qblock'},
      {x:52,y:7,w:8,t:'brick'},{x:54,y:6,w:4,t:'qblock'},
      {x:18,y:7,w:1,t:'hblock'},
    ],
    pipes: [{x:32,h:2}],
    coinDefs: makeCoinDefs((cl)=>{cl(6,13,9);cl(15,22,6);cl(23,30,4);}),
    goombas: [
      {x:37,pl:35,pr:44},
      {x:48,pl:44,pr:53},{x:52,pl:46,pr:56},{x:55,pl:50,pr:60},
      {x:58,pl:52,pr:64},{x:62,pl:56,pr:68},
    ],
    flyers: [
      {x:38,fy:6*TILE,pw:5},{x:42,fy:7*TILE,pw:5},{x:46,fy:6*TILE,pw:5},
      {x:53,fy:6*TILE,pw:4},{x:57,fy:7*TILE,pw:4},{x:61,fy:6*TILE,pw:4},
    ],
  },
  // Level 1 — ~3× Mario 1-1 length
  {
    gaps: [
      {x:55,w:4},{x:110,w:5},
      {x:192,w:7},
      {x:300,w:5},
      {x:400,w:7},
      {x:490,w:5},
      {x:555,w:5},
    ],
    platforms: [
      // One platform per triangle group, centered above the bat midpoint, clear of gnome zones
      {x:15,y:8,w:3,t:'qblock'},   // group 1 mid ~16 (pl:5 pr:28)
      {x:40,y:8,w:3,t:'qblock'},   // group 2 mid ~41 (pl:28 pr:55)
      {x:67,y:8,w:3,t:'qblock'},   // group 3 mid ~68 (pl:55 pr:82)
      {x:96,y:8,w:3,t:'qblock'},   // group 4 mid ~97 (pl:82 pr:112)
      {x:134,y:8,w:3,t:'qblock'},  // group 5 mid ~135 (pl:122 pr:148)
      {x:213,y:8,w:3,t:'qblock'},  // group 6 mid ~214 (pl:200 pr:228)
      {x:235,y:8,w:3,t:'qblock'},  // group 7 mid ~236 (pl:222 pr:250)
      {x:264,y:8,w:3,t:'qblock'},  // group 8 mid ~265 (pl:252 pr:278)
      {x:289,y:8,w:3,t:'qblock'},  // group 9 mid ~290 (pl:278 pr:302)
      {x:343,y:8,w:3,t:'brick'},   // group 10 shooter mid ~344 (pl:330 pr:358)
      {x:364,y:8,w:3,t:'brick'},   // group 11 shooter mid ~365 (pl:352 pr:378)
      {x:396,y:8,w:3,t:'brick'},   // group 12 shooter mid ~396 (pl:385 pr:408)
      {x:416,y:8,w:3,t:'brick'},   // group 13 shooter mid ~416 (pl:405 pr:428)
      {x:457,y:8,w:3,t:'brick'},   // group 14 shooter mid ~457 (pl:445 pr:470)
      {x:60,y:8,w:1,t:'hblock'},{x:285,y:8,w:1,t:'hblock'},{x:468,y:8,w:1,t:'hblock'},
    ],
    pipes: [{x:20,h:2},{x:40,h:3},{x:72,h:2},{x:106,h:4},{x:245,h:3},{x:265,h:2},{x:370,h:3},{x:385,h:4}],
    groundEnd: 475,
    coinDefs: makeCoinDefs((cl,ca)=>{ cl(18,50,11);cl(128,132,11);cl(198,202,11);cl(268,298,11);cl(310,314,11);cl(423,427,11);cl(455,470,11); }),
    hasChaserEncounter: true,
    chaserTriggerX: 150 * TILE,
    chaserExitX: 200 * TILE,
    goombas: [
      {x:10,pl:5,pr:28},{x:35,pl:28,pr:55},
      {x:65,pl:55,pr:82},{x:90,pl:82,pr:112},
      {x:130,pl:122,pr:148},
      {x:210,pl:200,pr:228},{x:232,pl:222,pr:250},
      {x:262,pl:252,pr:278},{x:288,pl:278,pr:302},
      {x:340,pl:330,pr:358,shooter:true},{x:362,pl:352,pr:378,shooter:true},
      {x:395,pl:385,pr:408,shooter:true},{x:415,pl:405,pr:428,shooter:true},
      {x:455,pl:445,pr:470,shooter:true},
    ],
    flyers: [
      {x:218,fy:6*TILE,pw:7},{x:232,fy:7*TILE,pw:7},{x:245,fy:6*TILE,pw:7},
      {x:270,fy:6*TILE,pw:7},{x:283,fy:7*TILE,pw:7},{x:295,fy:6*TILE,pw:7},
      {x:348,fy:6*TILE,pw:7},{x:360,fy:7*TILE,pw:7},{x:372,fy:6*TILE,pw:7},
      {x:400,fy:6*TILE,pw:7},{x:412,fy:7*TILE,pw:7},{x:424,fy:6*TILE,pw:7},
    ],
  },
  // Level 2 — wide gaps, tall platforms
  {
    gaps: [{x:60,w:7},{x:150,w:9},{x:260,w:6},{x:350,w:11},{x:450,w:7},{x:560,w:8},{x:660,w:6},{x:760,w:10},{x:860,w:7},{x:960,w:9},{x:1060,w:8},{x:1150,w:7}],
    platforms: [{x:10,y:8,w:5,t:'brick'},{x:30,y:5,w:4,t:'qblock'},{x:70,y:3,w:8,t:'brick'},{x:100,y:7,w:5,t:'qblock'},{x:130,y:4,w:6,t:'brick'},{x:165,y:2,w:8,t:'qblock'},{x:200,y:6,w:5,t:'brick'},{x:230,y:3,w:7,t:'qblock'},{x:270,y:5,w:6,t:'brick'},{x:300,y:2,w:9,t:'qblock'},{x:360,y:4,w:7,t:'brick'},{x:400,y:7,w:5,t:'qblock'},{x:430,y:3,w:8,t:'brick'},{x:460,y:6,w:6,t:'qblock'},{x:500,y:2,w:7,t:'brick'},{x:530,y:5,w:5,t:'qblock'},{x:570,y:3,w:8,t:'brick'},{x:610,y:7,w:5,t:'qblock'},{x:640,y:4,w:6,t:'brick'},{x:670,y:2,w:8,t:'qblock'},{x:710,y:6,w:5,t:'brick'},{x:740,y:3,w:7,t:'qblock'},{x:780,y:5,w:6,t:'brick'},{x:820,y:2,w:8,t:'qblock'},{x:870,y:4,w:7,t:'brick'},{x:910,y:7,w:5,t:'qblock'},{x:940,y:3,w:6,t:'brick'},{x:970,y:6,w:7,t:'qblock'},{x:1010,y:2,w:8,t:'brick'},{x:1050,y:5,w:5,t:'qblock'},{x:1080,y:3,w:7,t:'brick'},{x:1120,y:7,w:5,t:'qblock'},{x:1160,y:4,w:8,t:'brick'},{x:45,y:6,w:1,t:'hblock'},{x:195,y:5,w:1,t:'hblock'},{x:395,y:6,w:1,t:'hblock'},{x:595,y:6,w:1,t:'hblock'},{x:795,y:5,w:1,t:'hblock'},{x:995,y:6,w:1,t:'hblock'}],
    pipes: [{x:15,h:3},{x:55,h:2},{x:108,h:4},{x:180,h:3},{x:240,h:2},{x:320,h:4},{x:410,h:3},{x:480,h:2},{x:545,h:4},{x:625,h:3},{x:690,h:2},{x:755,h:4},{x:830,h:3},{x:900,h:2},{x:975,h:4},{x:1035,h:3},{x:1100,h:2},{x:1165,h:3}],
    coinDefs: makeCoinDefs((cl,ca)=>{ cl(2,55,8);ca(75,6,6,8);cl(110,145,4);ca(170,5,5,7);cl(205,255,6);ca(280,4,6,8);cl(310,345,5);ca(375,3,5,7);cl(410,445,6);ca(470,5,6,8);cl(510,555,4);ca(580,6,5,7);cl(615,655,5);ca(680,4,6,8);cl(715,755,6);ca(775,5,5,7);cl(810,855,4);ca(875,3,6,8);cl(912,955,5);ca(980,6,5,7);cl(1015,1055,4);ca(1075,5,6,8);cl(1115,1145,6);cl(1160,1188,5); }),
    goombas: [{x:12,pl:5,pr:25},{x:35,pl:25,pr:55},{x:75,pl:65,pr:100},{x:108,pl:100,pr:128},{x:138,pl:128,pr:150},{x:210,pl:200,pr:230},{x:240,pl:230,pr:265},{x:280,pl:270,pr:305},{x:315,pl:305,pr:345},{x:365,pl:355,pr:400},{x:412,pl:400,pr:445},{x:462,pl:450,pr:495},{x:512,pl:500,pr:545},{x:562,pl:550,pr:605},{x:618,pl:605,pr:655},{x:665,pl:655,pr:705},{x:715,pl:705,pr:755},{x:768,pl:755,pr:808},{x:822,pl:808,pr:858},{x:868,pl:858,pr:908},{x:915,pl:905,pr:955},{x:968,pl:955,pr:1005},{x:1015,pl:1005,pr:1048},{x:1058,pl:1048,pr:1095},{x:1108,pl:1095,pr:1148},{x:1158,pl:1148,pr:1190}],
    flyers: [{x:25,fy:4*TILE,pw:7},{x:80,fy:3*TILE,pw:8},{x:215,fy:4*TILE,pw:6},{x:275,fy:3*TILE,pw:8},{x:360,fy:5*TILE,pw:7},{x:420,fy:4*TILE,pw:6},{x:490,fy:3*TILE,pw:8},{x:560,fy:5*TILE,pw:7},{x:630,fy:4*TILE,pw:6},{x:700,fy:3*TILE,pw:8},{x:775,fy:5*TILE,pw:7},{x:840,fy:4*TILE,pw:6},{x:915,fy:3*TILE,pw:8},{x:975,fy:5*TILE,pw:7},{x:1045,fy:4*TILE,pw:6},{x:1115,fy:3*TILE,pw:8},{x:1165,fy:5*TILE,pw:7}],
  },
  // Level 3 — staircase theme
  {
    gaps: [{x:100,w:6},{x:210,w:7},{x:320,w:8},{x:440,w:6},{x:550,w:9},{x:670,w:7},{x:790,w:8},{x:900,w:6},{x:1020,w:9},{x:1130,w:7}],
    platforms: [{x:5,y:10,w:3,t:'brick'},{x:10,y:8,w:3,t:'brick'},{x:15,y:6,w:3,t:'brick'},{x:20,y:4,w:3,t:'qblock'},{x:25,y:2,w:3,t:'qblock'},{x:50,y:9,w:4,t:'brick'},{x:60,y:7,w:4,t:'qblock'},{x:70,y:5,w:4,t:'brick'},{x:80,y:3,w:4,t:'qblock'},{x:110,y:4,w:5,t:'brick'},{x:125,y:2,w:5,t:'qblock'},{x:145,y:6,w:5,t:'brick'},{x:165,y:8,w:5,t:'qblock'},{x:185,y:5,w:4,t:'brick'},{x:215,y:3,w:6,t:'qblock'},{x:240,y:6,w:5,t:'brick'},{x:265,y:9,w:4,t:'qblock'},{x:285,y:7,w:5,t:'brick'},{x:308,y:4,w:6,t:'qblock'},{x:330,y:2,w:7,t:'brick'},{x:360,y:5,w:5,t:'qblock'},{x:385,y:8,w:4,t:'brick'},{x:410,y:6,w:5,t:'qblock'},{x:448,y:3,w:8,t:'brick'},{x:480,y:7,w:5,t:'qblock'},{x:505,y:5,w:5,t:'brick'},{x:530,y:2,w:6,t:'qblock'},{x:560,y:4,w:7,t:'brick'},{x:595,y:8,w:5,t:'qblock'},{x:625,y:6,w:5,t:'brick'},{x:650,y:3,w:6,t:'qblock'},{x:678,y:5,w:7,t:'brick'},{x:715,y:2,w:6,t:'qblock'},{x:745,y:7,w:5,t:'brick'},{x:775,y:4,w:6,t:'qblock'},{x:800,y:2,w:8,t:'brick'},{x:835,y:6,w:5,t:'qblock'},{x:865,y:9,w:5,t:'brick'},{x:895,y:5,w:6,t:'qblock'},{x:910,y:3,w:7,t:'brick'},{x:948,y:7,w:5,t:'qblock'},{x:975,y:4,w:6,t:'brick'},{x:1000,y:2,w:7,t:'qblock'},{x:1030,y:6,w:5,t:'brick'},{x:1060,y:8,w:5,t:'qblock'},{x:1085,y:5,w:6,t:'brick'},{x:1115,y:3,w:6,t:'qblock'},{x:1140,y:6,w:7,t:'brick'},{x:1170,y:4,w:8,t:'qblock'},{x:40,y:5,w:1,t:'hblock'},{x:160,y:6,w:1,t:'hblock'},{x:305,y:5,w:1,t:'hblock'},{x:448,y:5,w:1,t:'hblock'},{x:595,y:6,w:1,t:'hblock'},{x:745,y:5,w:1,t:'hblock'},{x:895,y:6,w:1,t:'hblock'},{x:1045,y:5,w:1,t:'hblock'},{x:1165,y:5,w:1,t:'hblock'}],
    pipes: [{x:8,h:2},{x:45,h:3},{x:107,h:4},{x:170,h:2},{x:220,h:3},{x:295,h:4},{x:370,h:2},{x:445,h:3},{x:515,h:4},{x:580,h:2},{x:645,h:3},{x:720,h:4},{x:790,h:2},{x:870,h:3},{x:940,h:4},{x:1010,h:2},{x:1085,h:3},{x:1155,h:4}],
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let s=0;s<10;s++){const base=s*120+5;cl(base,base+10,10-s%3);cl(base+20,base+35,8-s%4);ca(base+55,7,5,7);cl(base+70,base+90,5+s%3);} }),
    goombas: Array.from({length:30},(_,i)=>({x:35+i*38,pl:28+i*38,pr:68+i*38})),
    flyers: Array.from({length:22},(_,i)=>({x:30+i*52,fy:(3+i%4)*TILE,pw:6+i%3})),
    snipers: [{x:120,pl:90,pr:155},{x:400,pl:365,pr:440},{x:700,pl:660,pr:740},{x:1000,pl:960,pr:1040}],
  },
  // Level 4 — platformer gauntlet (few ground sections, mostly aerial)
  {
    gaps: [{x:20,w:15},{x:55,w:12},{x:90,w:14},{x:125,w:13},{x:165,w:11},{x:200,w:15},{x:240,w:12},{x:280,w:14},{x:320,w:11},{x:360,w:15},{x:400,w:12},{x:440,w:13},{x:485,w:11},{x:525,w:14},{x:565,w:12},{x:605,w:15},{x:645,w:11},{x:685,w:14},{x:725,w:12},{x:770,w:13},{x:810,w:11},{x:850,w:15},{x:895,w:12},{x:935,w:14},{x:975,w:11},{x:1015,w:15},{x:1060,w:12},{x:1100,w:13},{x:1140,w:11}],
    platforms: [{x:5,y:10,w:14,t:'brick'},{x:38,y:7,w:14,t:'qblock'},{x:72,y:4,w:12,t:'brick'},{x:106,y:8,w:13,t:'qblock'},{x:140,y:5,w:11,t:'brick'},{x:178,y:9,w:12,t:'qblock'},{x:216,y:6,w:12,t:'brick'},{x:255,y:3,w:14,t:'qblock'},{x:295,y:8,w:11,t:'brick'},{x:335,y:5,w:13,t:'qblock'},{x:375,y:2,w:12,t:'brick'},{x:414,y:7,w:11,t:'qblock'},{x:454,y:4,w:13,t:'brick'},{x:498,y:9,w:11,t:'qblock'},{x:538,y:6,w:12,t:'brick'},{x:578,y:3,w:13,t:'qblock'},{x:618,y:8,w:11,t:'brick'},{x:658,y:5,w:13,t:'qblock'},{x:698,y:2,w:12,t:'brick'},{x:740,y:7,w:12,t:'qblock'},{x:782,y:4,w:11,t:'brick'},{x:822,y:9,w:13,t:'qblock'},{x:865,y:6,w:12,t:'brick'},{x:905,y:3,w:13,t:'qblock'},{x:945,y:8,w:11,t:'brick'},{x:986,y:5,w:13,t:'qblock'},{x:1028,y:2,w:12,t:'brick'},{x:1072,y:7,w:11,t:'qblock'},{x:1112,y:4,w:12,t:'brick'},{x:1152,y:8,w:14,t:'qblock'},{x:90,y:5,w:1,t:'hblock'},{x:255,y:4,w:1,t:'hblock'},{x:414,y:5,w:1,t:'hblock'},{x:578,y:4,w:1,t:'hblock'},{x:740,y:5,w:1,t:'hblock'},{x:905,y:4,w:1,t:'hblock'},{x:1072,y:5,w:1,t:'hblock'}],
    pipes: [{x:12,h:2},{x:50,h:4},{x:88,h:3},{x:155,h:2},{x:218,h:4},{x:290,h:3},{x:358,h:2},{x:412,h:4},{x:496,h:3},{x:576,h:2},{x:616,h:4},{x:695,h:3},{x:782,h:2},{x:860,h:4},{x:944,h:3},{x:1026,h:2},{x:1110,h:4},{x:1175,h:3}],
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<20;i++){const bx=10+i*58;ca(bx+12,6,4,7);cl(bx+20,bx+34,4+i%4);} }),
    goombas: Array.from({length:35},(_,i)=>({x:12+i*33,pl:5+i*33,pr:42+i*33})),
    flyers: Array.from({length:30},(_,i)=>({x:15+i*38,fy:(2+i%5)*TILE,pw:5+i%4})),
  },
  // Level 5 — zigzag
  {
    gaps: [{x:70,w:6},{x:180,w:7},{x:290,w:6},{x:400,w:8},{x:510,w:6},{x:620,w:7},{x:730,w:6},{x:840,w:8},{x:950,w:6},{x:1060,w:7},{x:1150,w:6}],
    platforms: Array.from({length:55},(_,i)=>({x:10+i*22,y:2+(i%2===0?8:2),w:4+i%3,t:i%2===0?'brick':'qblock'})).concat([{x:60,y:6,w:1,t:'hblock'},{x:200,y:5,w:1,t:'hblock'},{x:340,y:6,w:1,t:'hblock'},{x:480,y:5,w:1,t:'hblock'},{x:620,y:6,w:1,t:'hblock'},{x:760,y:5,w:1,t:'hblock'},{x:900,y:6,w:1,t:'hblock'},{x:1040,y:5,w:1,t:'hblock'}]),
    pipes: Array.from({length:18},(_,i)=>({x:20+i*65,h:2+i%3})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<22;i++){const bx=5+i*54;i%2===0?cl(bx,bx+18,10):ca(bx+10,5,4,6);} }),
    goombas: Array.from({length:32},(_,i)=>({x:18+i*37,pl:10+i*37,pr:50+i*37})),
    flyers: Array.from({length:25},(_,i)=>({x:22+i*46,fy:(3+i%4)*TILE,pw:5+i%3})),
  },
  // Level 6 — dense enemies, sparse platforms
  {
    gaps: [{x:90,w:5},{x:200,w:6},{x:310,w:5},{x:425,w:7},{x:540,w:5},{x:650,w:6},{x:760,w:5},{x:875,w:7},{x:990,w:5},{x:1100,w:6}],
    platforms: [{x:15,y:7,w:6,t:'qblock'},{x:55,y:4,w:5,t:'brick'},{x:100,y:3,w:7,t:'qblock'},{x:150,y:8,w:5,t:'brick'},{x:185,y:5,w:6,t:'qblock'},{x:210,y:2,w:8,t:'brick'},{x:255,y:7,w:5,t:'qblock'},{x:285,y:4,w:7,t:'brick'},{x:320,y:2,w:9,t:'qblock'},{x:370,y:6,w:5,t:'brick'},{x:400,y:9,w:5,t:'qblock'},{x:435,y:3,w:8,t:'brick'},{x:475,y:6,w:6,t:'qblock'},{x:510,y:2,w:7,t:'brick'},{x:550,y:5,w:6,t:'qblock'},{x:580,y:8,w:5,t:'brick'},{x:610,y:3,w:7,t:'qblock'},{x:658,y:6,w:6,t:'brick'},{x:690,y:2,w:8,t:'qblock'},{x:730,y:7,w:5,t:'brick'},{x:765,y:4,w:7,t:'qblock'},{x:800,y:2,w:8,t:'brick'},{x:840,y:6,w:5,t:'qblock'},{x:870,y:9,w:5,t:'brick'},{x:888,y:3,w:8,t:'qblock'},{x:930,y:7,w:5,t:'brick'},{x:960,y:4,w:7,t:'qblock'},{x:998,y:2,w:8,t:'brick'},{x:1040,y:6,w:5,t:'qblock'},{x:1070,y:9,w:5,t:'brick'},{x:1108,y:3,w:8,t:'qblock'},{x:1148,y:6,w:6,t:'brick'},{x:1175,y:4,w:8,t:'qblock'},{x:40,y:5,w:1,t:'hblock'},{x:180,y:6,w:1,t:'hblock'},{x:320,y:3,w:1,t:'hblock'},{x:465,y:5,w:1,t:'hblock'},{x:610,y:4,w:1,t:'hblock'},{x:758,y:5,w:1,t:'hblock'},{x:900,y:4,w:1,t:'hblock'},{x:1048,y:5,w:1,t:'hblock'},{x:1178,y:5,w:1,t:'hblock'}],
    pipes: Array.from({length:22},(_,i)=>({x:18+i*53,h:2+i%4})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<18;i++){cl(5+i*66,55+i*66,6+i%4);ca(42+i*66,5,4,6);} }),
    goombas: Array.from({length:48},(_,i)=>({x:10+i*25,pl:3+i*25,pr:36+i*25})),
    flyers: Array.from({length:35},(_,i)=>({x:8+i*33,fy:(2+i%5)*TILE,pw:5+i%3})),
  },
  // Level 7 — wide open with huge arcs
  {
    gaps: [{x:100,w:4},{x:250,w:5},{x:400,w:4},{x:550,w:5},{x:700,w:4},{x:850,w:5},{x:1000,w:4},{x:1100,w:5}],
    platforms: Array.from({length:40},(_,i)=>({x:8+i*30,y:2+((i*3)%9),w:5+i%4,t:i%3===0?'qblock':i%3===1?'brick':'qblock'})).concat([{x:100,y:6,w:1,t:'hblock'},{x:250,y:5,w:1,t:'hblock'},{x:400,y:6,w:1,t:'hblock'},{x:550,y:5,w:1,t:'hblock'},{x:700,y:6,w:1,t:'hblock'},{x:850,y:5,w:1,t:'hblock'},{x:1000,y:6,w:1,t:'hblock'}]),
    pipes: Array.from({length:14},(_,i)=>({x:30+i*85,h:2+i%4})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<12;i++){ca(60+i*98,4,8,11);cl(20+i*98,55+i*98,7);} }),
    goombas: Array.from({length:28},(_,i)=>({x:20+i*42,pl:12+i*42,pr:55+i*42})),
    flyers: Array.from({length:20},(_,i)=>({x:15+i*58,fy:(2+i%5)*TILE,pw:7+i%4})),
  },
  // Level 8 — vertical challenge (tall pipes, low platforms)
  {
    gaps: [{x:75,w:7},{x:175,w:8},{x:280,w:7},{x:385,w:9},{x:495,w:7},{x:600,w:8},{x:705,w:7},{x:810,w:9},{x:920,w:7},{x:1025,w:8},{x:1130,w:7}],
    platforms: Array.from({length:50},(_,i)=>({x:5+i*24,y:9+(i%3===0?0:i%3===1?-3:-6),w:3+i%4,t:i%2===0?'brick':'qblock'})).concat([{x:50,y:7,w:1,t:'hblock'},{x:170,y:6,w:1,t:'hblock'},{x:290,y:7,w:1,t:'hblock'},{x:410,y:6,w:1,t:'hblock'},{x:530,y:7,w:1,t:'hblock'},{x:650,y:6,w:1,t:'hblock'},{x:770,y:7,w:1,t:'hblock'},{x:890,y:6,w:1,t:'hblock'},{x:1010,y:7,w:1,t:'hblock'},{x:1130,y:6,w:1,t:'hblock'}]),
    pipes: Array.from({length:22},(_,i)=>({x:10+i*54,h:3+i%4})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<20;i++){cl(8+i*58,40+i*58,4+i%5);ca(30+i*58,8,4,6);} }),
    goombas: Array.from({length:38},(_,i)=>({x:14+i*31,pl:6+i*31,pr:44+i*31})),
    flyers: Array.from({length:28},(_,i)=>({x:12+i*42,fy:(2+i%5)*TILE,pw:5+i%4})),
  },
  // Level 9 — marathon (more spread out)
  {
    gaps: [{x:120,w:6},{x:280,w:7},{x:450,w:8},{x:620,w:6},{x:790,w:7},{x:960,w:8},{x:1100,w:6}],
    platforms: Array.from({length:60},(_,i)=>({x:6+i*20,y:2+(i%7),w:4+i%3,t:i%4===0?'qblock':i%4===2?'brick':i%4===3?'qblock':'brick'})).concat([{x:118,y:5,w:1,t:'hblock'},{x:278,y:6,w:1,t:'hblock'},{x:448,y:5,w:1,t:'hblock'},{x:618,y:6,w:1,t:'hblock'},{x:788,y:5,w:1,t:'hblock'},{x:958,y:6,w:1,t:'hblock'},{x:1098,y:5,w:1,t:'hblock'}]),
    pipes: Array.from({length:20},(_,i)=>({x:22+i*58,h:2+i%4})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<25;i++){i%3===0?ca(15+i*46,6,5,8):cl(5+i*46,38+i*46,5+i%4);} }),
    goombas: Array.from({length:42},(_,i)=>({x:8+i*28,pl:2+i*28,pr:36+i*28})),
    flyers: Array.from({length:32},(_,i)=>({x:10+i*36,fy:(2+i%5)*TILE,pw:5+i%4})),
  },
  // Level 10 — speed run (minimal gaps, lots of enemies)
  {
    gaps: [{x:150,w:4},{x:350,w:4},{x:550,w:4},{x:750,w:4},{x:950,w:4},{x:1100,w:4}],
    platforms: Array.from({length:65},(_,i)=>({x:4+i*18,y:3+(i*2%8),w:3+i%3,t:i%2===0?'qblock':'brick'})).concat([{x:148,y:5,w:1,t:'hblock'},{x:348,y:6,w:1,t:'hblock'},{x:548,y:5,w:1,t:'hblock'},{x:748,y:6,w:1,t:'hblock'},{x:948,y:5,w:1,t:'hblock'},{x:1098,y:6,w:1,t:'hblock'}]),
    pipes: Array.from({length:18},(_,i)=>({x:15+i*66,h:2+i%3})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<30;i++){cl(3+i*39,28+i*39,8);} }),
    goombas: Array.from({length:55},(_,i)=>({x:6+i*22,pl:0+i*22,pr:28+i*22})),
    flyers: Array.from({length:40},(_,i)=>({x:5+i*29,fy:(2+i%5)*TILE,pw:5+i%3})),
  },
  // Level 11 — boss gauntlet (max enemies, tight platforms)
  {
    gaps: [{x:80,w:8},{x:200,w:9},{x:340,w:8},{x:480,w:10},{x:620,w:8},{x:760,w:9},{x:900,w:8},{x:1040,w:10},{x:1150,w:8}],
    platforms: Array.from({length:55},(_,i)=>({x:5+i*22,y:2+(i%9),w:4+i%4,t:i%3===0?'qblock':i%3===1?'brick':'qblock'})).concat([{x:78,y:5,w:1,t:'hblock'},{x:198,y:6,w:1,t:'hblock'},{x:338,y:5,w:1,t:'hblock'},{x:478,y:6,w:1,t:'hblock'},{x:618,y:5,w:1,t:'hblock'},{x:758,y:6,w:1,t:'hblock'},{x:898,y:5,w:1,t:'hblock'},{x:1038,y:6,w:1,t:'hblock'},{x:1148,y:5,w:1,t:'hblock'}]),
    pipes: Array.from({length:25},(_,i)=>({x:10+i*46,h:3+i%4})),
    coinDefs: makeCoinDefs((cl,ca)=>{ for(let i=0;i<30;i++){ca(15+i*39,5,5,8);cl(5+i*39,30+i*39,6);} }),
    goombas: Array.from({length:60},(_,i)=>({x:8+i*20,pl:2+i*20,pr:28+i*20})),
    flyers: Array.from({length:45},(_,i)=>({x:6+i*26,fy:(2+i%5)*TILE,pw:5+i%3})),
  },
  // Level 12 — BOSS
  // Level 12 — BOSS: LEVIATHAN
  {
    isBossLevel: true,
    bossType: 'leviathan',
    gaps: [],
    platforms: [
      {x:8,y:9,w:12,t:'brick'}, {x:25,y:6,w:8,t:'qblock'}, {x:38,y:3,w:6,t:'brick'},
      {x:52,y:7,w:7,t:'brick'}, {x:65,y:4,w:6,t:'qblock'}, {x:78,y:2,w:5,t:'brick'},
      {x:90,y:8,w:8,t:'qblock'}, {x:105,y:5,w:7,t:'brick'}, {x:118,y:2,w:6,t:'qblock'},
      {x:20,y:9,w:1,t:'hblock'},{x:60,y:5,w:1,t:'hblock'},{x:100,y:3,w:1,t:'hblock'},
    ],
    pipes: [],
    coinDefs: [],
    goombas: [],
    flyers: [],
  },
  // Level 13 — BOSS: ABYSSAL WRAITH
  {
    isBossLevel: true,
    bossType: 'wraith',
    gaps: [],
    platforms: [
      // Open arena — wide spaced platforms forcing aerial movement
      {x:5,y:10,w:8,t:'brick'},  {x:18,y:7,w:5,t:'brick'},  {x:30,y:4,w:5,t:'qblock'},
      {x:44,y:8,w:5,t:'brick'},  {x:56,y:5,w:5,t:'qblock'}, {x:68,y:2,w:5,t:'brick'},
      {x:80,y:7,w:5,t:'brick'},  {x:92,y:4,w:5,t:'qblock'}, {x:104,y:8,w:5,t:'brick'},
      {x:116,y:5,w:5,t:'qblock'},{x:128,y:2,w:5,t:'brick'},
      {x:15,y:8,w:1,t:'hblock'},{x:55,y:4,w:1,t:'hblock'},{x:95,y:3,w:1,t:'hblock'},{x:120,y:4,w:1,t:'hblock'},
    ],
    pipes: [],
    coinDefs: [],
    goombas: [],
    flyers: [],
  },
  // Level 14 — BOSS: THE WARDEN
  {
    isBossLevel: true,
    bossType: 'warden',
    gaps: [],
    platforms: [],
    pipes: [],
    coinDefs: [],
    goombas: [],
    flyers: [],
  },
  // Level 15 — ENEMY TEST ROOM
  {
    isTestLevel: true,
    gaps: [],
    platforms: [],
    pipes: [],
    coinDefs: [],
    goombas: [],
    flyers: [],
    // Trigger zone: walking past tile 12 spawns the chaser
    chaserTriggerX: 12 * TILE,
    chaserExitX: 200 * TILE,
  },
  // Level 16 — LOOP THE LOOP
  {
    isLoopLevel: true,
    gaps: [],
    // Loop center at tile (30, groundY-6), radius 6 tiles
    loopCenterTX: 30, loopCenterTY: 6, loopRadiusTiles: 6,
    platforms: (function() {
      const cx = 30, cy = 6, R = 6, segs = 48;
      const seen = new Set();
      const out = [];
      // Approach ground from left
      for (let tx = 2; tx < cx - R; tx++) {
        out.push({ x: tx, y: groundY, w: 1, t: 'loop' });
      }
      // Loop circle tiles
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2;
        const tx = Math.round(cx + R * Math.cos(angle));
        const ty = Math.round(cy + R * Math.sin(angle));
        const key = tx + '_' + ty;
        if (!seen.has(key)) { seen.add(key); out.push({ x: tx, y: ty, w: 1, t: 'loop' }); }
      }
      // Exit ground to the right
      for (let tx = cx + R; tx <= cx + R + 30; tx++) {
        out.push({ x: tx, y: groundY, w: 1, t: 'loop' });
      }
      return out;
    })(),
    pipes: [],
    coinDefs: [],
    goombas: [],
    flyers: [],
  },
];

let currentLevel = parseInt(localStorage.getItem('axo_level') || '1');

function groundInGap(tx) {
  return LEVELS[currentLevel].gaps.some(g => tx >= g.x && tx < g.x + g.w);
}

const FLAG_X = 320; // end of level 1


// ── Level complete cinematic ─────────────────────────────────────────────────
const lvlComplete = {
  active: false,
  timer: 0,       // counts up in frames
  zoomStart: 1,   // zoom at start of cinematic
  camXStart: 0,
};
const LVC_FADE_IN   = 60;   // 0–60: black fades in
const LVC_ZOOM      = 90;   // 60–150: camera zooms in on player
const LVC_TEXT      = 50;   // 150–200: "LEVEL COMPLETE" fades in
const LVC_HOLD      = 60;   // 200–260: hold
const LVC_RUN       = 80;   // 260–340: player runs off right
const LVC_TOTAL     = LVC_FADE_IN + LVC_ZOOM + LVC_TEXT + LVC_HOLD + LVC_RUN;

// ── State ────────────────────────────────────────────────────────────────────
let score = 0, coinCount = 0, dead = false, won = false;
let comboCount = 0, comboTimer = 0;
let maxCombo = 0, killCount = 0, deathCount = 0;
let wonScreenTimer = 0; // frames since won, used to animate score card in
let chaserCleared = false; // survives death, reset on manual level reload

// ── Achievements ─────────────────────────────────────────────────────────────
const achievements = {
  earned: new Set(JSON.parse(localStorage.getItem('axo_achievements') || '[]')),
  toasts: [],  // { id, label, desc, timer }
};
const ACHIEVEMENT_DEFS = {
  combo4:    { label: 'DEATH FROM ABOVE', desc: '4-kill chain without frenzy' },
  frenzy10:  { label: 'ABSOLUTE FRENZY',  desc: '10-kill chain in frenzy mode' },
};
function triggerAchievement(id) {
  if (achievements.earned.has(id)) return;
  achievements.earned.add(id);
  localStorage.setItem('axo_achievements', JSON.stringify([...achievements.earned]));
  const def = ACHIEVEMENT_DEFS[id];
  achievements.toasts.push({ id, label: def.label, desc: def.desc, timer: 240 });
}
function checkComboAchievements() {
  if (comboCount > maxCombo) maxCombo = comboCount;
  if (player.frenzyTimer > 0) {
    if (comboCount >= 10) triggerAchievement('frenzy10');
  } else {
    if (comboCount >= 4) triggerAchievement('combo4');
  }
}
const MAX_HP = 3;
let hp = MAX_HP;
let medPacks = 0;
const MAX_MED_PACKS = 9;
let medPackDrops = [];

const player = {
  x: 48, y: (groundY - 1) * TILE - 44,
  vx: 0, vy: 0,
  w: 44, h: 44,
  onGround: false,
  lastLandTime: 0,
  spinAngle: 0,
  spinning: false,
  homing: false,
  homingTarget: null,
  homingAvail: 0,
  homingBonus: 0,
  ballForm: false,
  ballExitFlash: 0,   // counts down from BALL_EXIT_FLASH_FRAMES on exit
  dashingUp: false,
  dashingDown: false,
  slamFreezeTimer: 0,
  slamUsed: false,
  knockbackTimer: 0,
  dashAvail: 1,
  maxDashes: 1,
  dashFrames: 0,    // frames remaining in active dash
  invincible: 0,
  dir: 1,
  dead: false,
  wonSlide: false,
  onLoop: false,
  loopAngle: Math.PI / 2,
  loopSpeed: 0,
};

let camera  = 0;
let cameraY = 0;
let screenShake = 0; // frames remaining
let chaserWallBubble = false;

let coins      = [];
let coinPopups = []; // { x, y, timer, text }
let goombas = [];
let flyers  = [];
let heartPickups = [];
let levelAmulets = [];
let powerBoxes   = [];   // frenzy power-up crates
let projectiles  = [];   // { x, y, vx, vy, life, flying }
let blockHit = {};
let blocksBroken = 0;

// ── Solids ────────────────────────────────────────────────────────────────────
function buildSolids() {
  const lv = LEVELS[currentLevel];
  // Strip all platforms above tile row 5 — no high blocks anywhere (loop tiles exempt)
  lv.platforms = lv.platforms.filter(p => p.y >= 5 || p.t === 'hblock' || p.t === 'loop');
  const solids = [];
  for (let tx = 0; tx < LEVEL_W_TILES; tx++) {
    if (groundInGap(tx)) continue;
    for (let ty = groundY; ty <= groundY + 2; ty++)
      solids.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE, type: 'ground', tx, ty });
  }
  for (const p of lv.platforms) {
    for (let i = 0; i < p.w; i++) {
      const tx = p.x + i, key = `${tx}_${p.y}`;
      solids.push({ x: tx * TILE, y: p.y * TILE, w: TILE, h: TILE, type: p.t, tx, ty: p.y, key });
    }
  }
  for (const pipe of lv.pipes) {
    for (let j = 0; j < pipe.h; j++) {
      const ty = groundY - j;
      const pkey = `pipe_${pipe.x}_${ty}`;
      solids.push({ x: pipe.x * TILE, y: ty * TILE, w: TILE * 2, h: TILE, type: j === 0 ? 'pipetop' : 'pipe', tx: pipe.x, ty, key: pkey });
    }
  }

  // Chaser encounter wall — full-height barrier before chaser zone
  if (lv.hasChaserEncounter) {
    const wallX = lv.chaserTriggerX - TILE;
    for (let ty = 0; ty < groundY + 1; ty++) {
      solids.push({ x: wallX, y: ty * TILE, w: TILE, h: TILE, type: 'chaserwall', key: null });
    }
  }

  return solids;
}
let solids = buildSolids();

function getSolidsNear(px, py, pw, ph) {
  return solids.filter(s => s.x < px + pw + 96 && s.x + s.w > px - 96 && s.y < py + ph + 96 && s.y + s.h > py - 96);
}

// ── Chaser (test enemy) — defined here so initLevel can reset it ──────────────
const CHASER_R = 15;
const chaser = {
  active: false, triggered: false, descending: false,
  dead: false, deadTimer: 0,
  x: 0, y: 0, vx: 0, vy: 0,
  w: CHASER_R * 2, h: CHASER_R * 2,
  hp: 3, maxHp: 3, hitFlash: 0, wobble: 0,
  targetOffX: 75, targetOffY: -160,
  // attack state machine
  state: 'hover',   // hover | aiming | telegraph | cooldown
  stateTimer: 0,
  laserAngle: 0,    // current laser aim angle
  bolt: null,       // active fire bolt {x,y,vx,vy,life}
};

function loadLevel(n, keepProgress) {
  if (!keepProgress) chaserCleared = false;
  currentLevel = ((n % LEVELS.length) + LEVELS.length) % LEVELS.length;
  localStorage.setItem('axo_level', currentLevel);
  const lv = LEVELS[currentLevel];
  if (typeof playTrack === 'function') playTrack(levelMusic?.[currentLevel] ?? null);

  solids = buildSolids();
  blockHit = {};
  blocksBroken = 0;


  coins = lv.coinDefs.map((c, i) => ({ id: i, x: c.x * TILE, y: c.y * TILE, collected: false, bobTimer: Math.random() * Math.PI * 2 }));
  // Every 3rd enemy in level 2+ is a 'shocker'
  const lvl = n; // 0-indexed
  // Triangle formation per goomba def: left gnome, right gnome, small bat above middle
  const groundFloorY2 = groundY * TILE - TILE;
  goombas = lv.goombas.flatMap((g, i) => {
    const isShooter = !!g.shooter;
    const type = isShooter ? 'shooter' : 'normal';
    const base = { dead: false, deadTimer: 0, w: TILE, h: TILE, frame: 0, flying: false, hp: 2, hitFlash: 0, type, shockStun: 0, red: isShooter, shootCooldown: 0 };
    const midTile = Math.round((g.pl + g.pr) / 2);
    const zoneHasGap = (tl, tr) => { for (let t = tl; t < tr; t++) if (groundInGap(t)) return true; return false; };
    const result = [];
    if (!zoneHasGap(g.pl, midTile)) {
      const e1 = { ...base, id: i * 2,     x: (g.pl + 2) * TILE, y: groundFloorY2, vx: -0.7, pl: g.pl * TILE, pr: midTile * TILE };
      e1.spawnX = e1.x; e1.spawnY = e1.y; e1.spawnVx = e1.vx; e1.spawnPl = e1.pl; e1.spawnPr = e1.pr;
      result.push(e1);
    }
    if (!zoneHasGap(midTile, g.pr)) {
      const e2 = { ...base, id: i * 2 + 1, x: (midTile + 2) * TILE, y: groundFloorY2, vx:  0.7, pl: midTile * TILE, pr: g.pr * TILE };
      e2.spawnX = e2.x; e2.spawnY = e2.y; e2.spawnVx = e2.vx; e2.spawnPl = e2.pl; e2.spawnPr = e2.pr;
      result.push(e2);
    }
    return result;
  });

  // Small bat above each gnome triangle, plus large red bats from lv.flyers
  const makeFlyerObj = (f, id, isSmall) => {
    const sz = isSmall ? Math.round(TILE * 0.85) : Math.round(TILE * 1.35);
    const safeY = isSmall ? (groundY - 5) * TILE : Math.max(f.fy, 5 * TILE);
    const fly = { id, x: f.x * TILE, baseY: safeY, y: safeY, vx: isSmall ? 0.9 : 1.2,
      w: sz, h: sz, dead: false, deadTimer: 0,
      pl: f.x * TILE, pr: (f.x + f.pw) * TILE,
      frame: 0, flying: true, wobble: Math.random() * Math.PI * 2,
      hitFlash: 0, type: 'normal', shockStun: 0,
      red: !isSmall, shootCooldown: 0, lockFlash: 0 };
    fly.hp = enemyMaxHp(fly);
    fly.spawnX = fly.x; fly.spawnY = safeY; fly.spawnVx = fly.vx;
    fly.spawnPl = fly.pl; fly.spawnPr = fly.pr;
    return fly;
  };
  let flyId = 1000;
  flyers = lv.flyers.map(f => makeFlyerObj(f, flyId++, false));
  lv.goombas.forEach((g) => {
    const midTile = Math.round((g.pl + g.pr) / 2);
    const pw = g.pr - g.pl;
    flyers.push(makeFlyerObj({ x: midTile - Math.floor(pw / 2), fy: 0, pw }, flyId++, true));
  });
  heartPickups = [];
  medPackDrops = [];
  projectiles  = [];
  powerBoxes   = [];
  levelAmulets = (lv.amulets || []).map(a => ({ ...a, collected: false, bobTimer: 0 }));
  coinPopups = [];

  // Snipers (level 3 only)
  initSnipers(lv.snipers || []);
  // Shooter bats — disabled
  initShooterBats([]);
  // Place fixed chests — one just after the eye boss in level 1
  chests = [];
  if (currentLevel === 1) {
    chests.push({ x: (lv.chaserExitX / TILE + 4) * TILE, y: groundY * TILE - TILE, w: TILE, h: TILE, collected: false, bobTimer: 0, dead: false, deadTimer: 0 });
  }

  // Boss setup
  boss.active = false;
  wraith.active = false;
  warden.active = false;
  if (lv.isBossLevel && lv.bossType === 'leviathan') {
    Object.assign(boss, {
      active: true, dead: false, deadTimer: 0,
      hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP,
      phase: 1, state: 'idle', stateTimer: 90,
      x: 60 * TILE, y: 4 * TILE, vx: 0, vy: 0, dir: -1,
      hitFlash: 0, lockFlash: 0, shakeX: 0, eyePulse: 0,
      orbs: [], orbCooldown: 0, ringCooldown: 0,
      teleportAlpha: 1, teleportTarget: { x: 0, y: 0 }, chargeSpeed: 0,
    });
  } else if (lv.isBossLevel && lv.bossType === 'wraith') {
    Object.assign(wraith, {
      active: true, dead: false, deadTimer: 0,
      hp: WRAITH_MAX_HP, maxHp: WRAITH_MAX_HP,
      phase: 1, state: 'idle', stateTimer: 120,
      x: 70 * TILE, y: 3 * TILE, vx: 0, vy: 0, dir: -1,
      hitFlash: 0, lockFlash: 0, shakeX: 0, eyePulse: 0, invulTimer: 0,
      dashWalls: [], gravZones: [], clones: [], shockwaves: [], tentacles: [],
      telegraphTimer: 0, telegraphType: '',
      surgeCount: 0, surgePhase: 'none', surgeLockX: 0,
    });
  } else if (lv.isBossLevel && lv.bossType === 'warden') {
    Object.assign(warden, {
      active: true, dead: false, deadTimer: 0,
      hp: WARDEN_MAX_HP, maxHp: WARDEN_MAX_HP,
      phase: 1, state: 'idle', stateTimer: 90,
      x: 70 * TILE, y: WARDEN_HOVER - 72, vx: 0, vy: 0, dir: -1,
      hitFlash: 0, lockFlash: 0, shakeX: 0, eyePulse: 0, invulTimer: 0,
      onGround: true, shockwaves: [], rocks: [],
      vulnTimer: 0, homingCooldown: 0, homingHits: 0, chargeWobble: 0, stompCount: 0,
    });
    // Spawn 3 red sentinel bats at random x positions in the arena
    const arenaW = WARDEN_ARENA_R - WARDEN_ARENA_X;
    warden.sentinels = [0.2, 0.5, 0.8].map((frac, i) => ({
      id: 9000 + i,
      x: WARDEN_ARENA_X + arenaW * frac + (Math.random() - 0.5) * 80,
      y: (groundY - 5) * TILE,
      baseY: (groundY - 5) * TILE,
      w: TILE, h: TILE,
      vx: (i % 2 === 0 ? 1 : -1) * 1.5,
      wobble: Math.random() * Math.PI * 2,
      dead: false, deadTimer: 0,
      hp: 1, maxHp: 1, hitFlash: 0,
      flying: true, type: 'sentinel',
      pl: WARDEN_ARENA_X, pr: WARDEN_ARENA_R,
    }));
  }

  // reset player — chaser/boss levels spawn near the action, not level start
  const spawnX = lv.isBossLevel
    ? (lv.bossType === 'leviathan' ? TILE * 13 : TILE * 8)
    : (lv.chaserExitX != null && chaserCleared)
    ? lv.chaserExitX
    : TILE * 3;
  Object.assign(player, {
    x: spawnX, y: (groundY - 1) * TILE - player.h,
    vx: 0, vy: 0,
    onGround: false, jumping: false,
    homing: false, homingTarget: null, homingAvail: 0, homingBonus: 0,
    ballForm: false, ballExitFlash: 0, spinning: false,
    dashFrames: 0, dashAvail: player.maxDashes,
    invincible: 0, dead: false, wonSlide: false,
    dir: 1,
  });
  camera = (lv.isBossLevel || lv.chaserTriggerX != null) ? Math.max(0, spawnX - W / 3) : 0; cameraY = 0;
  comboCount = 0; comboTimer = 0;
  maxCombo = 0; killCount = 0; wonScreenTimer = 0;
  if (!keepProgress) deathCount = 0;
  won = false; dead = false;
  player.onLoop = false; player.loopAngle = Math.PI / 2; player.loopSpeed = 0;
  score = 0; coinCount = 0;
  lvlComplete.active = false; lvlComplete.timer = 0;
  redBat.active = false; redBat.dead = false; redBat.hp = RB_MAX_HP;
  redBat.hitFlash = 0; redBat.phase2 = false; redBat.state = 'idle'; redBat.stateTimer = 0;
  // Reset chaser — mark dead/triggered if player spawns past the exit point
  const chaserPrecleared = lv.chaserExitX != null && spawnX >= lv.chaserExitX;
  chaser.active = false; chaser.triggered = chaserPrecleared; chaser.dead = chaserPrecleared;
  chaser.hp = chaserPrecleared ? 0 : chaser.maxHp; chaser.hitFlash = 0;
  chaser.x = 30 * TILE; chaser.y = -6 * TILE; chaser.vx = 0; chaser.vy = 0;
  chaser.state = 'hover'; chaser.stateTimer = 180; chaser.bolt = null; chaser.wobble = 0;
  // Spawn red bat mini-boss for level 1 only
  if (currentLevel === 1) {
    const rbX = 480 * TILE;
    const rbY = (groundY - 5) * TILE;
    redBat.active = true;
    redBat.x = rbX; redBat.y = rbY;
    redBat.baseX = rbX; redBat.baseY = rbY;
    redBat.wobble = 0;
  }

  const sel = document.getElementById('level-btn');
  if (sel) sel.value = currentLevel;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── HUD elements ─────────────────────────────────────────────────────────────
const jumpEl  = document.getElementById('jumpstate');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');

function jumpLabel() {
  if (player.wonSlide)  return '★ YOU WIN ★';
  if (player.dead)      return '✕ DEAD ✕';
  if (player.homing)    return '>> HOMING! <<';
  if (player.onGround)  return '— READY —';
  if (!player.onGround) return 'SPACE: HOMING';
  return '— READY —';
}

function updateHUD() {
  scoreEl.textContent = String(score).padStart(6, '0');
  coinsEl.textContent = String(coinCount).padStart(2, '0');
  jumpEl.textContent  = jumpLabel();
}

// ── Particles ────────────────────────────────────────────────────────────────
const coinParticles = [];
const dustParticles = [];
const trailParticles = [];
const spindashParticles = [];
const explosionParticles = [];

function spawnCoinPop(x, y) {
  coinParticles.push({ x, y, vy: -6, life: 40, maxLife: 40 });
  coinCount++;
  coinsEl.textContent = String(coinCount).padStart(2, '0');
}

function spawnDust(x, y, count = 6) {
  for (let i = 0; i < count; i++) {
    dustParticles.push({
      x: x + (Math.random() - 0.5) * 24,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: -(Math.random() * 2 + 0.3),
      r: Math.random() * 5 + 3,
      life: 20 + Math.floor(Math.random() * 14),
      maxLife: 34,
    });
  }
}

function spawnTrail(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const spd = Math.random() * 3 + 1;
  const life = 8 + Math.floor(Math.random() * 6);
  trailParticles.push({
    x, y,
    vx: Math.cos(angle) * spd,
    vy: Math.sin(angle) * spd,
    r: Math.random() * 2.5 + 1,
    life, maxLife: life,
    hue: 0, // white
  });
}

function spawnDashTrail(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const spd = Math.random() * 5 + 2;
  const life = 7 + Math.floor(Math.random() * 5);
  trailParticles.push({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    vx: Math.cos(angle) * spd,
    vy: Math.sin(angle) * spd,
    r: Math.random() * 3 + 1.5,
    life, maxLife: life,
    bright: true,
    hue: 0,
  });
}


function spawnShockerBurst(g) {
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
  const count = 8;
  for (let a = 0; a < count; a++) {
    const ang = (a / count) * Math.PI * 2;
    projectiles.push({ x: cx, y: cy, vx: Math.cos(ang) * 3.2, vy: Math.sin(ang) * 3.2, life: 80, flying: g.flying });
  }
  playSound('laser', 0.35);
  g.shockStun = 40; // freeze for ~2/3 sec
}

function enemyMaxHp(g) {
  if (!g.flying) return 2;       // gnomes
  if (!g.red)   return 2;        // small bats
  return 3;                      // large red bats
}

function damageEnemy(g, dmg) {
  if (g.dead) return false;
  g.hp -= dmg;
  if (g.hp <= 0) {
    g.dead = true; g.deadTimer = 40;
    killCount++;
    score += g.flying ? 200 : 100; updateHUD();
    spawnExplosion(g.x + g.w / 2, g.y + g.h / 2, g.flying);
    playSound('dies', 0.7);
    if (medPacks < MAX_MED_PACKS && Math.random() < 1/30) {
      medPackDrops.push({ x: g.x + g.w / 2 - 10, y: g.y, vy: -5, collected: false });
    }
    if (!player.onGround) {
      player.dashAvail = Math.min(player.maxDashes, player.dashAvail + 1);
    }
    return true; // killed
  }
  // Shocker: emit a ring burst every time it's hit
  if (g.type === 'shocker') spawnShockerBurst(g);
  g.hitFlash = 18;
  playSound('hit', 0.6);
  // Knockback away from player, face toward player
  if (!g.flying) {
    const toPlayer = (player.x + player.w / 2) - (g.x + g.w / 2);
    const dir = toPlayer < 0 ? -1 : 1; // dir away from player
    g.lastDir = dir; // face the direction of knockback while airborne
    g.vx = dir * 5;
    g.vy = -4;
    g.knockbackTimer = 20;
  }
  return false; // hurt but alive
}

function spawnWhiteExplosion(x, y) {
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i / 24) + Math.random() * 0.3;
    const speed = 2.5 + Math.random() * 5;
    explosionParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      r: 2 + Math.random() * 5,
      life: 28 + Math.floor(Math.random() * 22),
      maxLife: 50,
      white: true, opaque: true,
    });
  }
  explosionParticles.push({ x, y, vx:0, vy:0, r:18, life:6, maxLife:6, white:true, opaque:true, flash:true });
}

function spawnExplosion(x, y, flying) {
  const hue = flying ? 280 : 140;
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i / 24) + Math.random() * 0.3;
    const speed = 2.5 + Math.random() * 5;
    explosionParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      r: 2 + Math.random() * 5,
      life: 28 + Math.floor(Math.random() * 22),
      maxLife: 50,
      hue: hue + (Math.random() - 0.5) * 40,
    });
  }
  // bright flash blob
  explosionParticles.push({ x, y, vx:0, vy:0, r:18, life:6, maxLife:6, hue: flying?300:60, flash:true });
}

function updateHPBar() {
  const wrap = document.getElementById('hp-wrap');
  wrap.innerHTML = '';
  for (let i = 0; i < MAX_HP; i++) {
    const s = document.createElement('span');
    s.className = 'hrt' + (i < hp ? '' : ' empty');
    s.textContent = '❤';
    wrap.appendChild(s);
  }
}

function updateMedPackHUD() {
  const el = document.getElementById('medpack-hud');
  if (!el) return;
  el.textContent = medPacks > 0 ? `[Y] ×${medPacks}` : '';
}

function spawnSpindash(x, y, dir) {
  for (let i = 0; i < 3; i++) {
    spindashParticles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: -dir * (Math.random() * 4 + 2),
      vy: (Math.random() - 0.5) * 2,
      r: Math.random() * 4 + 2,
      life: 16 + Math.floor(Math.random() * 10),
      maxLife: 26,
    });
  }
}

// ── Physics ───────────────────────────────────────────────────────────────────
const HOMING_RANGE = 340; // px — reasonable lock-on range
const HOMING_SPEED = 14;

let prevJumpKey = false;
let prevUpKey   = false;
let prevEKey = false;
let prevDownKey = false;
let prevYKey = false;
let prevRKey = false;

