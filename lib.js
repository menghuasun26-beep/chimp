// 各训练模式共用的小工具

export const store = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, String(v)); } catch {}
  },
};

// 模式定义的默认值:等级越高越难,成绩越大越好
export function defineMode(o) {
  return {
    levelLabel: '等级',
    unit: '',
    step: 1,
    timed: false,  // 含计时的模式,切到后台时作废当前这一轮
    harder: l => l + 1,
    easier: l => l - 1,
    better: (a, b) => a > b,
    fmtBest: String,
    ...o,
  };
}

export const randInt = n => Math.floor(Math.random() * n);

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// 按下即触发,不等手指抬起
export function onTap(el, fn) {
  el.addEventListener('pointerdown', e => {
    if (e.button === 0) fn(e);
  });
}

export function cta(title, sub) {
  const e = h('div', 'cta', title);
  if (sub) e.append(h('small', null, sub));
  return e;
}

export function result(ok, title, ...lines) {
  const e = h('div', 'result ' + (ok ? 'ok' : 'bad'));
  e.append(h('div', 'result-title', title));
  for (const l of lines) e.append(h('div', 'result-line', l));
  return e;
}
