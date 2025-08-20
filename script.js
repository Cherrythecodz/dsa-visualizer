/* ---------------------------
   GLOBAL STATE / HELPERS
--------------------------- */
let currentAlgo = null;
let steps = [];         // sequence of step objects to animate
let stepIndex = 0;
let timer = null;
let delay = 250;

const qs = (s)=>document.querySelector(s);
const canvas = qs('#canvas');

function updateSpeed(v){ delay = +v; }
function setInfo(t){ qs('#stepText').textContent = t; }
function setAlgoName(n){ qs('#algoName').textContent = n || '—'; }
function clearTimer(){ if (timer){ clearInterval(timer); timer=null; } }
function resetVis(){
  clearTimer(); steps=[]; stepIndex=0;
  canvas.className = 'canvas';
  canvas.innerHTML = `<div class="empty"><div class="play-icon">▶</div>
    <div class="empty-title">Ready to Visualize</div>
    <div class="empty-sub">Pick an algorithm, then Generate or enter input.</div></div>`;
  setInfo('Visualization reset.');
}

/* ---------------------------
   ALGO CATALOG (info only)
--------------------------- */
const ALGO = {
  // Sorting (already implemented earlier)
  bubble:   {group:'sort', title:'Bubble Sort',
    pseudo:`for i=0..n-2:
  for j=0..n-i-2:
    if a[j] > a[j+1]: swap`, complexity:{best:'O(n)',avg:'O(n²)',worst:'O(n²)',space:'O(1)'}},
  selection:{group:'sort', title:'Selection Sort',
    pseudo:`for i=0..n-2:
  min=i; for j=i+1..n-1:
    if a[j]<a[min]: min=j
  swap(a[i],a[min])`, complexity:{best:'O(n²)',avg:'O(n²)',worst:'O(n²)',space:'O(1)'}},
  insertion:{group:'sort', title:'Insertion Sort',
    pseudo:`for i=1..n-1:
  key=a[i]; j=i-1
  while j>=0 and a[j]>key:
    a[j+1]=a[j]; j--
  a[j+1]=key`, complexity:{best:'O(n)',avg:'O(n²)',worst:'O(n²)',space:'O(1)'}},
  merge:    {group:'sort', title:'Merge Sort',
    pseudo:`mergeSort(l,r):
  if l>=r: return
  m=(l+r)/2
  mergeSort(l,m); mergeSort(m+1,r)
  merge(l,m,r)`, complexity:{best:'O(n log n)',avg:'O(n log n)',worst:'O(n log n)',space:'O(n)'}},
  quick:    {group:'sort', title:'Quick Sort',
    pseudo:`quick(l,r):
  if l>=r: return
  p=partition(l,r)
  quick(l,p-1); quick(p+1,r)`, complexity:{best:'O(n log n)',avg:'O(n log n)',worst:'O(n²)',space:'O(log n)'}},
  heap:     {group:'sort', title:'Heap Sort',
    pseudo:`build max-heap
for end=n-1..1:
  swap(a[0],a[end]); heapify(0,end)`,
    complexity:{best:'O(n log n)',avg:'O(n log n)',worst:'O(n log n)',space:'O(1)'}},

  // Searching
  linear:   {group:'search', title:'Linear Search',
    pseudo:`for i=0..n-1:
  if a[i]==target: return i
return -1`,
    complexity:{best:'O(1)',avg:'O(n)',worst:'O(n)',space:'O(1)'}},
  binary:   {group:'search', title:'Binary Search (sorted)',
    pseudo:`l=0; r=n-1
while l<=r:
  m=(l+r)/2
  if a[m]==target: return m
  else if a[m]<target: l=m+1
  else: r=m-1
return -1`,
    complexity:{best:'O(1)',avg:'O(log n)',worst:'O(log n)',space:'O(1)'}},

  // Trees (BST traversals)
  bst_in:   {group:'tree', title:'BST Inorder',
    pseudo:`build BST from values
inorder(node):
  if !node: return
  inorder(node.left)
  visit(node)
  inorder(node.right)`,
    complexity:{best:'O(n)',avg:'O(n)',worst:'O(n)',space:'O(h)'}},
  bst_pre:  {group:'tree', title:'BST Preorder',
    pseudo:`pre(node):
  if !node: return
  visit(node)
  pre(node.left)
  pre(node.right)`,
    complexity:{best:'O(n)',avg:'O(n)',worst:'O(n)',space:'O(h)'}},
  bst_post: {group:'tree', title:'BST Postorder',
    pseudo:`post(node):
  if !node: return
  post(node.left)
  post(node.right)
  visit(node)`,
    complexity:{best:'O(n)',avg:'O(n)',worst:'O(n)',space:'O(h)'}},

  // Graphs (grid)
  bfs:      {group:'graph', title:'BFS (Grid)',
    pseudo:`push start
while q not empty:
  v=pop
  for each neighbor:
    if unvisited and not wall:
      mark parent, push`,
    complexity:{best:'O(V+E)',avg:'O(V+E)',worst:'O(V+E)',space:'O(V)'}},
  dfs:      {group:'graph', title:'DFS (Grid)',
    pseudo:`dfs(v):
  mark visited
  for each neighbor:
    if unvisited: dfs(n)`,
    complexity:{best:'O(V+E)',avg:'O(V+E)',worst:'O(V+E)',space:'O(V)'}},
  dijkstra: {group:'graph', title:'Dijkstra (Grid, weights)',
    pseudo:`dist[start]=0; pq={start}
while pq:
  u=extract-min
  for each neighbor v:
    if dist[u]+w(u,v) < dist[v]:
      relax & update parent`,
    complexity:{best:'O((V+E) log V)',avg:'O((V+E) log V)',worst:'O((V+E) log V)',space:'O(V)'}}
};

