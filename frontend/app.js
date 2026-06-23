/* ══════════════════════════════════════════════════════════════════
   Pokédex Frontend — Single Page Application
   ══════════════════════════════════════════════════════════════════ */

const API = '/api';

// ── State ──────────────────────────────────────────────────────────
const state = {
  pokemon: [],
  total: 0,
  offset: 0,
  limit: 36,
  search: '',
  typeFilter: null,
  genFilter: null,
  types: [],
  currentView: 'list', // 'list' | 'detail' | 'types'
  currentPokemon: null,
  typeMatchup: null,
};

// ── Helpers ────────────────────────────────────────────────────────
const fetchJSON = async (url) => {
  const res = await fetch(url);
  return res.json();
};

const typeClass = (name) => `type-${name.toLowerCase()}`;

const statColors = {
  hp: '#ff5959', attack: '#f5ac78', defense: '#fae078',
  'special-attack': '#9db7f5', 'special-defense': '#a7db8d', speed: '#fa92b2'
};
const statLabels = {
  hp: 'HP', attack: '攻击', defense: '防御',
  'special-attack': '特攻', 'special-defense': '特防', speed: '速度'
};
const genNames = {
  1: '第一世代 · 关都', 2: '第二世代 · 城都', 3: '第三世代 · 丰缘',
  4: '第四世代 · 神奥', 5: '第五世代 · 合众', 6: '第六世代 · 卡洛斯',
  7: '第七世代 · 阿罗拉', 8: '第八世代 · 伽勒尔', 9: '第九世代 · 帕底亚',
};

// ── API calls ──────────────────────────────────────────────────────
async function loadTypes() {
  state.types = await fetchJSON(`${API}/types`);
}

async function loadPokemon() {
  const params = new URLSearchParams({
    limit: state.limit, offset: state.offset,
  });
  if (state.search) params.set('search', state.search);
  if (state.typeFilter) params.set('type_id', state.typeFilter);
  if (state.genFilter) params.set('generation', state.genFilter);

  const data = await fetchJSON(`${API}/pokemon?${params}`);
  state.pokemon = data.pokemon;
  state.total = data.total;
}

async function loadDetail(id) {
  state.currentPokemon = await fetchJSON(`${API}/pokemon/${id}`);
  state.currentView = 'detail';
  render();
}

async function loadTypeMatchup() {
  state.typeMatchup = await fetchJSON(`${API}/type-matchup`);
  state.currentView = 'types';
  render();
}

// ── Render: Header ─────────────────────────────────────────────────
function renderHeader() {
  return `
    <header class="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3 cursor-pointer" onclick="goHome()">
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <div class="w-6 h-6 bg-red-500 rounded-full border-4 border-white"></div>
          </div>
          <h1 class="text-xl font-bold tracking-wide">宝可梦图鉴 Pokédex</h1>
        </div>
        <nav class="flex gap-2">
          <button onclick="goHome()" class="px-4 py-1.5 rounded-full text-sm font-medium
            ${state.currentView === 'list' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'}">
            图鉴
          </button>
          <button onclick="loadTypeMatchup()" class="px-4 py-1.5 rounded-full text-sm font-medium
            ${state.currentView === 'types' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'}">
            属性克制
          </button>
        </nav>
      </div>
    </header>`;
}

// ── Render: Search & Filters ───────────────────────────────────────
function renderFilters() {
  const typeOptions = state.types.map(t =>
    `<option value="${t.id}" ${state.typeFilter == t.id ? 'selected' : ''}>${t.name_zh || t.name_en}</option>`
  ).join('');

  const genOptions = Object.entries(genNames).map(([id, name]) =>
    `<option value="${id}" ${state.genFilter == id ? 'selected' : ''}>${name}</option>`
  ).join('');

  return `
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <input id="search-input" type="text" placeholder="搜索宝可梦（名称/编号）..."
              value="${state.search}"
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white
                     focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent
                     text-sm shadow-sm"
              onkeydown="if(event.key==='Enter')doSearch()">
            <svg class="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
        <select id="type-select" onchange="doTypeFilter(this.value)"
          class="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-red-400">
          <option value="">全部属性</option>
          ${typeOptions}
        </select>
        <select id="gen-select" onchange="doGenFilter(this.value)"
          class="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-red-400">
          <option value="">全部世代</option>
          ${genOptions}
        </select>
      </div>
      <div class="mt-2 text-sm text-gray-500">
        共 <span class="font-semibold text-gray-700">${state.total}</span> 只宝可梦
      </div>
    </div>`;
}

