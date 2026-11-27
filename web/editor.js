// Editör arayüzü (DOM): kutuları çizer, sürükleme ve bağlama, ayarlar ve sonuç paneli.
// Hesaplama tamamen Workflow ve COMPONENTS'te; bu dosya yalnızca görüntü ve fare/klavye olayları.

import { COMPONENTS, summarize } from './components.js';
import { Workflow, PRESETS } from './workflow.js';

const canvas = document.getElementById('canvas');
const svg = document.getElementById('edges');
const side = document.getElementById('side');
const toast = document.getElementById('toast');

let wf = new Workflow(COMPONENTS);
let results = new Map();
let selected = null;
let pendingFrom = null; // bağlantı başlatılan çıkış kutusu

const ctx = {
  async load(name) {
    const res = await fetch(`../tests/data/${name}`);
    if (!res.ok) throw new Error(`${name} okunamadı`);
    return res.text();
  },
};

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function showError(message) {
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(showError.timer);
  showError.timer = setTimeout(() => (toast.style.display = 'none'), 3200);
}

// ---- Palet ve hazır akışlar ----
function buildPalette() {
  const palette = document.getElementById('palette');
  const groups = {};
  for (const [type, def] of Object.entries(COMPONENTS)) (groups[def.group] ??= []).push([type, def]);
  for (const [group, items] of Object.entries(groups)) {
    palette.insertAdjacentHTML('beforeend', `<h3>${esc(group)}</h3>`);
    for (const [type, def] of items) {
      const b = document.createElement('button');
      b.className = 'pal';
      b.innerHTML = `${esc(def.title)}<small>${esc(def.note)}</small>`;
      b.onclick = () => {
        const n = wf.nodes.size;
        const id = wf.addNode(type, 60 + (n % 4) * 60, 60 + (n % 6) * 50 + canvas.scrollTop);
        select(id);
        render();
      };
      palette.appendChild(b);
    }
  }
  const presetSel = document.getElementById('preset');
  for (const name of Object.keys(PRESETS)) presetSel.add(new Option(name, name));
  document.getElementById('load').onclick = () => loadPreset(presetSel.value);
  document.getElementById('clear').onclick = () => {
    wf = new Workflow(COMPONENTS);
    results = new Map();
    select(null);
    render();
  };
  document.getElementById('run').onclick = runAll;
}

function loadPreset(name) {
  wf = new Workflow(COMPONENTS);
  PRESETS[name](wf);
  results = new Map();
  select(null);
  render();
}

// ---- Çizim ----
function render() {
  canvas.querySelectorAll('.node').forEach((el) => el.remove());
  for (const node of wf.nodes.values()) canvas.appendChild(nodeElement(node));
  drawEdges();
}

function nodeElement(node) {
  const def = COMPONENTS[node.type];
  const el = document.createElement('div');
  el.className = 'node' + (node.id === selected ? ' sel' : '');
  el.dataset.id = node.id;
  el.dataset.group = def.group;
  el.style.left = `${node.x}px`;
  el.style.top = `${node.y}px`;
  const result = results.get(node.id);
  const status = !result ? '' : result.error ? `⚠ ${esc(result.error)}` : `✓ ${esc(summarize(result.value))} · ${result.ms} ms`;
  el.innerHTML = `
    <div class="head"><b>${esc(def.title)}</b><small>${esc(def.note)}</small></div>
    <div class="ports">
      ${def.inputs.map((p) => `<div class="port in"><span class="dot" data-in="${p.name}"></span>${esc(p.label)}</div>`).join('')}
      ${def.output ? `<div class="port out">çıktı: ${esc(def.output)}<span class="dot${pendingFrom === node.id ? ' pending' : ''}" data-out="1"></span></div>` : ''}
    </div>
    <div class="status ${result ? (result.error ? 'err' : 'ok') : ''}">${status}</div>`;

  el.querySelector('.head').addEventListener('pointerdown', (ev) => startDrag(ev, node, el));
  el.addEventListener('click', (ev) => {
    if (ev.target.classList.contains('dot')) return;
    select(node.id);
  });
  const out = el.querySelector('[data-out]');
  if (out) out.onclick = (ev) => {
    ev.stopPropagation();
    pendingFrom = pendingFrom === node.id ? null : node.id;
    render();
  };
  el.querySelectorAll('[data-in]').forEach((dot) => {
    dot.onclick = (ev) => {
      ev.stopPropagation();
      if (!pendingFrom) return showError('Önce bir kutunun çıkış noktasına tıklayın');
      try {
        wf.connect(pendingFrom, node.id, dot.dataset.in);
      } catch (err) {
        showError(err.message);
      }
      pendingFrom = null;
      render();
    };
  });
  return el;
}

function dotCenter(selector) {
  const dot = canvas.querySelector(selector);
  if (!dot) return null;
  const r = dot.getBoundingClientRect();
  const c = canvas.getBoundingClientRect();
  return { x: r.left - c.left + canvas.scrollLeft + r.width / 2, y: r.top - c.top + canvas.scrollTop + r.height / 2 };
}

function drawEdges() {
  svg.innerHTML = '';
  for (const e of wf.edges) {
    const a = dotCenter(`.node[data-id="${e.from}"] [data-out]`);
    const b = dotCenter(`.node[data-id="${e.to}"] [data-in="${e.port}"]`);
    if (!a || !b) continue;
    const dx = Math.max(40, (b.x - a.x) / 2);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#2f6da3');
    path.setAttribute('stroke-width', '2.5');
    svg.appendChild(path);
  }
}

