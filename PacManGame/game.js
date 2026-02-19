// Pac-Man simplified clone
// Grid: 28x31, tile size 20 (canvas 560x620)
'use strict';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE = 20;
const COLS = 28;
const ROWS = 31;

let scoreEl = document.getElementById('score');
let livesEl = document.getElementById('lives');
let levelEl = document.getElementById('level');
let gameOverEl = document.getElementById('gameOver');
let finalScoreEl = document.getElementById('finalScore');

// Build simple map: 0=wall, 1=pellet, 2=empty, 3=power pellet
let map = [];
for (let r = 0; r < ROWS; r++) {
  let row = [];
  for (let c = 0; c < COLS; c++) {
    // outer walls
    if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) row.push(0);
    // small central house
    else if (r >= 13 && r <= 17 && c >= 11 && c <= 16) {
      // opening
      if (r === 15 && (c === 13 || c === 14)) row.push(2);
      else row.push(0);
    } else if ((r === 2 && (c === 2 || c === COLS - 3)) || (r === ROWS - 3 && (c === 2 || c === COLS - 3))) row.push(3);
    else row.push(1);
  }
  map.push(row);
}

function tileAt(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 0;
  return map[row][col];
}
function setTile(col, row, val) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
  map[row][col] = val;
}
function pixelsToTile(x) { return Math.floor(x / TILE); }

const playerStart = { col: 14, row: 23 };
const ghostStart = [ {col:13,row:12}, {col:14,row:12}, {col:15,row:12} ];

let player = { x: playerStart.col * TILE + TILE/2, y: playerStart.row * TILE + TILE/2, dir: {x:0,y:0}, nextDir: {x:0,y:0}, speed: 3.0, radius: TILE/2 - 2, hasMovedYet: false };
// Give ghosts initial directions so they start moving
const _initialGhostDirs = [ {x:1,y:0}, {x:-1,y:0}, {x:0,y:1} ];
let ghosts = ghostStart.map((p,i) => ({ x: p.col*TILE + TILE/2, y: p.row*TILE + TILE/2, col:p.col, row:p.row, dir:{x:0,y:0}, speed: 1.0 + i*0.1, color: ['#ff3b3b','#00bfff','#ffb86b'][i], frightened: false }));

let score = 0;
let lives = 3;
let level = 1;
let pelletsLeft = 0;
let gameRunning = true;

function resetPelletsAndCount() {
  pelletsLeft = 0;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (map[r][c] === 1 || map[r][c] === 3) pelletsLeft++;
}
resetPelletsAndCount();

function updateHUD(){
  scoreEl.textContent = 'Score: ' + score;
  livesEl.textContent = 'Lives: ' + '🍒'.repeat(Math.max(0, lives));
  levelEl.textContent = 'Level: ' + level;
}
updateHUD();

function isWallAtColRow(col,row){
  return tileAt(col,row) === 0;
}
function tryChangeDirection(ent, nextDir){
  const col = pixelsToTile(ent.x);
  const row = pixelsToTile(ent.y);
  const targetCol = col + nextDir.x;
  const targetRow = row + nextDir.y;
  if (!isWallAtColRow(targetCol, targetRow)) {
    ent.dir = { ...nextDir };
    return true;
  }
  return false;
}

const keyMap = {
  'arrowup': {x:0,y:-1}, 'arrowdown': {x:0,y:1}, 'arrowleft': {x:-1,y:0}, 'arrowright': {x:1,y:0},
  'w': {x:0,y:-1}, 's': {x:0,y:1}, 'a': {x:-1,y:0}, 'd': {x:1,y:0},
};
window.addEventListener('keydown', e => {
  const key = (e.key || '').toLowerCase();
  const dir = keyMap[key];
  if (dir) {
    player.nextDir = dir;
    player.hasMovedYet = true;
    tryChangeDirection(player, dir);
    e.preventDefault();
  }
});

