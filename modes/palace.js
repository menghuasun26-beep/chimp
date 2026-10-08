import { defineMode, h, shuffle, cta } from '../lib.js';
import { WORDS } from '../words.js';

const STEP_GUARD = 200;  // 记忆阶段两次翻页的最小间隔(ms),防止连点跳过词
const FAIL_GUARD = 300;  // 一轮结束后这段时间内的点击不算"继续"

// 回忆阶段的词表可能需要滚动,所以本模式统一用 click(滑动时不会触发)
export default defineMode({
  id: 'palace',
  name: '记忆宫殿',
  min: 3,
  max: 50,
  start: 5,

  mount(ctx) {
    const top = h('div', 'top-line');
    const body = h('div', 'fill');
    const hint = h('div', 'hint');
    ctx.root.append(top, body, hint);

    let phase = 'idle';  // idle → study → recall → done(全对) / failed
    let list = [], pool = [], k = 0, lastAt = 0, endAt = 0;

    function show(node) {
      const c = h('div', 'center');
      c.append(node);
      body.replaceChildren(c);
    }

    function idle() {
      phase = 'idle';
      show(cta('点击开始', `按顺序记住 ${ctx.level} 个词`));
    }

    function study() {
      const n = ctx.level;
      pool = shuffle([...WORDS]).slice(0, n * 2);
      list = pool.slice(0, n);
      phase = 'study';
      k = 0;
      lastAt = performance.now();
      hint.textContent = '点击看下一个';
      showWord();
    }

    function showWord() {
      top.textContent = `${k + 1} / ${list.length}`;
      show(h('div', 'word', list[k]));
    }

    function recall() {
      phase = 'recall';
      k = 0;
      top.textContent = '按顺序点出第 1 个';
      hint.textContent = '';
      const grid = h('div', 'palace-grid');
      for (const w of shuffle([...pool])) {
        const b = h('button', null, w);
        b.type = 'button';
        b.dataset.w = w;
        grid.append(b);
      }
      grid.addEventListener('click', e => {
        if (phase !== 'recall') return;
        const b = e.target.closest('button');
        if (!b || b.classList.contains('done')) return;
        if (b.dataset.w !== list[k]) return fail(grid, b);
        b.classList.add('done');
        b.append(h('span', 'badge', k + 1));
        k++;
        if (k === list.length) pass();
        else top.textContent = `按顺序点出第 ${k + 1} 个`;
      });
      body.replaceChildren(grid);
    }

    function pass() {
      phase = 'done';
      endAt = performance.now();
      ctx.pass();
      top.textContent = '✓ 全部正确';
      hint.textContent = '点击任意处继续';
    }

    function fail(grid, wrong) {
      phase = 'failed';
      endAt = performance.now();
      wrong.classList.add('wrong');
      for (const b of grid.children) {
        if (b.classList.contains('done') || b === wrong) continue;
        const i = list.indexOf(b.dataset.w);
        if (i >= 0) {
          b.classList.add('target');
          b.append(h('span', 'badge', i + 1));
        } else {
          b.classList.add('dim');
        }
      }
      ctx.fail();
      top.textContent = '✗ 正确顺序已标出';
      hint.textContent = '点击任意处继续';
    }

    ctx.root.addEventListener('click', () => {
      const now = performance.now();
      if (phase === 'idle') {
        study();
      } else if (phase === 'study') {
        if (now - lastAt < STEP_GUARD) return;
        lastAt = now;
        if (++k < list.length) showWord();
        else recall();
      } else if ((phase === 'done' || phase === 'failed') && now - endAt > FAIL_GUARD) {
        study();
      }
    });

    idle();
  },
});
