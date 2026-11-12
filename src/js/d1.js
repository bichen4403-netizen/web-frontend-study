const calm = matchMedia('(prefers-reduced-motion: reduce)');
let data;
let plan;
let player;
let shown = null;
let anim = 0;

async function init() {
  data = await loadData('d1');
  $('#kind').textContent = `交互方式：${data.interaction}`;
  $('#title').textContent = data.title;
  $('#question').textContent = data.question;
  $('#code').innerHTML = data.rules.lines.map(line => `<li>${escapeHtml(line)}</li>`).join('');
  $('#legend').textContent = data.rules.legend;
  $('#tips-title').textContent = data.tips.title;
  $('#tips').innerHTML = data.tips.items.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
  const [min, max] = data.range;
  Object.assign($('#value'), { value: data.defaultValue, min, max });
  $('#size').value = data.randomSize;
  $('#size-out').textContent = data.randomSize;
  player = new Player($('#player'), show);
  $('#insert').addEventListener('click', startInsert);
  $('#value').addEventListener('keydown', e => {
    if (e.key === 'Enter') startInsert();
  });
  $('#random-value').addEventListener('click', () => {
    $('#value').value = randomValue();
  });
  $('#preset').addEventListener('click', () => setTree(BST.build(data.presetTree)));
  $('#random-tree').addEventListener('click', () => setTree(randomTree(Number($('#size').value))));
  $('#size').addEventListener('input', () => {
    $('#size-out').textContent = $('#size').value;
  });
  $('#log').addEventListener('click', e => {
    const button = e.target.closest('button[data-step]');
    if (!button) return;
    player.pause();
    player.go(Number(button.dataset.step));
  });
  setTree(BST.build(data.presetTree));
}

function setTree(tree) {
  const [min, max] = data.range;
  plan = { before: tree, after: tree, value: null, added: [], steps: [{ kind: 'idle', path: [], line: 0, text: fill(data.text.idle, { min, max }) }] };
  shown = null;
  player.load(1);
}

function startInsert() {
  const raw = $('#value').value.trim();
  const v = Number(raw);
  const [min, max] = data.range;
  if (raw === '' || !Number.isInteger(v) || v < min || v > max) {
    $('#status').innerHTML = fill(data.text.invalid, { min, max });
    $('#value').focus();
    return;
  }
  const finished = player.index === plan.steps.length - 1;
  const added = finished && plan.value !== null && !plan.dup ? [...plan.added, plan.value] : plan.added;
  plan = makePlan(finished ? plan.after : plan.before, v, added);
  player.load(plan.steps.length);
}

function makePlan(root, v, added) {
  const t = data.text;
  const steps = [{ kind: 'start', path: [], line: 1, text: fill(t.start, { v, root: root.v }) }];
  const path = [];
  let cur = root;
  while (true) {
    path.push(cur.v);
    if (v === cur.v) {
      steps.push({ kind: 'equal', at: cur.v, path: [...path], line: 4, text: fill(t.equal, { v, x: cur.v }), log: fill(t.logEqual, { v, x: cur.v }) });
      return { before: root, after: root, value: v, added, steps, dup: true };
    }
    const left = v < cur.v;
    const next = left ? cur.left : cur.right;
    const text = next
      ? fill(left ? t.goLeft : t.goRight, { v, x: cur.v, next: next.v })
      : fill(left ? t.goLeftEnd : t.goRightEnd, { v, x: cur.v });
    steps.push({ kind: 'compare', at: cur.v, left, path: [...path], line: left ? 2 : 3, text, log: fill(left ? t.logLeft : t.logRight, { v, x: cur.v }) });
    if (!next) {
      steps.push({ kind: 'slot', at: cur.v, path: [...path], line: 5, text: fill(left ? t.slotLeft : t.slotRight, { v, x: cur.v }) });
      steps.push({ kind: 'attach', at: v, path: [...path, v], line: 6, text: fill(left ? t.doneLeft : t.doneRight, { v, x: cur.v, k: path.length, d: path.length + 1 }) });
      return { before: root, after: BST.insert(BST.clone(root), v), value: v, added, steps };
    }
    cur = next;
  }
}

function show(i) {
  const step = plan.steps[i];
  animate(frameOf(step), step);
  $('#status').innerHTML = step.text;
  $('#code').querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', k + 1 === step.line));
  renderLog(i);
  renderHistory(step);
  if (step.kind === 'attach') $('#tips-card').classList.remove('hidden');
}

function frameOf(step) {
  const grown = step.kind === 'slot' || step.kind === 'attach';
  const { count, height } = layoutTree(plan.before);
  const box = { w: TREE.padX * 2 + (count + 1) * TREE.gapX, h: TREE.padTop + TREE.padBottom + height * TREE.gapY };
  const pos = place(grown ? plan.after : plan.before, grown ? 0 : 0.5);
  return { pos, box, badge: badgeAt(step, pos) };
}

function place(root, shift) {
  const pos = new Map();
  layoutTree(root).pos.forEach((p, v) => {
    pos.set(v, { x: TREE.padX + (p.order - 0.5 + shift) * TREE.gapX, y: TREE.padTop + (p.depth - 1) * TREE.gapY });
  });
  return pos;
}

