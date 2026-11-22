let data;
let baseValues;
let value;

loadData('d1').then(function (d) {
  data = d;
  showHead(data);
  let html = '';
  for (let i = 0; i < data.rules.length; i++) {
    html += '<li>' + data.rules[i] + '</li>';
  }
  document.getElementById('code').innerHTML = html;
  baseValues = data.presetTree;
  document.getElementById('value').value = data.defaultValue;
  startInsert();
});

function startInsert() {
  let v = Number(document.getElementById('value').value);
  if (!Number.isInteger(v) || v < data.min || v > data.max) {
    pause();
    document.getElementById('note').textContent = fmt(data.text.invalid, { min: data.min, max: data.max });
    return;
  }
  value = v;
  initPlayer(buildSteps(baseValues, v), 0);
}

function randomInt() {
  return data.min + Math.floor(Math.random() * (data.max - data.min + 1));
}

function randomValue() {
  let v;
  do {
    v = randomInt();
  } while (baseValues.indexOf(v) >= 0);
  document.getElementById('value').value = v;
}

function setTree(values) {
  baseValues = values;
  startInsert();
}

function randomTree() {
  let values = [];
  while (values.length < data.randomSize) {
    let v = randomInt();
    if (values.indexOf(v) < 0) values.push(v);
  }
  setTree(values);
}

function buildSteps(values, v) {
  let t = data.text;
  let root = buildTree(values);
  let list = [];
  let path = [];
  let log = [];
  list.push({ path: [], cur: null, line: 1, note: fmt(t.start, { v: v, root: root.v }), log: [] });

  let cur = root;
  while (true) {
    path.push(cur.v);
    if (v === cur.v) {
      log.push(fmt(t.logEqual, { v: v, x: cur.v }));
      list.push({ path: path.slice(), cur: cur.v, same: true, line: 4, note: fmt(t.equal, { v: v, x: cur.v }), log: log.slice() });
      break;
    }
    let left = v < cur.v;
    let child = left ? cur.left : cur.right;
    let note;
    if (child) note = fmt(left ? t.goLeft : t.goRight, { v: v, x: cur.v, next: child.v });
    else note = fmt(left ? t.goLeftEnd : t.goRightEnd, { v: v, x: cur.v });
    log.push(fmt(left ? t.logLeft : t.logRight, { v: v, x: cur.v }));
    list.push({ path: path.slice(), cur: cur.v, to: child ? child.v : v, line: left ? 2 : 3, note: note, log: log.slice() });

    if (child === null) {
      list.push({ path: path.slice(), cur: null, ghost: true, line: 5, note: fmt(left ? t.slotLeft : t.slotRight, { v: v, x: cur.v }), log: log.slice() });
      list.push({ path: path.concat([v]), cur: null, done: true, line: 6, note: fmt(t.done, { v: v, x: cur.v, k: path.length }), log: log.slice() });
      break;
    }
    cur = child;
  }
  return list;
}

function render(state) {
  let svg = document.getElementById('tree');
  let isNew = baseValues.indexOf(value) < 0;
  let tree = buildTree(baseValues.concat([value]));
  let opt = {
    nodeClass: function (x) {
      if (x === state.cur) return state.same ? 'current same' : 'current';
      if (state.done && x === value) return 'new';
      if (state.path.indexOf(x) >= 0) return 'visited';
      return '';
    },
    edgeClass: function (a, b) {
      if (state.path.indexOf(a) >= 0 && state.path.indexOf(b) >= 0) return 'path';
      return '';
    }
  };
  if (isNew && state.ghost) opt.ghost = value;
  else if (isNew && !state.done) opt.hidden = value;

  let box = drawTree(svg, tree, opt);
  let extra = '';
  if (state.to !== undefined) extra += arrowSvg(box.pos[state.cur], box.pos[state.to]);
  if (!state.done && !state.same) {
    extra += '<text class="top-label" x="' + box.w / 2 + '" y="24">' + fmt(data.text.label, { v: value }) + '</text>';
  }
  svg.innerHTML += extra;

  document.getElementById('note').textContent = state.note;

  let lines = document.querySelectorAll('#code li');
  for (let i = 0; i < lines.length; i++) {
    lines[i].className = i + 1 === state.line ? 'on' : '';
  }

  let html = '';
  for (let i = 0; i < state.log.length; i++) {
    let cls = i === state.log.length - 1 ? ' class="current"' : '';
    html += '<li' + cls + '>' + state.log[i] + '</li>';
  }
  if (state.log.length === 0) html = '<li class="empty">' + data.text.logEmpty + '</li>';
  if (state.done) html += '<li class="total">' + fmt(data.text.total, { k: state.log.length }) + '</li>';
  document.getElementById('log').innerHTML = html;
}
