import { defineMode, h, onTap, randInt } from '../lib.js';

const COLS = 5, ROWS = 8, CELLS = COLS * ROWS;
const NEXT_DELAY = 250;  // 过关后出下一题的间隔(ms)
const FAIL_GUARD = 300;  // 出错后这段时间内的点击不算"继续",防止连点跳过答案

export default defineMode({
  id: 'chimp',
  name: '黑猩猩',
  min: 4,
  max: CELLS,
  start: 4,

  mount(ctx) {
    const board = h('div', 'board');
    const grid = h('div', 'chimp-grid');
    const hint = h('div', 'hint');
    board.append(grid);
    ctx.root.append(board, hint);

    const cells = [];
    for (let i = 0; i < CELLS; i++) {
      const el = h('div', 'cell');
      el.dataset.i = i;
      grid.append(el);
      cells.push(el);
    }

    const nums = new Array(CELLS).fill(0);  // 每格的数字,0 表示空
    let count = 0;          // 本题数字个数
    let next = 1;           // 下一个该点的数字
    let phase = 'ready';    // ready: 数字可见  playing: 已隐藏  failed: 出错待继续  busy: 过关间隔
    let failedAt = 0;

    function paint(i, mode) {
      const el = cells[i];
      el.className = 'cell ' + mode;
      el.textContent = mode === 'show' || mode === 'wrong' ? nums[i] : '';
    }

    function newRound() {
      nums.fill(0);
      count = ctx.level;
      const idx = Array.from({ length: CELLS }, (_, i) => i);
      for (let k = 0; k < count; k++) {
        const r = k + randInt(CELLS - k);
        [idx[k], idx[r]] = [idx[r], idx[k]];
        nums[idx[k]] = k + 1;
      }
      next = 1;
      phase = 'ready';
      hint.textContent = '';
      for (let i = 0; i < CELLS; i++) paint(i, nums[i] ? 'show' : 'empty');
    }

    function tap(i) {
      const n = nums[i];
      if (!n) return;
      if (n !== next) return fail(i);
      nums[i] = 0;
      paint(i, 'empty');
      if (next === 1) {
        phase = 'playing';
        for (let j = 0; j < CELLS; j++) if (nums[j]) paint(j, 'hide');
      }
      if (next === count) {
        phase = 'busy';
        ctx.pass();
        ctx.after(NEXT_DELAY, newRound);
      } else {
        next++;
      }
    }

    function fail(i) {
      phase = 'failed';
      failedAt = performance.now();
      for (let j = 0; j < CELLS; j++) if (nums[j]) paint(j, j === i ? 'wrong' : 'show');
      ctx.fail();
      hint.textContent = '点击任意处继续';
    }

    onTap(ctx.root, e => {
      if (phase === 'failed') {
        if (performance.now() - failedAt > FAIL_GUARD) newRound();
        return;
      }
      if (phase !== 'ready' && phase !== 'playing') return;
      const el = e.target.closest('.cell');
      if (el) tap(+el.dataset.i);
    });

    newRound();
  },
});