function badgeAt(step, pos) {
  if (!['start', 'compare', 'equal'].includes(step.kind)) return null;
  const at = step.kind === 'start' ? plan.before.v : step.at;
  const p = pos.get(at);
  return { x: p.x + sideOf(at) * 24, y: p.y - TREE.r - 17, o: 1 };
}

function sideOf(v) {
  let cur = plan.before;
  let side = 0;
  while (cur && cur.v !== v) {
    side = v < cur.v ? -1 : 1;
    cur = v < cur.v ? cur.left : cur.right;
  }
  return side;
}

function animate(target, step) {
  cancelAnimationFrame(anim);
  const from = shown;
  if (!from || calm.matches) {
    paint(target, step);
    return;
  }
  const begin = performance.now();
  const tick = now => {
    const k = Math.min((now - begin) / 450, 1);
    paint(mix(from, target, k < 0.5 ? 2 * k * k : 1 - (2 - 2 * k) ** 2 / 2), step);
    if (k < 1) anim = requestAnimationFrame(tick);
  };
  anim = requestAnimationFrame(tick);
}

function mix(a, b, e) {
  const lerp = (p, q) => p + (q - p) * e;
  const pos = new Map();
  b.pos.forEach((q, v) => {
    const p = a.pos.get(v) || q;
    pos.set(v, { x: lerp(p.x, q.x), y: lerp(p.y, q.y) });
  });
  const box = { w: lerp(a.box.w, b.box.w), h: lerp(a.box.h, b.box.h) };
  let badge = null;
  if (a.badge || b.badge) {
    const from = a.badge || { ...b.badge, o: 0 };
    const to = b.badge || { ...(b.pos.get(plan.value) || from), o: 0 };
    badge = { x: lerp(from.x, to.x), y: lerp(from.y, to.y), o: lerp(from.o, to.o) };
  }
  return { pos, box, badge };
}

function paint(frame, step) {
  shown = frame;
  const onPath = new Set(step.path);
  const added = new Set(plan.added);
  const view = drawTree($('#tree'), step.kind === 'attach' ? plan.after : plan.before, {
    place: v => frame.pos.get(v),
    box: frame.box,
    arrows: true,
    nodeClass: v => {
      if (v === step.at) return { attach: 'new', equal: 'current same' }[step.kind] || 'current';
      if (onPath.has(v)) return 'visited';
      return added.has(v) ? 'added' : '';
    },
    edgeClass: (a, b) => onPath.has(a) && onPath.has(b) ? 'path' : ''
  });
  decorate(view, step, frame.badge);
}

function decorate({ point, overlay, r }, step, badge) {
  const v = plan.value;
  if (step.kind === 'compare') {
    const a = point(step.at);
    const child = BST.find(plan.before, step.at)[step.left ? 'left' : 'right'];
    const line = child
      ? trimLine(a, point(child.v), r + 3, r + 8)
      : trimLine(a, { x: a.x + (step.left ? -0.5 : 0.5) * TREE.gapX, y: a.y + 0.8 * TREE.gapY }, r + 3, 0);
    overlay.append(svgEl('line', { ...line, class: 'arrow' }));
  }
  if (step.kind === 'slot') {
    const a = point(step.at);
    const b = point(v);
    overlay.append(svgEl('line', { ...trimLine(a, b, r, r), class: 'ghost-edge' }));
    const ghost = svgEl('g', { class: 'ghost', transform: `translate(${b.x} ${b.y})` });
    ghost.append(svgEl('circle', { r }), svgEl('text', {}, v));
    overlay.append(ghost);
  }
  if (badge && badge.o > 0.02) {
    const g = svgEl('g', { class: 'badge', transform: `translate(${badge.x} ${badge.y})`, opacity: badge.o });
    g.append(svgEl('rect', { x: -18, y: -12, width: 36, height: 24, rx: 12 }), svgEl('text', {}, v));
    overlay.append(g);
  }
}

function renderLog(i) {
  const t = data.text;
  const rows = [];
  plan.steps.forEach((step, k) => {
    if (k <= i && step.log) rows.push(`<li${k === i ? ' class="current"' : ''}><button type="button" data-step="${k}">${step.log}</button></li>`);
  });
  const kind = plan.steps[i].kind;
  if (kind === 'attach') rows.push(`<li class="total">${fill(t.total, { k: rows.length })}</li>`);
  if (kind === 'equal') rows.push(`<li class="total dup">${fill(t.totalEqual, { k: rows.length })}</li>`);
  $('#log').innerHTML = rows.length ? rows.join('') : `<li class="empty">${escapeHtml(t.logEmpty)}</li>`;
}

function renderHistory(step) {
  const list = step.kind === 'attach' ? [...plan.added, plan.value] : plan.added;
  $('#history').innerHTML = list.length ? fill(data.text.history, { list: list.join('、') }) : escapeHtml(data.text.historyEmpty);
}

function randomValue() {
  const [min, max] = data.range;
  const used = new Set(BST.inorder(plan.after));
  const free = [];
  for (let v = min; v <= max; v++) if (!used.has(v)) free.push(v);
  return free[Math.floor(Math.random() * free.length)];
}

function randomTree(n) {
  const [min, max] = data.range;
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  let best = null;
  for (let t = 0; t < 40; t++) {
    const tree = BST.build(shuffle(pool).slice(0, n));
    if (!best || BST.height(tree) < BST.height(best)) best = tree;
  }
  return best;
}

init().catch(console.error);