function update(dt) {
  if (!gameRunning) return;

  const centerTolerance = 6;
  const col = pixelsToTile(player.x);
  const row = pixelsToTile(player.y);
  const centerX = col*TILE + TILE/2;
  const centerY = row*TILE + TILE/2;

  // When snapped to grid, allow direction changes
  if (Math.abs(player.x - centerX) < centerTolerance && Math.abs(player.y - centerY) < centerTolerance) {
    player.x = centerX; player.y = centerY;
    tryChangeDirection(player, player.nextDir);
  }

  // Always move in current direction
  player.x += player.dir.x * player.speed;
  player.y += player.dir.y * player.speed;

  const pCol = pixelsToTile(player.x);
  const pRow = pixelsToTile(player.y);
  const tile = tileAt(pCol,pRow);
  // DEBUG: show what tile the player is over
  // (remove logs when resolved)
  // console.log('player on tile', pCol, pRow, 'tile', tile);
  if (tile === 1) {
    setTile(pCol,pRow,2);
    score += 10;
    pelletsLeft--;
    updateHUD();
  } else if (tile === 3) {
    setTile(pCol,pRow,2);
    score += 50;
    pelletsLeft--;
    ghosts.forEach(g => g.frightened = true);
    setTimeout(()=> ghosts.forEach(g => g.frightened = false), 8000);
    updateHUD();
  }

  ghosts.forEach(g => {
    const gCol = pixelsToTile(g.x);
    const gRow = pixelsToTile(g.y);
    const centerGX = gCol*TILE + TILE/2;
    const centerGY = gRow*TILE + TILE/2;
    
    // Only move ghosts if player has started moving
    if (!player.hasMovedYet) return;
    
    // When centered on a tile, pick a direction toward the player
    if (Math.abs(g.x - centerGX) < 3 && Math.abs(g.y - centerGY) < 3) {
      g.x = centerGX; g.y = centerGY;
      // Find all adjacent non-wall tiles
      const opts = [];
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(d => { if (tileAt(gCol+d[0], gRow+d[1]) !== 0) opts.push({x:d[0],y:d[1]}); });
      
      if (opts.length) {
        // Sort by distance to player - chase the player!
        opts.sort((a,b) => {
          const distToPlayer_a = Math.hypot((gCol+a.x)-pixelsToTile(player.x), (gRow+a.y)-pixelsToTile(player.y));
          const distToPlayer_b = Math.hypot((gCol+b.x)-pixelsToTile(player.x), (gRow+b.y)-pixelsToTile(player.y));
          return distToPlayer_a - distToPlayer_b;
        });
        g.dir = opts[0];
      }
    }
    g.x += g.dir.x * g.speed; g.y += g.dir.y * g.speed;
  });

  ghosts.forEach(g => {
    const dist = Math.hypot(g.x - player.x, g.y - player.y);
    if (dist < TILE/1.5) {
      if (g.frightened) {
        score += 200; updateHUD();
        g.x = g.col*TILE + TILE/2; g.y = g.row*TILE + TILE/2; g.dir = {x:0,y:0}; g.frightened = false;
      } else {
        loseLife();
      }
    }
  });

  if (pelletsLeft <= 0) levelUp();
}

function loseLife(){
  lives -= 1;
  if (lives <= 0) gameOver();
  else {
    player.x = playerStart.col*TILE + TILE/2; player.y = playerStart.row*TILE + TILE/2; player.dir = {x:0,y:0}; player.nextDir = {x:0,y:0};
    ghosts.forEach((g,i)=>{g.x = ghostStart[i].col*TILE + TILE/2; g.y = ghostStart[i].row*TILE + TILE/2; g.dir={x:0,y:0}; g.frightened=false;});
    updateHUD();
  }
}
function levelUp(){
  level += 1;
  for (let r=1;r<ROWS-1;r++) for (let c=1;c<COLS-1;c++) if (map[r][c] === 2) map[r][c] = 1;
  player.speed += 0.15; ghosts.forEach(g=> g.speed += 0.08);
  resetPelletsAndCount(); updateHUD();
}
function gameOver(){
  gameRunning = false;
  finalScoreEl.textContent = 'Final Score: ' + score;
  gameOverEl.classList.remove('hidden');
}