// ── Render: Pokemon Grid ───────────────────────────────────────────
function renderGrid() {
  if (!state.pokemon.length) {
    return `<div class="text-center py-20 text-gray-400 text-lg">没有找到宝可梦</div>`;
  }

  const cards = state.pokemon.map(p => {
    const types = (p.types || []).map(t =>
      `<span class="type-badge ${typeClass(t.identifier)}">${t.name_zh || t.name_en}</span>`
    ).join(' ');

    const flags = [];
    if (p.is_legendary) flags.push('<span class="text-yellow-500 text-xs">★</span>');
    if (p.is_mythical) flags.push('<span class="text-purple-500 text-xs">◆</span>');

    const img = p.sprite_artwork || p.sprite_default || '';

    return `
      <div class="pokemon-card bg-white rounded-2xl shadow-sm border border-gray-100
                  cursor-pointer overflow-hidden" onclick="loadDetail(${p.id})">
        <div class="relative bg-gradient-to-b from-gray-50 to-white p-4 pb-2 flex justify-center">
          <img src="${img}" alt="${p.name_en}" class="w-28 h-28 object-contain"
               loading="lazy" onerror="this.style.display='none'">
          <span class="absolute top-2 right-3 text-xs font-mono text-gray-300">#${String(p.id).padStart(4, '0')}</span>
          ${flags.length ? `<div class="absolute top-2 left-3">${flags.join('')}</div>` : ''}
        </div>
        <div class="px-4 pb-4 text-center">
          <div class="font-bold text-gray-800 text-sm">${p.name_zh || p.name_en}</div>
          <div class="text-xs text-gray-400 mb-2">${p.name_en}</div>
          <div class="flex justify-center gap-1">${types}</div>
        </div>
      </div>`;
  }).join('');

  // Pagination
  const pages = Math.ceil(state.total / state.limit);
  const current = Math.floor(state.offset / state.limit) + 1;
  let pagination = '';
  if (pages > 1) {
    const btns = [];
    if (current > 1) btns.push(`<button onclick="goPage(${current - 1})" class="px-3 py-1 rounded-lg bg-white border text-sm hover:bg-gray-50">‹</button>`);
    for (let i = Math.max(1, current - 2); i <= Math.min(pages, current + 2); i++) {
      btns.push(`<button onclick="goPage(${i})"
        class="px-3 py-1 rounded-lg text-sm ${i === current ? 'bg-red-500 text-white' : 'bg-white border hover:bg-gray-50'}">${i}</button>`);
    }
    if (current < pages) btns.push(`<button onclick="goPage(${current + 1})" class="px-3 py-1 rounded-lg bg-white border text-sm hover:bg-gray-50">›</button>`);
    pagination = `<div class="flex justify-center gap-1 mt-6">${btns.join('')}</div>`;
  }

  return `
    <div class="max-w-7xl mx-auto px-4 pb-8">
      <div class="pokemon-grid">${cards}</div>
      ${pagination}
    </div>`;
}

