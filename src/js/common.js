function renderNav() {
  let page = document.body.dataset.page;
  let links = [
    ['index', 'index.html', '首页'],
    ['d1', 'd1.html', '难点 1'],
    ['d2', 'd2.html', '难点 2'],
    ['d3', 'd3.html', '难点 3']
  ];
  let html = '<a class="brand" href="index.html">二叉搜索树 · 三个难点</a>';
  for (let i = 0; i < links.length; i++) {
    let cls = links[i][0] === page ? 'link active' : 'link';
    html += '<a class="' + cls + '" href="' + links[i][1] + '">' + links[i][2] + '</a>';
  }
  let nav = document.getElementById('nav');
  nav.className = 'nav';
  nav.innerHTML = html;
}

function loadData(name) {
  return fetch('../data/' + name + '.json')
    .then(function (res) {
      return res.json();
    })
    .catch(function (err) {
      let p = document.createElement('p');
      p.className = 'load-error';
      p.textContent = '没有读到 data/' + name + '.json，请用 Live Server 或在线地址打开，不要直接双击 HTML 文件。';
      document.querySelector('main').prepend(p);
      throw err;
    });
}

function showHead(data) {
  document.getElementById('kind').textContent = '交互方式：' + data.interaction;
  document.getElementById('title').textContent = data.title;
  document.getElementById('question').textContent = data.question;
}

function fmt(str, obj) {
  for (let key in obj) {
    str = str.split('{' + key + '}').join(obj[key]);
  }
  return str;
}

function insertNode(root, v) {
  let node = { v: v, left: null, right: null };
  if (root === null) return node;
  let cur = root;
  while (cur.v !== v) {
    if (v < cur.v) {
      if (cur.left === null) cur.left = node;
      cur = cur.left;
    } else {
      if (cur.right === null) cur.right = node;
      cur = cur.right;
    }
  }
  return root;
}

function buildTree(values) {
  let root = null;
  for (let i = 0; i < values.length; i++) {
    root = insertNode(root, values[i]);
  }
  return root;
}

function findNode(root, v) {
  let cur = root;
  while (cur !== null && cur.v !== v) {
    cur = v < cur.v ? cur.left : cur.right;
  }
  return cur;
}

function treeHeight(node) {
  if (node === null) return 0;
  return 1 + Math.max(treeHeight(node.left), treeHeight(node.right));
}

function drawTree(svg, root, opt) {
  let gapX = 56;
  let gapY = 72;
  let top = 60;
  let pos = {};
  let count = 0;
  let rows = 1;

  function walk(node, depth) {
    if (node === null) return;
    walk(node.left, depth + 1);
    count++;
    let i = opt.order ? opt.order.indexOf(node.v) + 1 : count;
    pos[node.v] = { x: i * gapX, y: top + depth * gapY };
    if (depth + 1 > rows) rows = depth + 1;
    walk(node.right, depth + 1);
  }
  walk(root, 0);

  if (opt.order) count = opt.order.length;
  if (opt.rows && opt.rows > rows) rows = opt.rows;
  let w = (count + 1) * gapX;
  let h = top + (rows - 1) * gapY + 40;

  let edges = '';
  let nodes = '';

  function addEdge(a, b) {
    if (b.v === opt.hidden) return;
    let cls = 'edge';
    if (b.v === opt.ghost) cls = 'ghost-edge';
    else if (opt.edgeClass) cls += ' ' + opt.edgeClass(a.v, b.v);
    let p = pos[a.v];
    let q = pos[b.v];
    edges += '<line class="' + cls + '" x1="' + p.x + '" y1="' + p.y + '" x2="' + q.x + '" y2="' + q.y + '"></line>';
  }

  function addNode(node) {
    if (node === null) return;
    if (node.left) addEdge(node, node.left);
    if (node.right) addEdge(node, node.right);
    if (node.v !== opt.hidden) {
      let cls = 'node';
      if (node.v === opt.ghost) cls = 'ghost';
      else if (opt.nodeClass) cls += ' ' + opt.nodeClass(node.v);
      let p = pos[node.v];
      nodes += '<g class="' + cls + '" data-v="' + node.v + '" transform="translate(' + p.x + ' ' + p.y + ')">';
      nodes += '<circle r="21"></circle><text>' + node.v + '</text></g>';
    }
    addNode(node.left);
    addNode(node.right);
  }
  addNode(root);

  let defs = '<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"></path></marker></defs>';
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  svg.innerHTML = defs + edges + nodes;

  if (opt.onClick) {
    let list = svg.querySelectorAll('.node');
    for (let i = 0; i < list.length; i++) {
      list[i].addEventListener('click', function () {
        opt.onClick(Number(this.dataset.v));
      });
    }
  }
  return { w: w, h: h, pos: pos };
}

function arrowSvg(p, q) {
  let dx = q.x - p.x;
  let dy = q.y - p.y;
  let len = Math.sqrt(dx * dx + dy * dy);
  let ux = dx / len;
  let uy = dy / len;
  return '<line class="arrow" x1="' + (p.x + ux * 25) + '" y1="' + (p.y + uy * 25) + '" x2="' + (q.x - ux * 27) + '" y2="' + (q.y - uy * 27) + '"></line>';
}

let steps = [];
let cursor = 0;
let timer = null;
let speed = 800;

function initPlayer(list, start) {
  pause();
  steps = list;
  cursor = start;
  draw();
}

function draw() {
  render(steps[cursor]);
  updatePanel();
}

function next() {
  if (cursor < steps.length - 1) {
    cursor++;
    draw();
  }
  if (cursor === steps.length - 1) {
    pause();
  }
}

function prev() {
  pause();
  if (cursor > 0) {
    cursor--;
    draw();
  }
}

function play() {
  if (timer) return;
  if (cursor === steps.length - 1) {
    cursor = 0;
    draw();
  }
  timer = setInterval(next, speed);
  updatePanel();
}

function pause() {
  clearInterval(timer);
  timer = null;
  updatePanel();
}

function setSpeed(ms) {
  speed = ms;
  if (timer) {
    clearInterval(timer);
    timer = setInterval(next, speed);
  }
}

function reset() {
  pause();
  cursor = 0;
  draw();
}

function updatePanel() {
  if (steps.length === 0) return;
  document.getElementById('btn-prev').disabled = cursor === 0;
  document.getElementById('btn-next').disabled = cursor === steps.length - 1;
  document.getElementById('btn-play').disabled = steps.length < 2;
  document.getElementById('btn-play').textContent = timer ? '暂停' : '播放';
  document.getElementById('progress').textContent = '第 ' + (cursor + 1) + ' / ' + steps.length + ' 帧';
}

document.addEventListener('keydown', function (e) {
  let tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    e.target.blur();
    if (timer) pause();
    else play();
  }
  if (e.code === 'ArrowRight') next();
  if (e.code === 'ArrowLeft') prev();
});

renderNav();
