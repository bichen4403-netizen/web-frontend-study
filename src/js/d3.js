let data;
let orderA;
let orderB;

loadData('d3').then(function (d) {
  data = d;
  showHead(data);
  let options = '';
  for (let i = 0; i < data.orders.length; i++) {
    options += '<option value="' + i + '">' + data.orders[i].name + '</option>';
  }
  document.getElementById('sel-a').innerHTML = options;
  document.getElementById('sel-b').innerHTML = options;
  document.getElementById('sel-a').value = data.left;
  document.getElementById('sel-b').value = data.right;
  changeOrder();
});

function changeOrder() {
  orderA = data.orders[Number(document.getElementById('sel-a').value)];
  orderB = data.orders[Number(document.getElementById('sel-b').value)];
  initPlayer(buildSteps(orderA.values, orderB.values), 0);
}

function buildSteps(a, b) {
  let t = data.text;
  let list = [];
  list.push({ k: 0, note: t.start });
  for (let k = 1; k <= a.length; k++) {
    list.push({ k: k, note: fmt(t.insert, { k: k, a: a[k - 1], b: b[k - 1] }) });
  }
  let ha = treeHeight(buildTree(a));
  let hb = treeHeight(buildTree(b));
  list.push({ k: a.length, end: true, note: fmt(t.done, { ha: ha, hb: hb }) });
  return list;
}

function render(state) {
  drawSide('a', orderA, state);
  drawSide('b', orderB, state);
  document.getElementById('note').textContent = state.note;
}

function drawSide(id, order, state) {
  let values = order.values;
  let part = values.slice(0, state.k);
  let tree = buildTree(part);
  let last = state.end ? null : part[part.length - 1];
  let sorted = values.slice().sort(function (x, y) {
    return x - y;
  });

  drawTree(document.getElementById('tree-' + id), tree, {
    order: sorted,
    rows: values.length,
    nodeClass: function (x) {
      return x === last ? 'new' : '';
    }
  });

  document.getElementById('name-' + id).textContent = order.name + '：' + values.join(' → ');

  let html = '';
  for (let i = 0; i < values.length; i++) {
    let cls = 'chip';
    if (i < state.k) cls += ' done';
    if (values[i] === last) cls = 'chip current';
    html += '<span class="' + cls + '">' + values[i] + '</span>';
  }
  document.getElementById('chips-' + id).innerHTML = html;
  document.getElementById('stat-' + id).textContent = fmt(data.text.height, { h: treeHeight(tree) });
}
