import { defineMode, h, onTap, randInt, cta, result } from '../lib.js';

const COLORS = [
  { word: '红', css: '#e5484d' },
  { word: '黄', css: '#f5c518' },
  { word: '绿', css: '#3fb950' },
  { word: '蓝', css: '#3b82f6' },
];
const TRIALS = 20;       // 每轮题数
const PASS = 18;         // 答对多少题算通过
const CONFLICT = 0.7;    // 字义与颜色冲突的比例
const ITI = 400;         // 两题之间的注视点时长(ms)
const MISS_SHOW = 500;   // 答错 / 超时提示的停留时长
const FAIL_GUARD = 300;  // 一轮结束后这段时间内的点击不算"继续"

export default defineMode({
  id: 'stroop',
  name: 'Stroop',
  levelLabel: '限时',
  unit: 'ms',
  min: 300,
  max: 2000,
  start: 1500,
  step: 50,
  timed: true,
  harder: l => l - 50,
  easier: l => l + 50,
  better: (a, b) => a < b,

  mount(ctx) {
    const top = h('div', 'top-line');
    const view = h('div', 'center');
    const pads = h('div', 'swatches');
    const hint = h('div', 'hint');
    ctx.root.append(top, view, pads, hint);
    COLORS.forEach((c, i) => {
      const b = h('button');
      b.type = 'button';
      b.dataset.c = i;
      b.style.background = c.css;
      b.setAttribute('aria-label', c.word);
      pads.append(b);
    });

    let phase = 'idle';  // idle → iti → respond → (miss) → … → result
    let n = 0, correct = 0, rtSum = 0;
    let ink = -1, word = -1, shownAt = 0, deadline = 0, endAt = 0;

    function idle() {
      phase = 'idle';
      view.replaceChildren(cta('点击开始', `按字的颜色作答，每题限时 ${ctx.level}ms`));
    }

    function startRound() {
      n = 0;
      correct = 0;
      rtSum = 0;
      hint.textContent = '';
      nextTrial();
    }

    function nextTrial() {
      if (n === TRIALS) return finish();
      phase = 'iti';
      top.textContent = `${n + 1} / ${TRIALS}`;
      view.replaceChildren(h('div', 'fix', '+'));
      ctx.after(ITI, showTrial);
    }

    function showTrial() {
      let c, w;
      do {
        c = randInt(4);
        w = Math.random() < CONFLICT ? (c + 1 + randInt(3)) % 4 : c;
      } while (c === ink && w === word);  // 不和上一题完全相同
      ink = c;
      word = w;
      const el = h('div', 'stroop-word', COLORS[w].word);
      el.style.color = COLORS[c].css;
      view.replaceChildren(el);
      phase = 'respond';
      shownAt = performance.now();
      deadline = ctx.after(ctx.level, () => answer(-1));
    }

    function answer(choice) {
      ctx.cancel(deadline);
      n++;
      if (choice === ink) {
        correct++;
        rtSum += performance.now() - shownAt;
        nextTrial();
      } else {
        phase = 'miss';
        view.replaceChildren(h('div', 'stroop-miss', choice < 0 ? '超时' : '✗'));
        ctx.after(MISS_SHOW, nextTrial);
      }
    }

    function finish() {
      phase = 'result';
      endAt = performance.now();
      const before = ctx.level;
      const ok = correct >= PASS;
      if (ok) ctx.pass();
      else ctx.fail();
      const avg = correct ? Math.round(rtSum / correct) : 0;
      top.textContent = '';
      view.replaceChildren(result(ok, ok ? '✓ 通过' : '✗ 未通过',
        `${correct} / ${TRIALS} 正确 · 平均 ${avg}ms`,
        `限时 ${before}ms → ${ctx.level}ms`));
      hint.textContent = '点击开始下一轮';
    }

    onTap(pads, e => {
      if (phase !== 'respond') return;
      const b = e.target.closest('[data-c]');
      if (b) answer(+b.dataset.c);
    });

    onTap(ctx.root, () => {
      if (phase === 'idle') startRound();
      else if (phase === 'result' && performance.now() - endAt > FAIL_GUARD) startRound();
    });

    idle();
  },
});