function selectAlgorithm(key){
  currentAlgo = key;
  setAlgoName(ALGO[key].title);
  qs('#pseudo').textContent = ALGO[key].pseudo;
  const c = ALGO[key].complexity;
  qs('#best').textContent=c.best; qs('#avg').textContent=c.avg;
  qs('#worst').textContent=c.worst; qs('#space').textContent=c.space;

  // switch canvas mode visuals
  canvas.innerHTML = '';
  canvas.className = 'canvas';
  if (ALGO[key].group === 'graph') {
    canvas.classList.add('graph');
  }
  setInfo(`Selected ${ALGO[key].title}. Click Generate or enter input.`);
}

/* ---------------------------
   GENERATE DATA FOR MODE
--------------------------- */
function generateForCurrent(){
  const g = currentAlgo ? ALGO[currentAlgo].group : 'sort';

  if (g === 'sort' || g === 'search'){
    // array
    const size = 25;
    const arr = Array.from({length:size}, ()=> Math.floor(Math.random()*90)+10);
    qs('#arrayInput').value = (g==='search' ? arr.sort((a,b)=>a-b) : arr).join(',');
    if (g==='search'){
      const pick = arr[Math.floor(Math.random()*arr.length)];
      qs('#targetInput').value = pick;
    }
    drawBarsFromInput();
    setInfo('Random array generated.');
    steps=[]; stepIndex=0;
    return;
  }

  if (g === 'tree'){
    const size = 13;
    const values = Array.from({length:size}, ()=> Math.floor(Math.random()*90)+10);
    qs('#arrayInput').value = values.join(',');
    drawTreeFromInput(); // builds and draws immediately
    steps=[]; stepIndex=0;
    setInfo('BST built from random values.');
    return;
  }

  if (g === 'graph'){
    const rows = +qs('#rows').value, cols = +qs('#cols').value, walls = +qs('#walls').value;
    buildGrid(rows, cols, walls);
    steps=[]; stepIndex=0;
    setInfo('Random grid created. Start=top-left, Goal=bottom-right.');
  }
}