// ── Render: Detail Modal ───────────────────────────────────────────
function renderDetail() {
  const p = state.currentPokemon;
  if (!p) return '';

  const types = (p.types || []).map(t =>
    `<span class="type-badge ${typeClass(t.identifier)} text-base px-4 py-1">${t.name_zh || t.name_en}</span>`
  ).join(' ');

  // Stats
  const statMax = 255;
  const statOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
  const statsHTML = statOrder.map(s => {
    const val = p.stats?.[s] || 0;
    const pct = Math.min(100, (val / statMax) * 100);
    const color = statColors[s] || '#888';
    return `
      <div class="flex items-center gap-3">
        <span class="w-12 text-xs text-gray-500 text-right font-medium">${statLabels[s]}</span>
        <span class="w-8 text-sm font-bold text-gray-700">${val}</span>
        <div class="flex-1 stat-bar-bg">
          <div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join('');
  const totalStat = statOrder.reduce((sum, s) => sum + (p.stats?.[s] || 0), 0);

  // Abilities
  const abilities = (p.abilities || []).map(a => {
    const hidden = a.is_hidden ? '<span class="text-xs text-gray-400">(隐藏特性)</span>' : '';
    return `<div class="text-sm"><span class="font-medium">${a.name_zh || a.name_en}</span> ${hidden}
      ${a.short_effect_zh || a.short_effect_en ? `<div class="text-xs text-gray-500 mt-0.5">${a.short_effect_zh || a.short_effect_en}</div>` : ''}
    </div>`;
  }).join('');

  // Moves
  const moves = (p.moves_levelup || []).slice(0, 20).map(m => {
    const mtype = state.types.find(t => t.id === m.type_id);
    return `<tr class="border-b border-gray-50">
      <td class="py-1.5 text-xs text-gray-500">${m.level_learned || '—'}</td>
      <td class="py-1.5 text-sm font-medium">${m.name_zh || m.name_en}</td>
      <td class="py-1.5">${mtype ? `<span class="type-badge ${typeClass(mtype.identifier)} text-[10px]">${mtype.name_zh}</span>` : ''}</td>
      <td class="py-1.5 text-xs text-gray-600">${m.power || '—'}</td>
      <td class="py-1.5 text-xs text-gray-600">${m.accuracy || '—'}</td>
      <td class="py-1.5 text-xs text-gray-500">${m.damage_class === 'physical' ? '物理' : m.damage_class === 'special' ? '特殊' : m.damage_class === 'status' ? '变化' : '—'}</td>
    </tr>`;
  }).join('');

  // Evolution chain
  let evoHTML = '';
  if (p.evolutions && p.evolutions.length > 0) {
    const evoItems = p.evolutions.map((e, i) => {
      const arrow = i > 0 ? `<div class="evo-arrow flex flex-col items-center mx-1">
        <span class="text-base">→</span>
        ${e.min_level ? `<span class="text-[10px] text-gray-400">Lv.${e.min_level}</span>` : ''}
        ${e.trigger === 'use-item' && e.item ? `<span class="text-[10px] text-gray-400">${e.item}</span>` : ''}
      </div>` : '';
      const isActive = e.species_id === p.species_id;
      const sprite = e.evo_sprite || '';
      return `${arrow}
        <div class="flex flex-col items-center ${isActive ? 'ring-2 ring-red-400 rounded-xl bg-red-50 p-2' : 'p-2'}"
             ${e.evo_pokemon_id ? `onclick="loadDetail(${e.evo_pokemon_id})" style="cursor:pointer"` : ''}>
          ${sprite ? `<img src="${sprite}" class="w-16 h-16 object-contain">` : ''}
          <span class="text-xs font-medium mt-1">${e.evo_name_zh || e.evo_name_en || '?'}</span>
        </div>`;
    }).join('');
    evoHTML = `
      <div class="mt-4">
        <h3 class="text-sm font-bold text-gray-700 mb-2">进化链</h3>
        <div class="flex items-center justify-center flex-wrap bg-gray-50 rounded-xl p-4">${evoItems}</div>
      </div>`;
  }

  const img = p.sprite_artwork || p.sprite_default || '';
  const flags = [];
  if (p.is_legendary) flags.push('<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">★ 传说</span>');
  if (p.is_mythical) flags.push('<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">◆ 幻之</span>');
  if (p.is_baby) flags.push('<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">幼年</span>');

  return `
    <div class="modal-overlay" onclick="if(event.target===this)closeDetail()">
      <div class="modal-content">
        <div class="relative">
          <button onclick="closeDetail()" class="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 rounded-full
            flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm">✕</button>

          <!-- Header -->
          <div class="bg-gradient-to-br from-gray-50 to-white p-6 pb-4 rounded-t-2xl">
            <div class="flex flex-col sm:flex-row items-center gap-6">
              <div class="w-48 h-48 flex items-center justify-center">
                ${img ? `<img src="${img}" class="w-full h-full object-contain drop-shadow-lg">` : ''}
              </div>
              <div class="text-center sm:text-left flex-1">
                <div class="text-xs text-gray-400 font-mono">#${String(p.id).padStart(4, '0')}</div>
                <h2 class="text-2xl font-bold text-gray-800">${p.name_zh || p.name_en}</h2>
                <div class="text-sm text-gray-400 mb-2">${p.name_en}</div>
                ${p.genus_zh || p.genus_en ? `<div class="text-sm text-gray-500 mb-2">「${p.genus_zh || p.genus_en}」</div>` : ''}
                <div class="flex gap-2 justify-center sm:justify-start mb-2">${types}</div>
                <div class="flex gap-2 justify-center sm:justify-start flex-wrap">${flags.join('')}</div>
                <div class="flex gap-4 mt-3 text-xs text-gray-500 justify-center sm:justify-start">
                  <span>身高: ${((p.height || 0) / 10).toFixed(1)}m</span>
                  <span>体重: ${((p.weight || 0) / 10).toFixed(1)}kg</span>
                  <span>捕获率: ${p.capture_rate ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <!-- Description -->
            ${p.flavor_zh || p.flavor_en ? `
              <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 italic">
                "${p.flavor_zh || p.flavor_en}"
              </div>` : ''}

            <!-- Stats -->
            <div>
              <h3 class="text-sm font-bold text-gray-700 mb-3">种族值 <span class="text-gray-400 font-normal">合计 ${totalStat}</span></h3>
              <div class="space-y-2">${statsHTML}</div>
            </div>

            <!-- Abilities -->
            ${abilities ? `<div>
              <h3 class="text-sm font-bold text-gray-700 mb-2">特性</h3>
              <div class="space-y-2">${abilities}</div>
            </div>` : ''}

            <!-- Evolution -->
            ${evoHTML}

            <!-- Moves -->
            ${moves ? `
              <div>
                <h3 class="text-sm font-bold text-gray-700 mb-2">升级招式</h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-left">
                    <thead>
                      <tr class="border-b-2 border-gray-100 text-xs text-gray-400">
                        <th class="py-2 w-12">Lv.</th><th class="py-2">名称</th><th class="py-2">属性</th>
                        <th class="py-2 w-12">威力</th><th class="py-2 w-12">命中</th><th class="py-2 w-14">分类</th>
                      </tr>
                    </thead>
                    <tbody>${moves}</tbody>
                  </table>
                </div>
              </div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

// ── Render: Type Chart ─────────────────────────────────────────────
function renderTypeChart() {
  if (!state.typeMatchup || !state.types.length) return '<div class="text-center py-20 text-gray-400">加载中...</div>';

  const types = state.types.filter(t => t.id <= 18); // 18 main types
  const matrix = state.typeMatchup;

  const factorIcon = (f) => {
    if (f === 200) return '<span class="text-green-600 font-bold">2×</span>';
    if (f === 50) return '<span class="text-red-500 font-bold">½</span>';
    if (f === 0) return '<span class="text-gray-400 font-bold">0</span>';
    return '<span class="text-gray-300">1</span>';
  };

  const headerCells = types.map(t =>
    `<th class="p-1 text-[10px] font-bold text-white ${typeClass(t.identifier)}" style="writing-mode:vertical-rl;transform:rotate(180deg);height:60px">
      ${t.name_zh || t.name_en}
    </th>`
  ).join('');

  const rows = types.map(atk => {
    const cells = types.map(def => {
      const factor = matrix[atk.id]?.[def.id] ?? 100;
      return `<td class="p-1 text-center text-xs border border-gray-100">${factorIcon(factor)}</td>`;
    }).join('');
    return `<tr>
      <td class="p-1.5 text-xs font-bold text-white ${typeClass(atk.identifier)} whitespace-nowrap sticky left-0 z-10">${atk.name_zh || atk.name_en}</td>
      ${cells}
    </tr>`;
  }).join('');

  return `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <h2 class="text-xl font-bold text-gray-800 mb-1">属性克制表</h2>
      <p class="text-sm text-gray-500 mb-4">横向攻击 → 纵向防御</p>
      <div class="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
        <table class="w-full bg-white">
          <thead>
            <tr>
              <th class="p-2 bg-gray-100 text-xs text-gray-500 sticky left-0 z-20">攻＼防</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="mt-4 flex gap-4 text-xs text-gray-500">
        <span><span class="text-green-600 font-bold">2×</span> 效果拔群</span>
        <span><span class="text-red-500 font-bold">½</span> 效果不好</span>
        <span><span class="text-gray-400 font-bold">0</span> 无效</span>
        <span><span class="text-gray-300">1</span> 普通</span>
      </div>
    </div>`;
}

// ── Main Render ────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  let content = renderHeader();

  if (state.currentView === 'types') {
    content += renderTypeChart();
  } else {
    content += renderFilters();
    content += renderGrid();
  }

  if (state.currentView === 'detail' && state.currentPokemon) {
    content += renderDetail();
  }

  app.innerHTML = content;
}

// ── Actions ────────────────────────────────────────────────────────
async function goHome() {
  state.currentView = 'list';
  state.currentPokemon = null;
  state.offset = 0;
  await loadPokemon();
  render();
}

async function doSearch() {
  const input = document.getElementById('search-input');
  state.search = input?.value?.trim() || '';
  state.offset = 0;
  await loadPokemon();
  render();
}

async function doTypeFilter(val) {
  state.typeFilter = val || null;
  state.offset = 0;
  await loadPokemon();
  render();
}

async function doGenFilter(val) {
  state.genFilter = val || null;
  state.offset = 0;
  await loadPokemon();
  render();
}

async function goPage(page) {
  state.offset = (page - 1) * state.limit;
  await loadPokemon();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDetail() {
  state.currentView = 'list';
  state.currentPokemon = null;
  render();
}

// ── Init ───────────────────────────────────────────────────────────
async function init() {
  // Show loading
  document.getElementById('app').innerHTML = `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
        <p class="text-gray-500">加载宝可梦数据...</p>
      </div>
    </div>`;

  await loadTypes();
  await loadPokemon();
  render();
}

init();
