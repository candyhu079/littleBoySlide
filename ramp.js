// 小朋友造路（造路模式）— 可行性原型
// 玩法：小朋友自動沿 45° 斜板下滑，玩家在缺口放斜板造路。
// 頂端有尖刺（扣血），掉出畫面外即死。斜板從右側佇列依序取用。
//
// 座標一律用「螢幕座標」。世界每幀往上捲，物件 y 減少。
// 斜板表面公式（45°，見 design.md）：
//   s = dir==='\\' ? +1 : -1
//   surfaceY(r, px) = r.y + s * (px - r.x)      // r.(x,y) 為左端點

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ── 尺寸 ────────────────────────────────────────────────────
const W = canvas.width;      // 460
const H = canvas.height;     // 560
const PLAY_W = 360;          // 遊戲區寬（右側 360~460 是佇列面板）

// ── 可調參數（Vibe 微調主要動這裡）──────────────────────────
const SCROLL = 2.0;          // 世界上捲速度
const SLIDE = 0.8;           // 沿斜板滑行速度
const GRAVITY = 0.1;         // 自由落下重力
const MAX_FALL = 8;          // 最高落下速度
const RAMP_LEN = 70;         // 斜板長度（水平=垂直）
const GAP = 95;              // 地形斜板垂直間距
const KID_W = 20;
const KID_H = 24;
const SPIKE_H = 26;          // 頂端尖刺高度
const START_HP = 3;
const INVINC = 70;           // 受傷後無敵幀數
const QUEUE_VISIBLE = 5;     // 佇列顯示數量

// ── 狀態 ────────────────────────────────────────────────────
let ramps = [];   // { x, y, dir:'\\'|'/', len, type:'terrain'|'player' }
let kid;          // { x, footY, state:'slide'|'fall', vy, dir, ramp }
let queue = [];   // 方向字串陣列
let hp, invinc, depth, score, gameOver;
let mouseX = -1, mouseY = -1;

const slope = (dir) => (dir === "\\" ? 1 : -1);
const surfaceY = (r, px) => r.y + slope(r.dir) * (px - r.x);
const inRange = (r, px) => px >= r.x && px <= r.x + r.len;
const randDir = () => (Math.random() < 0.5 ? "\\" : "/");

// 在指定 y 附近生成一塊隨機地形斜板
function addTerrain(y) {
  const dir = randDir();
  const x = 10 + Math.random() * (PLAY_W - RAMP_LEN - 20);
  ramps.push({ x, y, dir, len: RAMP_LEN, type: "terrain" });
}

// 重置整局
function reset() {
  ramps = [];
  queue = [];
  hp = START_HP;
  invinc = 0;
  depth = 0;
  score = 0;
  gameOver = false;

  // 起始斜板：畫面上方中央，保證小朋友一開始有得滑
  const start = { x: PLAY_W / 2 - RAMP_LEN / 2, y: 120, dir: "\\", len: RAMP_LEN, type: "terrain" };
  ramps.push(start);

  // 往下鋪一些隨機地形（帶缺口）
  for (let y = 120 + GAP; y < H + GAP; y += GAP) addTerrain(y);

  // 佇列初始化
  for (let i = 0; i < QUEUE_VISIBLE + 2; i++) queue.push(randDir());

  // 小朋友放到起始斜板上
  kid = {
    x: start.x + RAMP_LEN / 2,
    footY: surfaceY(start, start.x + RAMP_LEN / 2),
    state: "slide",
    vy: 0,
    dir: start.dir,
    ramp: start,
  };
}

// 在下墜區間 [prevFoot, newFoot] 找出第一個接住小朋友的斜板
function findLanding(px, prevFoot, newFoot) {
  let best = null;
  let bestY = Infinity;
  for (const r of ramps) {
    if (!inRange(r, px)) continue;
    const sy = surfaceY(r, px);
    if (sy >= prevFoot - 0.01 && sy <= newFoot && sy < bestY) {
      best = r;
      bestY = sy;
    }
  }
  return best;
}

// ── 輸入 ────────────────────────────────────────────────────
canvas.addEventListener("mousemove", (e) => {
  mouseX = e.offsetX;
  mouseY = e.offsetY;
});
canvas.addEventListener("mouseleave", () => { mouseX = -1; mouseY = -1; });

canvas.addEventListener("click", (e) => {
  if (gameOver) { reset(); return; }
  const cx = e.offsetX, cy = e.offsetY;
  if (cx >= PLAY_W) return; // 點在佇列面板不放板
  // 取佇列首塊方向，以游標為中心放置
  const dir = queue.shift();
  queue.push(randDir());
  const x = cx - RAMP_LEN / 2;
  ramps.push({ x, y: cy, dir, len: RAMP_LEN, type: "player" });
});