/* =========================================================
   SORTING + SEARCHING RENDERER (bars)
========================================================= */
function drawBars(arr, markA=-1, markB=-1, fixed=new Set()){
  canvas.className = 'canvas';
  canvas.innerHTML = '';
  const max = Math.max(...arr, 1);
  arr.forEach((v,i)=>{
    const d = document.createElement('div');
    d.className = 'bar';
    d.style.height = `${Math.max(10, (v/max)*(canvas.clientHeight-40))}px`;
    d.textContent = v;
    if (i===markA) d.classList.add('hlA');
    else if (i===markB) d.classList.add('hlB');
    if (fixed.has(i)) d.classList.add('sorted');
    canvas.appendChild(d);
  });
}
function drawBarsFromInput(){
  const arr = getArrayInput();
  if (arr) drawBars(arr);
}
function getArrayInput(){
  const raw = qs('#arrayInput').value.trim();
  if (!raw) return null;
  const arr = raw.split(',').map(s=>Number(s.trim())).filter(Number.isFinite);
  return arr.length?arr:null;
}

/* ---------- Sorting (reuse your previous sorters) ---------- */
function pushStep(arr, info, markA, markB, fixed){ steps.push({type:'bars', arr:arr.slice(), info, markA, markB, fixed: new Set(fixed||[]) }); }

const SORTERS = {
  bubble(arr){
    steps=[]; const fixed=new Set();
    for(let i=0;i<arr.length-1;i++){
      for(let j=0;j<arr.length-i-1;j++){
        pushStep(arr,`Compare a[${j}] & a[${j+1}]`,j,j+1,fixed);
        if(arr[j]>arr[j+1]){ [arr[j],arr[j+1]]=[arr[j+1],arr[j]]; pushStep(arr,'Swap',j,j+1,fixed); }
      }
      fixed.add(arr.length-1-i); pushStep(arr,`Fix index ${arr.length-1-i}`,-1,-1,fixed);
    }
    fixed.add(0); pushStep(arr,'Sorted',-1,-1,fixed); return steps;
  },
  selection(arr){
    steps=[]; const fixed=new Set();
    for(let i=0;i<arr.length-1;i++){
      let min=i; pushStep(arr,`Pass i=${i}`,i,-1,fixed);
      for(let j=i+1;j<arr.length;j++){
        pushStep(arr,`Compare a[${j}] with min a[${min}]`,min,j,fixed);
        if(arr[j]<arr[min]){ min=j; pushStep(arr,`New min @${min}`,min,j,fixed); }
      }
      [arr[i],arr[min]]=[arr[min],arr[i]]; fixed.add(i);
      pushStep(arr,`Swap and fix ${i}`,i,min,fixed);
    }
    fixed.add(arr.length-1); pushStep(arr,'Sorted',-1,-1,fixed); return steps;
  },
  insertion(arr){
    steps=[]; const fixed=new Set();
    for(let i=1;i<arr.length;i++){
      const key=arr[i]; let j=i-1; pushStep(arr,`Key=${key}`,i,-1,fixed);
      while(j>=0 && arr[j]>key){ arr[j+1]=arr[j]; j--; pushStep(arr,`Shift`,j+1,-1,fixed); }
      arr[j+1]=key; pushStep(arr,`Insert at ${j+1}`,j+1,-1,fixed);
    }
    pushStep(arr,'Sorted',-1,-1,new Set([...Array(arr.length).keys()])); return steps;
  },
  merge(arr){
    steps=[]; const tmp=arr.slice(); const fixed=new Set();
    function merge(l,m,r){
      let i=l,j=m+1,k=l;
      while(i<=m && j<=r){
        pushStep(arr,`Merge compare a[${i}] & a[${j}]`,i,j,fixed);
        if(arr[i]<=arr[j]) tmp[k++]=arr[i++]; else tmp[k++]=arr[j++];
      }
      while(i<=m) tmp[k++]=arr[i++]; while(j<=r) tmp[k++]=arr[j++];
      for(let t=l;t<=r;t++){ arr[t]=tmp[t]; fixed.add(t); pushStep(arr,`Write back ${t}`,t,-1,fixed); }
    }
    function sort(l,r){ if(l>=r){ pushStep(arr,`Base [${l}]`,l,-1,fixed); return; }
      const m=(l+r>>1); sort(l,m); sort(m+1,r); merge(l,m,r); }
    sort(0,arr.length-1);
    pushStep(arr,'Sorted',-1,-1,new Set([...Array(arr.length).keys()])); return steps;
  },
  quick(arr){
    steps=[]; const fixed=new Set();
    function part(l,r){
      const pivot=arr[r]; let i=l; pushStep(arr,`Pivot=${pivot}`,-1,r,fixed);
      for(let j=l;j<r;j++){
        pushStep(arr,`Compare a[${j}] with pivot`,j,r,fixed);
        if(arr[j]<=pivot){ [arr[i],arr[j]]=[arr[j],arr[i]]; pushStep(arr,'Swap',i,j,fixed); i++; }
      }
      [arr[i],arr[r]]=[arr[r],arr[i]]; fixed.add(i); pushStep(arr,`Pivot placed @${i}`,i,r,fixed); return i;
    }
    function sort(l,r){ if(l>=r){ if(l===r){ fixed.add(l); pushStep(arr,`Fix ${l}`,-1,-1,fixed); } return; }
      const p=part(l,r); sort(l,p-1); sort(p+1,r); }
    sort(0,arr.length-1);
    pushStep(arr,'Sorted',-1,-1,new Set([...Array(arr.length).keys()])); return steps;
  },
  heap(arr){
    steps=[]; const fixed=new Set(); const n=arr.length;
    function heapify(n,i){
      let largest=i,l=2*i+1,r=2*i+2;
      if(l<n){ pushStep(arr,'Compare left',i,l,fixed); if(arr[l]>arr[largest]) largest=l; }
      if(r<n){ pushStep(arr,'Compare right',i,r,fixed); if(arr[r]>arr[largest]) largest=r; }
      if(largest!==i){ [arr[i],arr[largest]]=[arr[largest],arr[i]]; pushStep(arr,'Swap',i,largest,fixed); heapify(n,largest); }
    }
    for(let i=Math.floor(n/2)-1;i>=0;i--) heapify(n,i);
    pushStep(arr,'Max-heap built',-1,-1,fixed);
    for(let end=n-1; end>0; end--){ [arr[0],arr[end]]=[arr[end],arr[0]]; fixed.add(end);
      pushStep(arr,`Move max to ${end}`,0,end,fixed); heapify(end,0); }
    fixed.add(0); pushStep(arr,'Sorted',-1,-1,fixed); return steps;
  }
};

