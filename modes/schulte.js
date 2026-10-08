import { defineMode, h, onTap, shuffle, cta, result } from '../lib.js';

const SIZE = 5, N = SIZE * SIZE;
const BLINK = 150;       // 点击反馈的闪烁时长(ms)
const FAIL_GUARD = 300;  // 一轮结束后这段时间内的点击不算"继续"

export default defineMode({
  id: 'schulte',
  name: '舒尔特',
  levelLabel: '限时',
  unit: 's',
  min: 5,
  max: 120,
  start: 60,
  timed: true,
  easier: l => l + 1,
  better: (a, b) => a < b,
  fmtBest: v => v.toFixed(1),

  mount(ctx) {
    const clock = h('div', 'top-line');
    const bar = h('div', 'timebar');
    const barFill = h('i');
    bar.append(barFill);
    const board = h('div', 'board');
    const grid = h('div', 'schulte-grid');
    const hint = h('div', 'hint');
    ctx.root.append(clock, bar, board, hint);

    const cells = [];
    for (let i = 0; i < N; i++) {
      const el = h('div', 'cell');
      el.dataset.i = i;
      grid.append(el);
      cells.push(el);
    }

    let phase = 'idle';  // idle → play → result
    let nums = [], next = 1, t0 = 0, timer = 0, endAt = 0;

    function idle() {
      phase = 'idle';
      board.replaceChildren(cta('点击开始', `1 → ${N} 依次点击，限时 ${ctx.level}s`));
    }

    function start() {
      nums = shuffle(Array.from({ length: N }, (_, i) => i + 1));
      cells.forEach((el, i) => {
        el.className = 'cell';
        el.textContent = nums[i];
      });
      board.replaceChildren(grid);
      hint.textContent = '';
      next = 1;
      phase = 'play';
      const limit = ctx.level * 1000;
      t0 = performance.now();
      timer = ctx.after(limit, timeout);
      ctx.frame(() => {
        const e = performance.now() - t0;
        clock.textContent = (e / 1000).toFixed(1) + 's';
        barFill.style.transform = `scaleX(${Math.max(0, 1 - e / limit)})`;
      });
    }

    function blink(el, cls) {
      el.classList.remove('ok', 'bad');
      void el.offsetWidth;
      el.classList.add(cls);
      ctx.after(BLINK, () => el.classList.remove(cls));
    }

    function finish() {
      ctx.cancel(timer);
      ctx.stopFrame();
      phase = 'result';
      endAt = performance.now();
      const sec = (endAt - t0) / 1000;
      const score = Math.round(sec * 10) / 10;
      const before = ctx.level;
      // 下一轮限时收紧到"本次用时"附近,很快贴近真实水平
      ctx.pass(score, Math.min(before - 1, Math.ceil(sec)));
      clock.textContent = score.toFixed(1) + 's';
      board.replaceChildren(result(true, `✓ ${score.toFixed(1)}s`, `限时 ${before}s → ${ctx.level}s`));
      hint.textContent = '点击开始下一轮';
    }

    function timeout() {
      ctx.stopFrame();
      phase = 'result';
      endAt = performance.now();
      const before = ctx.level;
      ctx.fail();
      clock.textContent = before + 's';
      barFill.style.transform = 'scaleX(0)';
      board.replaceChildren(result(false, '✗ 超时', `点到了 ${next - 1} · 限时 ${before}s → ${ctx.level}s`));
      hint.textContent = '点击开始下一轮';
    }

    onTap(grid, e => {
      if (phase !== 'play') return;
      const el = e.target.closest('.cell');
      if (!el) return;
      const ok = nums[+el.dataset.i] === next;
      blink(el, ok ? 'ok' : 'bad');
      if (ok && ++next > N) finish();
    });

    onTap(ctx.root, () => {
      if (phase === 'idle') start();
      else if (phase === 'result' && performance.now() - endAt > FAIL_GUARD) start();
    });

    idle();
  },
});
