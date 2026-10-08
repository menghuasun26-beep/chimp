import { defineMode, h, onTap, randInt, cta } from '../lib.js';

const FIX = 600;         // 开始前注视点时长(ms)
const ON = 700;          // 每个数字显示时长
const OFF = 300;         // 数字之间的空白
const NEXT_DELAY = 800;  // 答对后自动出下一题的间隔
const FAIL_GUARD = 300;  // 出错后这段时间内的点击不算"继续"

function makeSpan({ id, name, min, reverse }) {
  return defineMode({
    id,
    name,
    min,
    max: 20,
    start: min,
    timed: true,

    mount(ctx) {
      const view = h('div', 'center');
      const keypad = h('div', 'keypad off');
      const hint = h('div', 'hint');
      ctx.root.append(view, keypad, hint);
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
        const b = h('button', k ? null : 'blank', k);
        b.type = 'button';
        if (k) b.dataset.k = k;
        keypad.append(b);
      }

      let phase = 'idle';  // idle → show → input → busy(答对) / failed(答错)
      let seq = [], input = [], failedAt = 0;

      function idle() {
        phase = 'idle';
        const how = reverse ? '倒序输入' : '按顺序输入';
        view.replaceChildren(cta('点击开始', `记住 ${ctx.level} 位数字，${how}`));
      }

      function present() {
        phase = 'show';
        hint.textContent = '';
        keypad.classList.add('off');
        seq = [];
        for (let i = 0; i < ctx.level; i++) {
          let d;
          do d = randInt(10); while (d === seq[i - 1]);
          seq.push(d);
        }
        const big = h('div', 'span-view fix', '+');
        view.replaceChildren(big);
        seq.forEach((d, i) => {
          const at = FIX + i * (ON + OFF);
          ctx.after(at, () => { big.className = 'span-view'; big.textContent = d; });
          ctx.after(at + ON, () => { big.textContent = ''; });
        });
        ctx.after(FIX + (seq.length - 1) * (ON + OFF) + ON, startInput);
      }

      function startInput() {
        phase = 'input';
        input = [];
        keypad.classList.remove('off');
        renderSlots();
      }

      function renderSlots() {
        const slots = h('div', 'slots');
        for (let i = 0; i < seq.length; i++) slots.append(h('span', null, input[i] ?? ''));
        view.replaceChildren(slots);
      }

      function judge() {
        const want = reverse ? [...seq].reverse() : seq;
        keypad.classList.add('off');
        if (input.every((d, i) => d === want[i])) {
          phase = 'busy';
          view.replaceChildren(h('div', 'ok-mark', '✓'));
          ctx.pass();
          ctx.after(NEXT_DELAY, present);
        } else {
          phase = 'failed';
          failedAt = performance.now();
          ctx.fail();
          view.replaceChildren(compare(want, input));
          hint.textContent = '点击任意处继续';
        }
      }

      function compare(want, got) {
        const box = h('div', 'cmp');
        const row = (label, digits, mark) => {
          const r = h('div');
          r.append(h('span', 'lbl', label));
          digits.forEach((d, i) => r.append(h('span', mark && d !== want[i] ? 'bad' : null, d)));
          return r;
        };
        box.append(row('正确', want, false), row('你的', got, true));
        return box;
      }

      onTap(keypad, e => {
        if (phase !== 'input') return;
        const b = e.target.closest('[data-k]');
        if (!b) return;
        if (b.dataset.k === '⌫') input.pop();
        else input.push(+b.dataset.k);
        renderSlots();
        if (input.length === seq.length) judge();
      });

      onTap(ctx.root, () => {
        if (phase === 'idle') present();
        else if (phase === 'failed' && performance.now() - failedAt > FAIL_GUARD) present();
      });

      idle();
    },
  });
}

export const forward = makeSpan({ id: 'span-fwd', name: '数字顺背', min: 3, reverse: false });
export const backward = makeSpan({ id: 'span-bwd', name: '数字倒背', min: 2, reverse: true });