/* ---------- Searching (bars) ---------- */
function searchSteps_linear(arr, target){
  steps=[]; for(let i=0;i<arr.length;i++){
    pushStep(arr,`Check index ${i}`,i,-1,new Set());
    if(arr[i]===target){ pushStep(arr,`Found at ${i}`,i,-1,new Set([i])); break; }
  }
  if (!steps.length) pushStep(arr,'Not found',-1,-1,new Set());
  return steps;
}
function searchSteps_binary(arr, target){
  steps=[]; let l=0,r=arr.length-1;
  while(l<=r){
    const m = Math.floor((l+r)/2);
    pushStep(arr,`mid=${m}`,m,-1,rangeSet(l,r));
    if(arr[m]===target){ pushStep(arr,`Found at ${m}`,m,-1,new Set([m])); break; }
    if(arr[m]<target){ l=m+1; pushStep(arr,`Go right`,m,-1,rangeSet(l,r)); }
    else { r=m-1; pushStep(arr,`Go left`,m,-1,rangeSet(l,r)); }
  }
  return steps;
}
function rangeSet(l,r){ const s=new Set(); for(let i=l;i<=r;i++) s.add(i); return s; }

/* =========================================================
   TREES — BST build + draw + traversals
========================================================= */
function Node(v){ this.v=v; this.l=null; this.r=null; this.x=0; this.y=0; }
function bstInsert(root, v){
  if(!root) return new Node(v);
  if(v < root.v) root.l = bstInsert(root.l, v);
  else root.r = bstInsert(root.r, v);
  return root;
}
function buildBST(values){
  let root=null; values.forEach(v=> root = bstInsert(root, v)); return root;
}
function layoutTree(root){
  // compute x via inorder index; y by depth
  let x=0;
  function dfs(n, depth){
    if(!n) return;
    dfs(n.l, depth+1);
    n.x = x++; n.y = depth;
    dfs(n.r, depth+1);
  }
  dfs(root,0);
}
function drawTree(root, highlight = new Set(), done = new Set()){
  canvas.innerHTML = '';
  canvas.className = 'canvas';
  // convert to absolute positions
  if(!root){ return; }
  const nodes=[];
  (function collect(n){ if(!n) return; nodes.push(n); collect(n.l); collect(n.r);} )(root);

  const maxX = Math.max(...nodes.map(n=>n.x));
  const maxY = Math.max(...nodes.map(n=>n.y));
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const gx = (W-80)/Math.max(1,maxX), gy = Math.min(110, (H-60)/Math.max(1,maxY+1));

  // draw edges first
  function place(n){
    const cx = 40 + n.x*gx, cy = 40 + n.y*gy;
    if(n.l){
      const lx = 40 + n.l.x*gx, ly = 40 + n.l.y*gy;
      drawEdge(cx,cy,lx,ly);
      place(n.l);
    }
    if(n.r){
      const rx = 40 + n.r.x*gx, ry = 40 + n.r.y*gy;
      drawEdge(cx,cy,rx,ry);
      place(n.r);
    }
  }
  function drawEdge(x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1;
    const len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
    const e=document.createElement('div'); e.className='edge';
    e.style.width=`${len}px`; e.style.left=`${x1}px`; e.style.top=`${y1}px`;
    e.style.transform=`rotate(${ang}deg)`; canvas.appendChild(e);
  }
  place(root);

  // draw nodes
  nodes.forEach(n=>{
    const cx = 40 + n.x*gx, cy = 40 + n.y*gy;
    const d=document.createElement('div'); d.className='node';
    if (highlight.has(n)) d.classList.add('visit');
    if (done.has(n)) d.classList.add('done');
    d.style.left=`${cx-22}px`; d.style.top=`${cy-22}px`;
    d.textContent=n.v;
    canvas.appendChild(d);
  });
}
function traversalSteps(root, kind){
  steps=[];
  function push(info, hi=new Set(), done=new Set()){ steps.push({type:'tree', info, hi, done}); }
  const visited=[];
  function inorder(n){ if(!n) return; push(`Traverse left of ${n.v}`, new Set([n]));
    inorder(n.l); visited.push(n); push(`Visit ${n.v}`, new Set([n]), new Set(visited));
    inorder(n.r); }
  function preorder(n){ if(!n) return; visited.push(n); push(`Visit ${n.v}`, new Set([n]), new Set(visited));
    preorder(n.l); preorder(n.r); }
  function postorder(n){ if(!n) return; push(`Left of ${n.v}`, new Set([n]));
    postorder(n.l); push(`Right of ${n.v}`, new Set([n]));
    postorder(n.r); visited.push(n); push(`Visit ${n.v}`, new Set([n]), new Set(visited)); }
  if (kind==='in') inorder(root);
  if (kind==='pre') preorder(root);
  if (kind==='post') postorder(root);
  return steps;
}
function drawTreeFromInput(){
  const arr = getArrayInput(); if(!arr) return alert('Enter values to build BST (comma-separated).');
  const root = buildBST(arr);
  layoutTree(root);
  drawTree(root);
  // stash a last-built root on window for play/step
  window.__BST = root;
}