let mouthAngle = 0;
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    const t = map[r][c];
    const x = c*TILE; const y = r*TILE;
    if (t === 0) {
      ctx.fillStyle = '#001f3f'; ctx.fillRect(x,y,TILE,TILE);
      ctx.fillStyle = '#05386b'; ctx.fillRect(x+4,y+4,TILE-8,TILE-8);
    } else if (t === 1) {
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x+TILE/2, y+TILE/2, 3, 0, Math.PI*2); ctx.fill();
    } else if (t === 3) {
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x+TILE/2, y+TILE/2, 6, 0, Math.PI*2); ctx.fill();
    }
  }

  mouthAngle += 0.18;
  const ma = Math.abs(Math.sin(mouthAngle)) * 0.45;
  const angle = Math.atan2(player.dir.y||0, player.dir.x||1);

  // Draw full yellow body
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
  ctx.fill();

  // Cut out mouth (transparent) so the mouth shows the background
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, player.radius + 1, angle - ma, angle + ma, false);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Draw eye
  const eyeAngle = angle - 0.6;
  const ex = player.x + Math.cos(eyeAngle) * (player.radius * 0.5);
  const ey = player.y + Math.sin(eyeAngle) * (player.radius * 0.5) - 2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill();

  ghosts.forEach(g => {
    ctx.fillStyle = g.frightened ? '#88aaff' : g.color;
    const gx = g.x; const gy = g.y;
    ctx.beginPath(); ctx.arc(gx, gy, TILE/2 - 2, Math.PI, 0); ctx.fill();
    ctx.fillRect(gx - (TILE/2 - 2), gy, TILE - 4, TILE/2 - 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx - 5, gy - 2, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(gx + 5, gy - 2, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(gx - 5, gy - 2, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(gx + 5, gy - 2, 2, 0, Math.PI*2); ctx.fill();
  });
}

let last = performance.now();
let _frameCount = 0;
function loop(now) {
  _frameCount++;
  const dt = now - last; last = now;
  
  // Direct movement before update (to test if the issue is in update())
  if (player.dir.x !== 0 || player.dir.y !== 0) {
    player.x += player.dir.x * player.speed;
    player.y += player.dir.y * player.speed;
  }
  // Clamp player within bounds
  const playerRadius = player.radius;
  player.x = Math.max(playerRadius, Math.min(canvas.width - playerRadius, player.x));
  player.y = Math.max(playerRadius, Math.min(canvas.height - playerRadius, player.y));
  ghosts.forEach(g => {
    if (g.dir.x !== 0 || g.dir.y !== 0) {
      g.x += g.dir.x * g.speed;
      g.y += g.dir.y * g.speed;
    }
    // Clamp ghosts within bounds
    const ghostRadius = TILE/2 - 2;
    g.x = Math.max(ghostRadius, Math.min(canvas.width - ghostRadius, g.x));
    g.y = Math.max(ghostRadius, Math.min(canvas.height - ghostRadius, g.y));
  });
  
  update(dt);
  draw();
  
  if (_frameCount % 30 === 0) {
    console.log('LOOP RUNNING - Frame:', _frameCount, 'Player:', Math.round(player.x), Math.round(player.y), 'dir:', player.dir);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.restartGame = function() {
  score = 0; lives = 3; level = 1; gameRunning = true; gameOverEl.classList.add('hidden');
  for (let r=1;r<ROWS-1;r++) for (let c=1;c<COLS-1;c++) map[r][c] = 1;
  setTile(2,2,3); setTile(COLS-3, ROWS-3, 3);
  resetPelletsAndCount(); updateHUD();
  player.x = playerStart.col*TILE + TILE/2; player.y = playerStart.row*TILE + TILE/2; player.dir= {x:0,y:0}; player.nextDir={x:0,y:0};
  ghosts.forEach((g,i)=>{g.x=ghostStart[i].col*TILE + TILE/2; g.y=ghostStart[i].row*TILE + TILE/2; g.dir={x:0,y:0}; g.frightened=false;});
};

const playAgainBtn = document.querySelector('#gameOver button');
if (playAgainBtn) playAgainBtn.addEventListener('click', () => { window.restartGame(); });
