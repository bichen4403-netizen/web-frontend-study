let data;
let root;

loadData('d2').then(function (d) {
  data = d;
  showHead(data);
  let html = '';
  for (let i = 0; i < data.guide.length; i++) {
    html += '<li>' + data.guide[i] + '</li>';
  }
  document.getElementById('guide').innerHTML = html;
  let options = '';
  for (let i = 0; i < data.trees.length; i++) {
    options += '<option value="' + i + '">' + data.trees[i].name + '</option>';
  }
  document.getElementById('tree-select').innerHTML = options;
  chooseTree(0);
});

function chooseTree(i) {
  root = buildTree(data.trees[i].values);
  initPlayer([{ target: null, cand: null, note: data.text.start }], 0);
}

function pick(x) {
  let state = steps[cursor];
  let t = data.text;
  pause();
  if (state.target === null) {
    let node = findNode(root, x);
    if (node.left === null || node.right === null) {
      document.getElementById('note').textContent = fmt(t.notTwo, { x: x });
      return;
    }
    addStep({ target: x, cand: null, note: fmt(t.target, { x: x }) });
  } else {
    if (x === state.target) {
      document.getElementById('note').textContent = fmt(t.self, { x: x });
      return;
    }
    addStep({ target: state.target, cand: x, note: fmt(t.candidate, { c: x, x: state.target }) });
  }
}

function addStep(state) {
  let list = steps.slice(0, cursor + 1);
  list.push(state);
  initPlayer(list, list.length - 1);
}

function render(state) {
  drawTree(document.getElementById('tree'), root, {
    nodeClass: function (x) {
      if (x === state.target) return 'target clickable';
      if (x === state.cand) return 'candidate clickable';
      return 'clickable';
    },
    onClick: pick
  });
  document.getElementById('note').textContent = state.note;
  let t = data.text;
  document.getElementById('choice').textContent = fmt(t.choice, {
    t: state.target === null ? t.none : state.target,
    c: state.cand === null ? t.none : state.cand
  });
}