/* =========================================================
   GRAPHS — grid build + BFS / DFS / Dijkstra
========================================================= */
let GRID = null; // {rows, cols, start, goal, cells:[{wall, w}]}
function buildGrid(rows, cols, wallPct){
  GRID = {rows, cols, start:0, goal:rows*cols-1, cells:[]};
  canvas.innerHTML=''; canvas.className='canvas';
  const grid = document.createElement('div');
  grid.className='grid'; grid.style.gridTemplateColumns=`repeat(${cols}, 1fr)`;
  GRID.gridEl = grid;
  for(let i=0;i<rows*cols;i++){
    const c = {wall:false, w:1};
    // walls
    if (i!==0 && i!==rows*cols-1 && Math.random()*100 < wallPct) c.wall=true;
    // random weights for Dijkstra (1..9) on non-walls
    if (!c.wall) c.w = Math.floor(Math.random()*9)+1;
    GRID.cells.push(c);

    const el = document.createElement('div');
    el.className='cell' + (c.wall?' wall':'') + (i===0?' start':'') + (i===rows*cols-1?' goal':'');
    if (!c.wall && c.w>1) { el.classList.add('weight'); el.dataset.w=c.w; }
    c.el = el;
    grid.appendChild(el);
  }
  canvas.appendChild(grid);
}
function neighbors(idx){
  const {rows, cols} = GRID;
  const r = Math.floor(idx/cols), c = idx%cols;
  const list=[];
  if(r>0) list.push(idx-cols);
  if(r<rows-1) list.push(idx+cols);
  if(c>0) list.push(idx-1);
  if(c<cols-1) list.push(idx+1);
  return list.filter(i=>!GRID.cells[i].wall);
}
function graphSteps_BFS(){
  steps=[]; const start=GRID.start, goal=GRID.goal;
  const q=[start], par=Array(GRID.cells.length).fill(-1), seen=new Set([start]);
  steps.push({type:'gridMark', info:'Start BFS', frontier:new Set([start])});
  while(q.length){
    const u = q.shift();
    steps.push({type:'gridVisit', info:`Visit ${u}`, visit:u});
    if(u===goal) break;
    for(const v of neighbors(u)){
      if(!seen.has(v)){
        seen.add(v); par[v]=u; q.push(v);
        steps.push({type:'gridFrontier', info:`Add ${v} to frontier`, frontier:new Set([v])});
      }
    }
  }
  // reconstruct
  const path = new Set();
  let t=goal; if(par[t]!==-1 || t===start){ while(t!==-1){ path.add(t); t=par[t]; } }
  steps.push({type:'gridPath', info:'Draw shortest path', path});
  return steps;
}
function graphSteps_DFS(){
  steps=[]; const start=GRID.start, goal=GRID.goal;
  const seen=new Set(); const par=Array(GRID.cells.length).fill(-1);
  function dfs(u){
    steps.push({type:'gridVisit', info:`Visit ${u}`, visit:u});
    if(u===goal) return true;
    seen.add(u);
    for(const v of neighbors(u)){
      if(!seen.has(v)){
        steps.push({type:'gridFrontier', info:`Go to ${v}`, frontier:new Set([v])});
        par[v]=u;
        if(dfs(v)) return true;
      }
    }
    return false;
  }
  dfs(start);
  const path=new Set(); let t=goal; if(par[t]!==-1 || t===start){ while(t!==-1){ path.add(t); t=par[t]; } }
  steps.push({type:'gridPath', info:'Draw DFS path', path});
  return steps;
}
function graphSteps_Dijkstra(){
  steps=[]; const n=GRID.cells.length, start=GRID.start, goal=GRID.goal;
  const dist=Array(n).fill(Infinity), par=Array(n).fill(-1), used=new Set();
  dist[start]=0;
  function minNode(){
    let m=-1, md=Infinity;
    for(let i=0;i<n;i++) if(!used.has(i) && !GRID.cells[i].wall && dist[i]<md){ md=dist[i]; m=i; }
    return m;
  }
  while(true){
    const u=minNode(); if(u===-1) break; used.add(u);
    steps.push({type:'gridVisit', info:`Fix node ${u} (d=${dist[u]})`, visit:u});
    if(u===goal) break;
    for(const v of neighbors(u)){
      const w = GRID.cells[v].w || 1;
      if(dist[u]+w < dist[v]){
        dist[v]=dist[u]+w; par[v]=u;
        steps.push({type:'gridFrontier', info:`Relax ${u}→${v} (w=${w})`, frontier:new Set([v])});
      }
    }
  }
  const path=new Set(); let t=goal; if(par[t]!==-1 || t===start){ while(t!==-1){ path.add(t); t=par[t]; } }
  steps.push({type:'gridPath', info:'Draw min-distance path', path});
  return steps;
}

