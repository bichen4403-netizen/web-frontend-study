const NS = 'http://www.w3.org/2000/svg';
const PAGES = [
  ['index', 'index.html', '首页'],
  ['d1', 'd1.html', '难点 1'],
  ['d2', 'd2.html', '难点 2'],
  ['d3', 'd3.html', '难点 3']
];
const DELAYS = [1800, 1300, 900, 600, 350];
const TREE = { gapX: 58, gapY: 78, r: 21, padX: 30, padTop: 56, padBottom: 34 };

const $ = selector => document.querySelector(selector);

function renderNav() {
  const nav = $('#nav');
  const current = document.body.dataset.page;
  nav.className = 'nav';
  nav.innerHTML = '<a class="brand" href="index.html">二叉搜索树 · 三个难点</a>' +
    PAGES.map(([id, href, name]) => `<a class="link${id === current ? ' active' : ''}" href="${href}">${name}</a>`).join('');
}

async function loadData(name) {
  try {
    const res = await fetch(`../data/${name}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (!$('.load-error')) {
      const box = document.createElement('p');
      box.className = 'load-error';
      box.textContent = `没有读到 data/${name}.json。请用 http 方式打开页面（在线部署地址，或 VS Code 的 Live Server），不要直接双击 HTML 文件。`;
      $('main').prepend(box);
    }
    throw err;
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function fill(template, values = {}) {
  return escapeHtml(template).replace(/\{(\w+)\}/g, (all, key) => key in values ? `<b>${escapeHtml(values[key])}</b>` : all);
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const BST = {
  node: v => ({ v, left: null, right: null }),
  insert(root, v) {
    if (!root) return BST.node(v);
    let cur = root;
    while (cur.v !== v) {
      const side = v < cur.v ? 'left' : 'right';
      if (!cur[side]) {
        cur[side] = BST.node(v);
        break;
      }
      cur = cur[side];
    }
    return root;
  },
  build: values => values.reduce((root, v) => BST.insert(root, v), null),
  clone: n => n && { v: n.v, left: BST.clone(n.left), right: BST.clone(n.right) },
  find(root, v) {
    let cur = root;
    while (cur && cur.v !== v) cur = v < cur.v ? cur.left : cur.right;
    return cur;
  },
  inorder(n, out = []) {
    if (n) {
      BST.inorder(n.left, out);
      out.push(n.v);
      BST.inorder(n.right, out);
    }
    return out;
  },
  height: n => n ? 1 + Math.max(BST.height(n.left), BST.height(n.right)) : 0,
  depths(n, depth = 1, out = []) {
    if (n) {
      out.push(depth);
      BST.depths(n.left, depth + 1, out);
      BST.depths(n.right, depth + 1, out);
    }
    return out;
  }
};

function layoutTree(root) {
  const pos = new Map();
  let order = 0;
  const walk = (n, depth) => {
    if (!n) return;
    walk(n.left, depth + 1);
    pos.set(n.v, { order: ++order, depth });
    walk(n.right, depth + 1);
  };
  walk(root, 1);
  return { pos, count: order, height: BST.height(root) };
}

function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}

function trimLine(a, b, gapStart, gapEnd) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  return { x1: a.x + ux * gapStart, y1: a.y + uy * gapStart, x2: b.x - ux * gapEnd, y2: b.y - uy * gapEnd };
}

function drawTree(svg, root, options = {}) {
  const { gapX, gapY, r, padX, padTop, padBottom } = TREE;
  const layout = options.layout || layoutTree(root);
  const point = options.place || (v => {
    const p = layout.pos.get(v);
    return { x: padX + (p.order - 0.5) * gapX, y: padTop + (p.depth - 1) * gapY };
  });
  const box = options.box || { w: padX * 2 + Math.max(layout.count, 1) * gapX, h: padTop + padBottom + Math.max(layout.height - 1, 0) * gapY };
  svg.setAttribute('viewBox', `0 0 ${box.w} ${box.h}`);
  svg.replaceChildren();
  const edges = svgEl('g');
  const nodes = svgEl('g');
  const overlay = svgEl('g');
  const walk = n => {
    if (!n) return;
    const a = point(n.v);
    for (const child of [n.left, n.right]) {
      if (!child) continue;
      const b = point(child.v);
      edges.append(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `edge ${options.edgeClass ? options.edgeClass(n.v, child.v) : ''}` }));
      walk(child);
    }
    const g = svgEl('g', { class: `node ${options.nodeClass ? options.nodeClass(n.v) : ''}`, transform: `translate(${a.x} ${a.y})` });
    g.append(svgEl('circle', { r }), svgEl('text', {}, n.v));
    if (options.onClick) g.addEventListener('click', () => options.onClick(n.v));
    nodes.append(g);
  };
  walk(root);
  if (options.arrows) {
    const marker = svgEl('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' });
    marker.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }));
    const defs = svgEl('defs');
    defs.append(marker);
    svg.append(defs);
  }
  svg.append(edges, nodes, overlay);
  return { point, overlay, r };
}

class Player {
  constructor(el, onStep) {
    this.el = el;
    this.onStep = onStep;
    this.total = 1;
    this.index = 0;
    this.timer = null;
    el.className = 'player';
    el.innerHTML = `
      <button data-act="reset">重置</button>
      <button data-act="prev">上一步</button>
      <button data-act="toggle" class="primary">播放</button>
      <button data-act="next">下一步</button>
      <span class="progress"></span>
      <label class="speed">慢<input type="range" min="1" max="5" value="3" aria-label="播放速度">快</label>`;
    this.buttons = {};
    el.querySelectorAll('button').forEach(button => {
      this.buttons[button.dataset.act] = button;
      button.addEventListener('click', () => this[button.dataset.act]());
    });
    this.speed = el.querySelector('input');
    this.speed.addEventListener('input', () => {
      if (this.timer) {
        this.pause();
        this.play();
      }
    });
    this.progress = el.querySelector('.progress');
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === ' ' && !e.target.closest('button')) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  load(total, index = 0) {
    this.pause();
    this.total = Math.max(total, 1);
    this.go(index);
  }

  go(index) {
    this.index = Math.min(Math.max(index, 0), this.total - 1);
    this.onStep(this.index);
    this.refresh();
  }

  next() {
    if (this.index < this.total - 1) this.go(this.index + 1);
  }

  prev() {
    this.pause();
    this.go(this.index - 1);
  }

  reset() {
    this.pause();
    this.go(0);
  }

  toggle() {
    if (this.timer) this.pause();
    else this.play();
  }

  play() {
    if (this.total < 2) return;
    if (this.index >= this.total - 1) this.go(0);
    this.timer = setInterval(() => {
      this.next();
      if (this.index >= this.total - 1) this.pause();
    }, DELAYS[this.speed.value - 1]);
    this.refresh();
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
    this.refresh();
  }

  refresh() {
    const last = this.index >= this.total - 1;
    this.buttons.reset.disabled = this.index === 0;
    this.buttons.prev.disabled = this.index === 0;
    this.buttons.next.disabled = last;
    this.buttons.toggle.disabled = this.total < 2;
    this.buttons.toggle.textContent = this.timer ? '暂停' : '播放';
    this.progress.textContent = `第 ${this.index + 1} / ${this.total} 步`;
  }
}

renderNav();