// ── 更新 ────────────────────────────────────────────────────
function update() {
  if (gameOver) return;

  // 1. 世界上捲
  for (const r of ramps) r.y -= SCROLL;
  depth += SCROLL;
  score = Math.floor(depth);

  // 移除捲出上緣的斜板，並在下方補地形
  ramps = ramps.filter((r) => r.y + r.len > -20 && r.y < H + 40);
  let lowest = -Infinity;
  for (const r of ramps) lowest = Math.max(lowest, r.y);
  if (lowest < H) addTerrain(lowest + GAP);

  // 2. 小朋友被世界往上帶
  kid.footY -= SCROLL;

  // 3. 小朋友自身運動
  if (kid.state === "slide") {
    kid.x += slope(kid.dir) * SLIDE;
    if (kid.ramp && inRange(kid.ramp, kid.x)) {
      kid.footY = surfaceY(kid.ramp, kid.x); // 貼齊斜板表面
    } else {
      kid.state = "fall";       // 滑出末端 → 自由落下
      kid.vy = SLIDE;
      kid.ramp = null;
    }
  }
  if (kid.state === "fall") {
    kid.vy = Math.min(kid.vy + GRAVITY, MAX_FALL);
    const prevFoot = kid.footY;
    kid.footY += kid.vy;
    const land = findLanding(kid.x, prevFoot, kid.footY);
    if (land) {
      kid.ramp = land;
      kid.dir = land.dir;
      kid.state = "slide";
      kid.vy = 0;
      kid.footY = surfaceY(land, kid.x);
    }
  }

  // 4. 頂端尖刺 / 生命值
  if (invinc > 0) invinc--;
  const headY = kid.footY - KID_H;
  if (headY <= SPIKE_H) {
    kid.footY = SPIKE_H + KID_H; // 頂住尖刺，不再往上
    if (invinc === 0) {
      hp--;
      invinc = INVINC;
      if (hp <= 0) gameOver = true;
    }
  }

  // 5. 掉出畫面外即死
  if (kid.footY - KID_H > H) gameOver = true;
}

// ── 繪製 ────────────────────────────────────────────────────
function drawRamp(r) {
  const x2 = r.x + r.len;
  const y2 = r.y + slope(r.dir) * r.len;
  ctx.strokeStyle = r.type === "player" ? "#4aa3ff" : "#5fd08a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r.x, r.y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // 遊戲區 / 面板分隔
  ctx.fillStyle = "#0c1128";
  ctx.fillRect(PLAY_W, 0, W - PLAY_W, H);

  // 斜板
  for (const r of ramps) if (r.x < PLAY_W) drawRamp(r);

  // 放置預覽（游標處的下一塊斜板）
  if (mouseX >= 0 && mouseX < PLAY_W && !gameOver) {
    const dir = queue[0];
    const gx = mouseX - RAMP_LEN / 2;
    const gy = mouseY;
    ctx.strokeStyle = "rgba(74,163,255,0.5)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + RAMP_LEN, gy + slope(dir) * RAMP_LEN);
    ctx.stroke();
  }

  // 小朋友
  if (!(invinc > 0 && Math.floor(invinc / 5) % 2 === 0)) {
    const px = kid.x, top = kid.footY - KID_H;
    ctx.fillStyle = "#ffd54a";
    ctx.fillRect(px - KID_W / 2, top + 8, KID_W, KID_H - 8); // 身體
    ctx.beginPath();
    ctx.arc(px, top + 6, 6, 0, Math.PI * 2); // 頭
    ctx.fill();
  }

  // 頂端尖刺
  ctx.fillStyle = "#e05a5a";
  const teeth = 12;
  for (let i = 0; i < teeth; i++) {
    const sx = (PLAY_W / teeth) * i;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + PLAY_W / teeth / 2, SPIKE_H);
    ctx.lineTo(sx + PLAY_W / teeth, 0);
    ctx.fill();
  }

  // HUD：分數 + 生命
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("分數：" + score, 8, SPIKE_H + 22);
  for (let i = 0; i < START_HP; i++) {
    ctx.fillStyle = i < hp ? "#ff5a7a" : "#44405a";
    ctx.fillText("♥", 8 + i * 20, SPIKE_H + 44);
  }

  // 佇列面板
  ctx.fillStyle = "#9fb0e0";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("斜板佇列", PLAY_W + (W - PLAY_W) / 2, 24);
  const cellH = 60, cellX = PLAY_W + (W - PLAY_W) / 2;
  for (let i = 0; i < QUEUE_VISIBLE; i++) {
    const cy = 50 + i * cellH;
    if (i === 0) {
      ctx.fillStyle = "rgba(74,163,255,0.15)";
      ctx.fillRect(PLAY_W + 6, cy - 22, W - PLAY_W - 12, cellH - 8);
      ctx.fillStyle = "#4aa3ff";
      ctx.font = "11px sans-serif";
      ctx.fillText("下一個", cellX, cy - 26);
    }
    const dir = queue[i];
    const half = 18;
    ctx.strokeStyle = "#4aa3ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cellX - half, cy - slope(dir) * half);
    ctx.lineTo(cellX + half, cy + slope(dir) * half);
    ctx.stroke();
  }

  // 遊戲結束
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "30px sans-serif";
    ctx.fillText("遊戲結束", W / 2, H / 2 - 24);
    ctx.font = "20px sans-serif";
    ctx.fillText("分數：" + score, W / 2, H / 2 + 8);
    ctx.font = "15px sans-serif";
    ctx.fillText("點一下重新開始", W / 2, H / 2 + 44);
  }
  ctx.textAlign = "left";
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

reset();
loop();