/* =========================================================
   ENGINE: play / step
========================================================= */
function applyStep(s){
  if (s.type === 'bars'){
    drawBars(s.arr, s.markA??-1, s.markB??-1, s.fixed??new Set());
  } else if (s.type === 'tree'){
    drawTree(window.__BST, s.hi||new Set(), s.done||new Set());
  } else if (s.type && s.type.startsWith('grid')){
    // mark grid states
    if (!GRID || !GRID.gridEl) return;
    if (s.type==='gridFrontier'){
      s.frontier.forEach(i=> GRID.cells[i].el.classList.add('frontier'));
    } else if (s.type==='gridVisit'){
      GRID.cells[s.visit].el.classList.remove('frontier');
      GRID.cells[s.visit].el.classList.add('visited');
    } else if (s.type==='gridPath'){
      s.path.forEach(i=> {
        GRID.cells[i].el.classList.remove('frontier');
        GRID.cells[i].el.classList.add('path');
      });
    }
  }
  setInfo(s.info || '');
}

function play(){
  if(!currentAlgo) return alert('Select an algorithm first.');
  if(!steps.length) prepareSteps();
  if(!steps.length) return;
  clearTimer();
  timer = setInterval(()=>{
    if(stepIndex >= steps.length){ clearTimer(); setInfo('Done ✅'); return; }
    applyStep(steps[stepIndex++]);
  }, delay);
}
function pause(){ clearTimer(); }
function step(){
  if(!currentAlgo) return alert('Select an algorithm first.');
  if(!steps.length) prepareSteps();
  if(!steps.length) return;
  if(stepIndex >= steps.length) return;
  applyStep(steps[stepIndex++]);
}