function startDrag(ev, node, el) {
  ev.preventDefault();
  select(node.id, false);
  const startX = ev.clientX, startY = ev.clientY, x0 = node.x, y0 = node.y;
  const move = (e) => {
    node.x = Math.max(0, x0 + e.clientX - startX);
    node.y = Math.max(0, y0 + e.clientY - startY);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    drawEdges();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// ---- Yan panel: ayarlar ve sonuç ----
function select(id, rerender = true) {
  selected = id;
  if (rerender) render();
  else canvas.querySelectorAll('.node').forEach((el) => el.classList.toggle('sel', el.dataset.id === id));
  renderSide();
}

function renderSide() {
  if (!selected || !wf.nodes.has(selected)) {
    side.innerHTML = '<p class="muted">Bir kutu seçin: ayarları ve çalıştırınca sonucu burada görünür.</p>';
    return;
  }
  const node = wf.nodes.get(selected);
  const def = COMPONENTS[node.type];
  side.innerHTML = `<h2>${esc(def.title)}</h2><p class="muted">${esc(def.note)}</p>`;
  for (const [key, c] of Object.entries(def.config)) {
    const label = document.createElement('label');
    label.textContent = c.label;
    side.appendChild(label);
    let input;
    if (c.kind === 'select') {
      input = document.createElement('select');
      for (const o of c.options) input.add(new Option(o, o));
      input.value = node.config[key];
    } else if (c.kind === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = node.config[key];
    } else {
      input = document.createElement(c.kind === 'textarea' ? 'textarea' : 'input');
      if (c.kind !== 'textarea') input.type = 'text';
      input.value = node.config[key];
    }
    input.onchange = () => (node.config[key] = c.kind === 'checkbox' ? input.checked : input.value);
    side.appendChild(input);
  }
  const del = document.createElement('button');
  del.className = 'del';
  del.textContent = 'Kutuyu sil';
  del.onclick = () => {
    wf.removeNode(node.id);
    select(null);
  };
  side.appendChild(del);
  side.insertAdjacentHTML('beforeend', resultHtml(results.get(node.id)));
}

function resultHtml(result) {
  if (!result) return '<p class="muted" style="margin-top:16px">Henüz çalıştırılmadı.</p>';
  if (result.error) return `<h2 style="margin-top:16px;color:#b3261e">Hata</h2><p>${esc(result.error)}</p>`;
  const v = result.value;
  let html = `<h2 style="margin-top:16px">Sonuç <span class="muted">(${result.ms} ms)</span></h2>`;
  if (v.type === 'docs') {
    html += `<p>${v.docs.length} belge</p><table>${v.docs.slice(0, 8).map((d) => `<tr><td>${esc(d.id)}</td><td>${esc(d.text.slice(0, 80))}…</td></tr>`).join('')}</table>`;
  } else if (v.type === 'patterns') {
    html += `<p>${v.patterns.map(esc).join(', ')}</p>`;
  } else if (v.type === 'matches') {
    const r = v.record;
    html += `<p><b>Seçilen atom:</b> ${esc(r.selected ?? '—')}</p><p class="muted">${esc(r.why ?? '')}</p>`;
    html += `<p><b>${v.matches.length}</b> eşleşme (ilk 50):</p><table><tr><th>belge</th><th>desen</th><th>konum</th></tr>` +
      v.matches.slice(0, 50).map((m) => `<tr><td>${esc(m.id)}</td><td>${esc(m.pattern)}</td><td>${m.position}</td></tr>`).join('') + '</table>';
    html += `<p class="muted" style="margin-top:10px">explain (record):</p><pre>${esc(JSON.stringify({ selected: r.selected, shape: r.shape, estimates: Object.fromEntries(Object.entries(r.estimates ?? {}).map(([k, e]) => [k, e.applicable ? `${e.cost.toPrecision(3)} ms` : `uygulanamaz: ${e.reason}`])) }, null, 2))}</pre>`;
  } else if (v.type === 'report') {
    html += `<p><b>${esc(v.method)}</b></p><p>${v.summary.contaminated} / ${v.summary.items} soru kirli · ${v.summary.patterns} desen · seçilen atom: <b>${esc(v.record?.selected ?? '—')}</b></p>`;
    html += '<table><tr><th>soru</th><th>eşleşen desen</th><th>eğitim kaydı</th></tr>' +
      v.items.filter((i) => i.contaminated).map((i) => `<tr><td>${esc(i.id)}</td><td>${i.matchedPatterns}/${i.patterns}</td><td>${esc(i.docs.join(', '))}</td></tr>`).join('') + '</table>';
  }
  return html;
}

async function runAll() {
  const btn = document.getElementById('run');
  btn.disabled = true;
  btn.textContent = 'Çalışıyor…';
  try {
    results = await wf.run(ctx);
  } catch (err) {
    showError(err.message);
  }
  btn.disabled = false;
  btn.textContent = '▶ Çalıştır';
  render();
  renderSide();
}

document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && selected && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    wf.removeNode(selected);
    select(null);
  }
  if (ev.key === 'Escape') {
    pendingFrom = null;
    render();
  }
});

buildPalette();
loadPreset(Object.keys(PRESETS)[0]);
