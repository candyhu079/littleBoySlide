// 小朋友下樓梯（基本版）
// 純原生 JavaScript + Canvas。核心循環：角色受重力下墜，玩家左右移動，
// 落在不斷往上捲動的階梯上，撐越久、踩越多階分數越高；掉出畫面底部即結束。

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

const W = canvas.width;
const H = canvas.height;

// ── 調整參數（之後改玩法主要動這裡）────────────────────────────
const GRAVITY = 0.5; // 每幀重力加速度
const MAX_FALL = 9; // 最高下墜速度上限
const MOVE_SPEED = 4; // 角色水平移動速度
const SCROLL_SPEED = 1.6; // 階梯往上捲動的固定速度
const STAIR_GAP = 90; // 階梯之間的固定垂直間距
const STAIR_WIDTH = 90; // 階梯寬度
const STAIR_HEIGHT = 14; // 階梯高度

// ── 角色 ────────────────────────────────────────────────────
const player = {
  w: 24,
  h: 28,
  x: 0,
  y: 0,
  vy: 0, // 垂直速度
};

// ── 遊戲狀態 ─────────────────────────────────────────────────
let stairs = []; // 階梯陣列，每個 { x, y, w, h, scored }
let score = 0;
let keys = { left: false, right: false };
let gameOver = false;
let nextStairId = 0;

// 初始化 / 重置整局遊戲
function reset() {
  stairs = [];
  score = 0;
  gameOver = false;
  scoreEl.textContent = "0";

  // 由下往上鋪滿初始階梯，並讓第一階就在角色腳下方
  let y = H - 60;
  while (y > -STAIR_GAP) {
    addStair(y);
    y -= STAIR_GAP;
  }

  // 角色從畫面上方中央開始下墜
  player.x = W / 2 - player.w / 2;
  player.y = 40;
  player.vy = 0;
}

// 新增一個水平位置隨機的階梯
function addStair(y) {
  const x = Math.random() * (W - STAIR_WIDTH);
  stairs.push({
    id: nextStairId++,
    x,
    y,
    w: STAIR_WIDTH,
    h: STAIR_HEIGHT,
    scored: false,
  });
}

// ── 輸入 ────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  // 遊戲結束時，按任意鍵（空白/Enter 也可）重新開始
  if (gameOver && (e.key === " " || e.key === "Enter" || e.key.length === 1)) {
    reset();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
});

// ── 更新邏輯 ─────────────────────────────────────────────────
function update() {
  if (gameOver) return;

  // 左右移動，並限制在畫面內
  if (keys.left) player.x -= MOVE_SPEED;
  if (keys.right) player.x += MOVE_SPEED;
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > W) player.x = W - player.w;

  // 重力下墜（含上限）
  player.vy = Math.min(player.vy + GRAVITY, MAX_FALL);
  player.y += player.vy;

  // 階梯往上捲動
  for (const s of stairs) {
    s.y -= SCROLL_SPEED;
  }

  // 移除捲出上緣的階梯，並在下方補新的
  stairs = stairs.filter((s) => s.y + s.h > 0);
  const lowest = stairs.reduce((m, s) => Math.max(m, s.y), -Infinity);
  if (lowest < H) {
    addStair(lowest + STAIR_GAP);
  }

  // 碰撞：只在下墜時、由上方落到階梯表面才承接
  if (player.vy >= 0) {
    for (const s of stairs) {
      const playerBottom = player.y + player.h;
      const horizontallyOver =
        player.x + player.w > s.x && player.x < s.x + s.w;
      // 角色底部落在階梯表面附近（容許一點穿透量）
      const landing =
        playerBottom >= s.y &&
        playerBottom <= s.y + s.h + player.vy;
      if (horizontallyOver && landing) {
        player.y = s.y - player.h; // 站到階梯表面
        player.vy = 0;
        // 隨階梯一起往上移動
        player.y -= SCROLL_SPEED;
        // 第一次踩到才計分
        if (!s.scored) {
          s.scored = true;
          score += 1;
          scoreEl.textContent = String(score);
        }
        break;
      }
    }
  }

  // 掉出畫面底部 → 遊戲結束
  if (player.y > H) {
    gameOver = true;
  }
}

// ── 繪製 ────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  // 階梯
  ctx.fillStyle = "#5fd08a";
  for (const s of stairs) {
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  // 角色（簡單的小人：身體 + 頭）
  ctx.fillStyle = "#ffd54a";
  ctx.fillRect(player.x, player.y + 8, player.w, player.h - 8); // 身體
  ctx.beginPath();
  ctx.arc(player.x + player.w / 2, player.y + 6, 7, 0, Math.PI * 2); // 頭
  ctx.fill();

  // 遊戲結束畫面
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "32px sans-serif";
    ctx.fillText("遊戲結束", W / 2, H / 2 - 30);
    ctx.font = "22px sans-serif";
    ctx.fillText("分數：" + score, W / 2, H / 2 + 10);
    ctx.font = "16px sans-serif";
    ctx.fillText("按任意鍵重新開始", W / 2, H / 2 + 50);
    ctx.textAlign = "left";
  }
}

// ── 主迴圈 ──────────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

reset();
loop();