function prepareSteps(){
  const g = ALGO[currentAlgo].group;

  if (g==='sort'){
    const arr = getArrayInput(); if(!arr) return alert('Enter array or click Generate.');
    steps = SORTERS[currentAlgo](arr.slice()); stepIndex=0; return;
  }
  if (g==='search'){
    const arr = getArrayInput(); if(!arr) return alert('Enter array (binary search expects sorted).');
    const tRaw = qs('#targetInput').value.trim(); const target = Number(tRaw);
    if (!Number.isFinite(target)) return alert('Enter numeric target.');
    drawBars(arr); // base view
    steps = (currentAlgo==='linear') ? searchSteps_linear(arr, target)
                                     : searchSteps_binary(arr, target);
    stepIndex=0; return;
  }
  if (g==='tree'){
    const arr = getArrayInput(); if(!arr) return alert('Enter values to build BST.');
    const root = buildBST(arr); layoutTree(root); window.__BST=root; drawTree(root);
    const kind = currentAlgo==='bst_in'?'in': currentAlgo==='bst_pre'?'pre':'post';
    steps = traversalSteps(root, kind); stepIndex=0; return;
  }
  if (g==='graph'){
    if(!GRID) buildGrid(+qs('#rows').value, +qs('#cols').value, +qs('#walls').value);
    if (currentAlgo==='bfs') steps = graphSteps_BFS();
    if (currentAlgo==='dfs') steps = graphSteps_DFS();
    if (currentAlgo==='dijkstra') steps = graphSteps_Dijkstra();
    stepIndex=0; return;
  }
}

/* ---------------------------
   INIT
--------------------------- */
window.addEventListener('resize', ()=>{
  // redraw tree/bars on resize (best-effort)
  if (!steps.length) return;
  const last = steps[Math.max(0, stepIndex-1)];
  applyStep(last);
});

// pick a default
selectAlgorithm('bubble');
