import chimp from './modes/chimp.js';
import { forward, backward } from './modes/span.js';
import palace from './modes/palace.js';
import stroop from './modes/stroop.js';
import schulte from './modes/schulte.js';
import { store } from './lib.js';

const MODES = [chimp, forward, backward, palace, stroop, schulte];

const $ = id => document.getElementById(id);
const main = $('main');
const modeName = $('modeName'), levelLbl = $('levelLbl'), levelNum = $('levelNum'), levelUnit = $('levelUnit'), bestNum = $('bestNum');
const modeSheet = $('modeSheet'), modeList = $('modeList');
const levelSheet = $('levelSheet'), pick = $('pick'), range = $('range');

let mode, level, best;
let dispose = () => {};

const clampFor = (m, n) => Math.min(m.max, Math.max(m.min, n));
const clamp = n => clampFor(mode, n);

function num(k) {
  const n = parseFloat(store.get(k));
  return Number.isFinite(n) ? n : null;
}
const levelOf = m => { const n = num(m.id + '-level'); return n == null ? m.start : clampFor(m, n); };
const bestOf = m => num(m.id + '-best');
const fmtBest = (m, b) => b == null ? '—' : m.fmtBest(b) + m.unit;

function flash(el, cls) {
  el.classList.remove('up', 'down');
  void el.offsetWidth;
  el.classList.add(cls);
  clearTimeout(el.flashTimer);
  el.flashTimer = setTimeout(() => el.classList.remove(cls), 350);
}

function setLevel(n, cls) {
  level = clamp(n);
  store.set(mode.id + '-level', level);
  levelNum.textContent = level;
  if (cls) flash(levelNum, cls);
}

// 每次开新一轮环境:清掉上一个模式留下的计时器,换上新的根节点
function mount() {
  dispose();
  const root = document.createElement('div');
  root.className = 'stage';
  main.replaceChildren(root);

  const timers = new Set();
  let raf = 0;
  const ctx = {
    root,
    get level() { return level; },
    after(ms, fn) {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    },
    cancel(t) {
      clearTimeout(t);
      timers.delete(t);
    },
    frame(fn) {
      cancelAnimationFrame(raf);
      const loop = () => { fn(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    },
    stopFrame() { cancelAnimationFrame(raf); },
    // 通过一轮:更新最佳成绩,难度上调一档
    pass(score = level, next = mode.harder(level)) {
      if (best == null || mode.better(score, best)) {
        best = score;
        store.set(mode.id + '-best', best);
        bestNum.textContent = fmtBest(mode, best);
        flash(bestNum, 'up');
      }
      setLevel(next, 'up');
    },
    // 失败:难度下调一档
    fail(next = mode.easier(level)) {
      setLevel(next, 'down');
    },
  };
  dispose = () => {
    timers.forEach(clearTimeout);
    timers.clear();
    cancelAnimationFrame(raf);
  };
  mode.mount(ctx);
}

function switchMode(m) {
  mode = m;
  store.set('mode', m.id);
  level = levelOf(m);
  best = bestOf(m);
  modeName.textContent = m.name;
  levelLbl.textContent = m.levelLabel;
  levelNum.textContent = level;
  levelUnit.textContent = m.unit;
  bestNum.textContent = fmtBest(m, best);
  mount();
}

// ---------- 模式列表 ----------
$('modeBtn').addEventListener('click', () => {
  modeList.replaceChildren(...MODES.map(m => {
    const b = document.createElement('button');
    b.type = 'button';
    if (m === mode) b.className = 'cur';
    const name = document.createElement('span');
    name.textContent = m.name;
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = `${m.levelLabel} ${levelOf(m)}${m.unit} · 最佳 ${fmtBest(m, bestOf(m))}`;
    b.append(name, sub);
    b.addEventListener('click', () => {
      modeSheet.hidden = true;
      if (m !== mode) switchMode(m);
    });
    return b;
  }));
  modeSheet.hidden = false;
});
modeSheet.addEventListener('click', e => { if (e.target === modeSheet) modeSheet.hidden = true; });

// ---------- 等级调整 ----------
function setPick(n) {
  n = clamp(n);
  range.value = n;
  pick.textContent = n + mode.unit;
}

$('levelBtn').addEventListener('click', () => {
  range.min = mode.min;
  range.max = mode.max;
  range.step = mode.step;
  $('levelTitle').textContent = '调整' + mode.levelLabel;
  setPick(level);
  levelSheet.hidden = false;
});
$('minus').addEventListener('click', () => setPick(+range.value - mode.step));
$('plus').addEventListener('click', () => setPick(+range.value + mode.step));
range.addEventListener('input', () => setPick(+range.value));
$('cancel').addEventListener('click', () => { levelSheet.hidden = true; });
levelSheet.addEventListener('click', e => { if (e.target === levelSheet) levelSheet.hidden = true; });
$('ok').addEventListener('click', () => {
  levelSheet.hidden = true;
  setLevel(+range.value);
  mount();
});

// 计时类训练切到后台时作废当前一轮,回来重新开始,不算失败
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode.timed) mount();
});

// 屏蔽 iOS 双指缩放;注册 touchstart 才能让按钮的 :active 样式在 iOS 上生效
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchstart', () => {}, { passive: true });

switchMode(MODES.find(m => m.id === store.get('mode')) || chimp);

if ('serviceWorker' in navigator) {
  // 新版本激活后自动刷新一次,更新只需联网打开一次
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload();
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
