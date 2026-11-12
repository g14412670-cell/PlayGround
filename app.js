/* Bloquecraft Studio · diseñador y exportador de addons para Minecraft Bedrock */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORE_KEY = 'bloquecraft-studio-v1';
const FORMAT_VERSION = '1.21.90';
const MIN_ENGINE = [1, 21, 90];
const NAMESPACE = 'bc';
const WEAPON_KINDS = ['sword', 'axe', 'pickaxe', 'spear'];
const ITEM_KINDS = ['gem', 'food', ...WEAPON_KINDS];
const ENTITY_KINDS = ['passive', 'neutral', 'hostile'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic'];
const SOUNDS = ['stone', 'wood', 'gravel', 'grass', 'sand', 'glass', 'metal', 'wool'];
const colorNames = { '#9b78ee': 'Violeta', '#f1a94e': 'Naranja', '#5cc995': 'Verde', '#4ea8de': 'Azul', '#e97683': 'Rojo' };

const defaultState = {
  projectName: 'Mi primer addon',
  type: 'item',
  kind: 'gem',
  name: 'Amatista brillante',
  id: 'amatista_brillante',
  category: 'items',
  color: '#9b78ee',
  description: 'Un cristal antiguo que brilla con energía propia.',
  stackable: true,
  glow: false,
  edible: false,
  damage: 0,
  durability: 0,
  nutrition: 4,
  saturation: 0.6,
  hardness: 2.5,
  light: 0,
  explosion: 6,
  sound: 'stone',
  health: 30,
  speed: 0.25,
  scale: 1,
  spawn: true,
  drop: 'minecraft:rotten_flesh',
  ingredient: 'minecraft:amethyst_shard',
  recipe: true,
  rarity: 'common',
  aiMode: 'auto',
  aiEndpoint: 'https://api.openai.com/v1',
  aiModel: 'gpt-4o-mini',
  aiKey: '',
  items: []
};

let state = loadState();
let activeFilter = 'all';
let selectedFile = 'bp-manifest';
let toastTimer;
let aiBusy = false;

function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function normalizeText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function slug(value) {
  let text = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24).replace(/_+$/g, '');
  if (/^[0-9]/.test(text)) text = `b_${text}`.slice(0, 24).replace(/_+$/g, '');
  return text;
}

function uniqueId(base, used) {
  let id = base || 'contenido';
  let number = 2;
  while (used.has(id)) {
    const suffix = `_${number}`;
    id = (base || 'contenido').slice(0, 24 - suffix.length) + suffix;
    number += 1;
  }
  used.add(id);
  return id;
}

function uniqueName(base, used) {
  let name = String(base || 'Contenido').slice(0, 32);
  let number = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${number}`;
    name = `${String(base || 'Contenido').slice(0, 32 - suffix.length)}${suffix}`;
    number += 1;
  }
  return name;
}

function inferKind(type, name, edible) {
  if (type === 'block') return 'block';
  const text = normalizeText(name);
  if (type === 'entity') {
    if (/pasiv|amigable|inofensiv|animal|mascota|lobo|gato|ave|oveja|vaca|cerdo|conejo|zorro/.test(text)) return 'passive';
    if (/neutral|guardian|golem|protector|defiende/.test(text)) return 'neutral';
    return 'hostile';
  }
  if (edible) return 'food';
  if (/espada|sable|katana|daga|filo|mandoble|sword|blade/.test(text)) return 'sword';
  if (/hacha|hachuela|axe|hatchet/.test(text)) return 'axe';
  if (/pico|picota|pickaxe/.test(text)) return 'pickaxe';
  if (/lanza|tridente|spear|trident/.test(text)) return 'spear';
  if (/manzana|fruta|comida|pan|estofado|bayas|pastel|galleta|food|apple/.test(text)) return 'food';
  return 'gem';
}

function normalizeKind(type, kind, name, edible) {
  if (type === 'block') return 'block';
  if (type === 'entity') return ENTITY_KINDS.includes(kind) ? kind : inferKind(type, name, edible);
  return ITEM_KINDS.includes(kind) ? kind : inferKind(type, name, edible);
}

function defaultsFor(type, kind) {
  if (window.BloquecraftAI && BloquecraftAI.defaultFor) return BloquecraftAI.defaultFor(type, kind);
  return {
    stackable: type !== 'entity', glow: false, edible: kind === 'food', rarity: 'common',
    damage: type === 'entity' ? 4 : 0, durability: 0, nutrition: 4, saturation: 0.6, hardness: 2.5, light: 0,
    explosion: 6, sound: 'stone', health: 30, speed: 0.25, scale: 1, spawn: true,
    drop: 'minecraft:rotten_flesh', recipe: type !== 'entity', ingredient: 'minecraft:amethyst_shard'
  };
}

const TYPE_TUNING_KEYS = [
  'damage', 'durability', 'cooldown', 'nutrition', 'saturation', 'hardness', 'light',
  'explosion', 'sound', 'health', 'speed', 'scale', 'spawn', 'drop', 'ingredient', 'recipe',
  'rarity', 'stackable', 'glow', 'edible'
];

function isNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

function applyTypeDefaults(target) {
  const defaults = defaultsFor(target.type, target.kind);
  for (const key of TYPE_TUNING_KEYS) target[key] = defaults[key];
}

function repairStateValues(target) {
  const defaults = defaultsFor(target.type, target.kind);
  for (const key of TYPE_TUNING_KEYS) {
    if (typeof defaults[key] === 'number' && !isNumericValue(target[key])) target[key] = defaults[key];
  }
}

function hydrateItem(item) {
  if (!item || typeof item !== 'object') return null;
  if (window.BloquecraftAI && BloquecraftAI.normalizeItem) {
    const normalized = BloquecraftAI.normalizeItem(item, {});
    if (normalized) return { ...item, ...normalized };
  }
  return { ...item };
}

function loadState() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch {
    stored = {};
  }
  const loaded = { ...defaultState, ...stored };
  loaded.items = Array.isArray(stored.items) ? stored.items.map(hydrateItem).filter(Boolean) : [];
  if (!['item', 'block', 'entity'].includes(loaded.type)) loaded.type = 'item';
  loaded.kind = normalizeKind(loaded.type, loaded.kind, loaded.name, loaded.edible);
  if (!['auto', 'local', 'custom', 'ollama'].includes(loaded.aiMode)) loaded.aiMode = 'auto';
  loaded.aiEndpoint = String(loaded.aiEndpoint || defaultState.aiEndpoint);
  loaded.aiModel = String(loaded.aiModel || defaultState.aiModel);
  loaded.aiKey = String(loaded.aiKey || '');
  return loaded;
}

function saveState(show = false) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  const button = $('#save-button');
  if (button) button.innerHTML = '<span>✓</span> Guardado';
  if (show) toast('Proyecto guardado en este dispositivo');
}

function toast(message) {
  const element = $('#toast');
  if (!element) return;
  element.innerHTML = `<span>✓</span><b>${escapeHtml(message)}</b>`;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2800);
}

function creationCount(count) {
  return `${count} ${count === 1 ? 'creación' : 'creaciones'}`;
}

function typeLabel(type) {
  return ({ item: 'OBJETO', block: 'BLOQUE', entity: 'CRIATURA' })[type] || 'OBJETO';
}

function kindLabel(type, kind) {
  if (type === 'block') return 'BLOQUE';
  if (type === 'entity') return ({ passive: 'PASIVA', neutral: 'NEUTRAL', hostile: 'HOSTIL' })[kind] || 'CRIATURA';
  return ({ gem: 'OBJETO', food: 'COMIDA', sword: 'ESPADA', axe: 'HACHA', pickaxe: 'PICO', spear: 'LANZA' })[kind] || 'OBJETO';
}

function displayKind(type, kind) {
  if (type === 'block') return 'BLOQUE PERSONALIZADO';
  if (type === 'entity') {
    return ({ passive: 'CRIATURA PACÍFICA', neutral: 'CRIATURA NEUTRAL', hostile: 'CRIATURA HOSTIL' })[kind] || 'CRIATURA PERSONALIZADA';
  }
  return ({
    gem: 'OBJETO PERSONALIZADO', food: 'COMIDA PERSONALIZADA', sword: 'ESPADA PERSONALIZADA',
    axe: 'HACHA PERSONALIZADA', pickaxe: 'PICO PERSONALIZADO', spear: 'LANZA PERSONALIZADA'
  })[kind] || 'OBJETO PERSONALIZADO';
}

function categoryFor(type, kind, selected) {
  if (type === 'block') return selected === 'nature' ? 'nature' : 'construction';
  if (type === 'entity') return 'items';
  if (kind === 'food') return 'items';
  if (WEAPON_KINDS.includes(kind)) return selected === 'nature' ? 'nature' : 'equipment';
  return ['items', 'nature', 'construction', 'equipment'].includes(selected) ? selected : 'items';
}

function attributeDefinitions() {
  if (state.type === 'block') {
    return [
      { key: 'hardness', label: 'MINADO (S)', min: 0.1, max: 100, step: 0.1 },
      { key: 'light', label: 'LUZ (0-15)', min: 0, max: 15, step: 1 },
      { key: 'explosion', label: 'RESISTENCIA', min: 0, max: 100, step: 0.5 }
    ];
  }
  if (state.type === 'entity') {
    return [
      { key: 'health', label: 'SALUD', min: 1, max: 500, step: 1 },
      { key: 'damage', label: 'ATAQUE', min: 0, max: 50, step: 1 },
      { key: 'speed', label: 'VELOCIDAD', min: 0.05, max: 1.5, step: 0.05 },
      { key: 'scale', label: 'ESCALA', min: 0.4, max: 2, step: 0.1 }
    ];
  }
  if (state.kind === 'food') {
    return [
      { key: 'nutrition', label: 'NUTRICIÓN', min: 0, max: 20, step: 1 },
      { key: 'saturation', label: 'SATURACIÓN', min: 0.1, max: 2, step: 0.1 }
    ];
  }
  if (WEAPON_KINDS.includes(state.kind)) {
    return [
      { key: 'damage', label: 'DAÑO', min: 1, max: 100, step: 1 },
      { key: 'durability', label: 'DURABILIDAD', min: 1, max: 10000, step: 10 }
    ];
  }
  return [];
}

let attributeSignature = '';

function renderAttributes(force = false) {
  const container = $('#attribute-fields');
  const block = $('#attribute-block');
  if (!container || !block) return;
  const definitions = attributeDefinitions();
  const signature = `${state.type}|${state.kind}|${definitions.map((definition) => definition.key).join(',')}`;
  if (!force && signature === attributeSignature) return;
  attributeSignature = signature;
  block.hidden = definitions.length === 0;
  container.innerHTML = definitions.map((definition) => `
    <label class="attribute-field">
      <span>${definition.label}</span>
      <input type="number" inputmode="decimal" data-attribute="${definition.key}" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${isNumericValue(state[definition.key]) ? Math.round(Number(state[definition.key]) * 100) / 100 : definition.min}" />
    </label>`).join('');
  container.querySelectorAll('[data-attribute]').forEach((input) => {
    const definition = definitions.find((entry) => entry.key === input.dataset.attribute);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) state[definition.key] = value;
      saveState();
      renderFiles();
    });
    input.addEventListener('change', () => {
      const value = clampNumber(input.value, definition.min, definition.min, definition.max);
      state[definition.key] = value;
      input.value = value;
      saveState();
      renderFiles();
    });
  });
}

function syncInputs() {
  $('#project-name').value = state.projectName;
  $('#crumb-name').textContent = state.projectName || 'Nuevo addon';
  $('#content-name').value = state.name;
  $('#content-id').value = state.id;
  $('#content-category').value = state.category;
  $('#content-description').value = state.description;
  $('#stackable').checked = state.stackable;
  $('#glow').checked = state.glow;
  $('#edible').checked = state.kind === 'food' || state.edible;

  $$('.type-option').forEach((button) => {
    const selected = button.dataset.type === state.type;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', selected);
  });
  $$('.swatch').forEach((button) => button.classList.toggle('active', button.dataset.color === state.color));
  $('#color-label').textContent = colorNames[state.color] || state.color.toUpperCase();
  document.documentElement.style.setProperty('--object-color', state.color);

  $('#preview-name').textContent = state.name || 'Tu creación';
  $('#preview-kind').textContent = displayKind(state.type, state.kind);
  $('#preview-id').textContent = `${NAMESPACE}:${state.id || 'identificador'}`;
  $('#char-count').textContent = state.description.length;

  const isEntity = state.type === 'entity';
  const isBlock = state.type === 'block';
  $('#stackable').closest('label').style.display = isEntity || isBlock ? 'none' : '';
  $('#glow').closest('label').style.display = isEntity || isBlock ? 'none' : '';
  $('#edible').closest('label').style.display = state.type === 'item' ? '' : 'none';
  const hint = $('#behavior-hint');
  if (hint) {
    hint.hidden = state.type === 'item';
    hint.textContent = isBlock
      ? 'Ajusta dureza, luz y resistencia. La IA también puede crear estos valores por ti.'
      : 'Ajusta salud, ataque, velocidad y escala. El huevo de invocación se genera automáticamente.';
  }
  renderAttributes(true);

  const preview = $('#preview-object');
  preview.style.borderRadius = isBlock ? '2px' : isEntity ? '35% 35% 8px 8px' : '0';
  preview.style.clipPath = isBlock ? 'none' : isEntity
    ? 'polygon(26% 0,74% 0,94% 18%,88% 73%,73% 73%,73% 100%,56% 100%,56% 74%,44% 74%,44% 100%,27% 100%,27% 74%,12% 74%,6% 18%)'
    : '';
  const shine = $('#preview-object .object-shine');
  if (shine) shine.style.display = isBlock ? 'none' : '';

  $('#item-count').textContent = `(${state.items.length})`;
  $('#nav-count').textContent = state.items.length;
  renderContent();
  renderFiles();
}

function renderContent() {
  const list = $('#content-list');
  if (!list) return;
  if (!state.items.length) {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">＋</span><span><b>Tu mundo, tus reglas.</b><small>Añade tu primera creación con el formulario de arriba o pídesela a la IA.</small></span></div>';
  } else {
    list.innerHTML = state.items.slice(-3).reverse().map((item, index) => `
      <div class="content-row">
        <span class="item-swatch" style="--item-color:${item.color}">${item.type === 'block' ? '▦' : item.type === 'entity' ? '♟' : '◆'}</span>
        <span><b>${escapeHtml(item.name)}</b><small>${NAMESPACE}:${escapeHtml(item.id)} · ${kindLabel(item.type, item.kind)}</small></span>
        <span class="row-type">${typeLabel(item.type)}</span>
        <button class="row-delete" data-delete="${state.items.length - 1 - index}" aria-label="Eliminar ${escapeHtml(item.name)}">×</button>
      </div>`).join('');
    list.querySelectorAll('[data-delete]').forEach((button) => {
      button.onclick = () => removeItem(Number(button.dataset.delete));
    });
  }
  renderGrid();
}

function renderGrid() {
  const grid = $('#content-grid');
  if (!grid) return;
  const term = ($('#search-content')?.value || '').trim().toLowerCase();
  const filtered = state.items.filter((item) => {
    const matchesType = activeFilter === 'all' || item.type === activeFilter;
    const haystack = `${item.name} ${item.id} ${item.description || ''}`.toLowerCase();
    return matchesType && (!term || haystack.includes(term));
  });
  $('#filter-all-count').textContent = state.items.length;
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-grid"><span>✦</span><b>${state.items.length ? 'No hay resultados' : 'Tu biblioteca está esperando una idea'}</b><small>${state.items.length ? 'Prueba con otro término o filtro.' : 'Crea un objeto, bloque o criatura desde el diseñador o con la IA.'}</small></div>`;
    return;
  }
  grid.innerHTML = filtered.map((item) => `
    <article class="content-card">
      <div class="card-art"><span class="card-object" style="--item-color:${item.color};${item.type === 'block' ? 'clip-path:none;border-radius:2px' : ''}"></span></div>
      <div class="card-meta">
        <span class="item-swatch" style="--item-color:${item.color};width:28px;height:28px;font-size:14px">${item.type === 'block' ? '▦' : item.type === 'entity' ? '♟' : '◆'}</span>
        <span><b>${escapeHtml(item.name)}</b><small>${NAMESPACE}:${escapeHtml(item.id)} · ${kindLabel(item.type, item.kind)}</small></span>
        <button class="card-delete" data-id="${escapeHtml(item.id)}" title="Eliminar">×</button>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.card-delete').forEach((button) => {
    button.onclick = () => removeItem(state.items.findIndex((item) => item.id === button.dataset.id));
  });
}

function removeItem(index) {
  if (index < 0 || index >= state.items.length) return;
  const removed = state.items.splice(index, 1)[0];
  saveState();
  syncInputs();
  toast(`${removed.name} eliminado`);
}

function addItem() {
  const name = $('#content-name').value.trim();
  const id = slug($('#content-id').value);
  if (!name) {
    $('#content-name').focus();
    toast('Escribe un nombre para tu creación');
    return;
  }
  if (!id) {
    $('#content-id').focus();
    toast('Añade un identificador válido');
    return;
  }
  if (state.items.some((item) => item.id === id)) {
    toast('Ese identificador ya existe en tu proyecto');
    $('#content-id').focus();
    return;
  }

  const type = state.type;
  const kind = normalizeKind(type, state.kind, name, $('#edible').checked);
  const base = defaultsFor(type, kind);
  const tuned = {};
  for (const key of ['damage', 'durability', 'cooldown', 'nutrition', 'saturation', 'hardness', 'light', 'explosion', 'sound', 'health', 'speed', 'scale', 'spawn', 'drop', 'ingredient', 'recipe', 'rarity']) {
    if (state[key] === undefined || state[key] === null) continue;
    if (typeof state[key] === 'number' && !Number.isFinite(state[key])) continue;
    tuned[key] = state[key];
  }
  const item = {
    ...base,
    ...tuned,
    type,
    kind,
    name,
    id,
    category: categoryFor(type, kind, $('#content-category').value),
    color: state.color,
    description: $('#content-description').value.trim(),
    stackable: WEAPON_KINDS.includes(kind) ? false : $('#stackable').checked,
    glow: $('#glow').checked,
    edible: kind === 'food',
    rareza: undefined
  };
  if (type === 'item' && WEAPON_KINDS.includes(kind)) {
    if (!(Number(state.damage) > 0)) item.damage = base.damage;
    if (!(Number(state.durability) > 0)) item.durability = base.durability;
  }
  state.items.push(hydrateItem(item));
  state.id = id;
  saveState();
  syncInputs();
  toast(`${name} añadido al proyecto`);
}

function useTemplate(template) {
  const templates = {
    gem: {
      type: 'item', kind: 'gem', name: 'Cristal mágico', id: 'cristal_magico', category: 'items', color: '#9b78ee',
      description: 'Un cristal antiguo que brilla en la oscuridad.', stackable: true, glow: true, edible: false
    },
    food: {
      type: 'item', kind: 'food', name: 'Fruta del bosque', id: 'fruta_del_bosque', category: 'food', color: '#e97683',
      description: 'Una fruta silvestre dulce y muy nutritiva.', stackable: true, glow: false, edible: true,
      nutrition: 6, saturation: 1.2
    },
    block: {
      type: 'block', kind: 'block', name: 'Bloque de musgo', id: 'bloque_de_musgo', category: 'nature', color: '#5cc995',
      description: 'Un bloque suave cubierto de musgo luminoso.', stackable: true, glow: false, edible: false,
      hardness: 1.2, light: 4, explosion: 3, sound: 'grass'
    },
    sword: {
      type: 'item', kind: 'sword', name: 'Espada de escarcha', id: 'espada_de_escarcha', category: 'equipment', color: '#4ea8de',
      description: 'Un filo azul que conserva el frío del invierno.', stackable: false, glow: true, edible: false,
      damage: 9, durability: 900, rarity: 'rare', ingredient: 'minecraft:blue_ice'
    },
    entity: {
      type: 'entity', kind: 'hostile', name: 'Golem de musgo', id: 'golem_de_musgo', category: 'items', color: '#5cc995',
      description: 'Un guardián de piedra que protege los bosques antiguos.', health: 60, damage: 8, speed: 0.22, scale: 1.2,
      spawn: true, drop: 'minecraft:emerald'
    }
  };
  const chosen = templates[template];
  if (!chosen) return;
  const usedIds = new Set(state.items.map((item) => item.id));
  const usedNames = new Set(state.items.map((item) => String(item.name).toLowerCase()));
  state.id = uniqueId(chosen.id, usedIds);
  state.name = usedNames.has(String(chosen.name).toLowerCase())
    ? uniqueName(chosen.name, usedNames)
    : chosen.name;
  Object.assign(state, chosen, { id: state.id, name: state.name });
  state.edible = chosen.edible ?? state.edible;
  $('#modal').classList.remove('open');
  saveState();
  syncInputs();
  document.querySelector('[data-view="designer"]')?.click();
  toast('Plantilla cargada. ¡Hazla tuya!');
}

function switchView(view) {
  $$('.view').forEach((element) => element.classList.toggle('active-view', element.id === `view-${view}`));
  $$('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'files') renderFiles();
}

function updateFromForm() {
  state.projectName = $('#project-name').value.trim().slice(0, 32) || 'Mi addon';
  state.name = $('#content-name').value.slice(0, 32);
  state.id = slug($('#content-id').value);
  state.category = $('#content-category').value;
  state.description = $('#content-description').value.slice(0, 100);
  state.stackable = $('#stackable').checked;
  state.glow = $('#glow').checked;
  state.edible = $('#edible').checked;
  state.kind = inferKind(state.type, state.name, state.edible);
  $('#content-id').value = state.id;
  $('#id-valid').textContent = state.id ? '✓' : '!';
  $('#id-valid').style.color = state.id ? '#53a86a' : '#d97870';
  $('#crumb-name').textContent = state.projectName;
  $('#preview-name').textContent = state.name || 'Tu creación';
  $('#preview-kind').textContent = displayKind(state.type, state.kind);
  $('#preview-id').textContent = `${NAMESPACE}:${state.id || 'identificador'}`;
  $('#char-count').textContent = state.description.length;
  document.documentElement.style.setProperty('--object-color', state.color);
  $('#color-label').textContent = colorNames[state.color] || state.color.toUpperCase();
  renderAttributes();
  saveState();
  renderFiles();
}

/* ---------- Archivos Bedrock ---------- */

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    return (char === 'x' ? random : (random & 3 | 8)).toString(16);
  });
}

function ensurePackIds() {
  let changed = false;
  if (!state.bpUuid) { state.bpUuid = uuid(); changed = true; }
  if (!state.rpUuid) { state.rpUuid = uuid(); changed = true; }
  if (!state.bpModuleUuid) { state.bpModuleUuid = uuid(); changed = true; }
  if (!state.rpModuleUuid) { state.rpModuleUuid = uuid(); changed = true; }
  if (changed) saveState();
}

function packNames() {
  const base = String(state.projectName || 'Mi addon').trim().replace(/[\\/:*?"<>|]/g, '').slice(0, 32) || 'Mi addon';
  const folder = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Addon';
  return { base, folder, bp: `${folder}_BP`, rp: `${folder}_RP` };
}

function packManifests() {
  ensurePackIds();
  const { base } = packNames();
  return {
    bp: {
      format_version: 2,
      header: {
        name: `${base} · Comportamiento`,
        description: `Contenido de ${base}, creado con Bloquecraft Studio.`,
        uuid: state.bpUuid,
        version: [1, 0, 0],
        min_engine_version: MIN_ENGINE
      },
      modules: [{ type: 'data', uuid: state.bpModuleUuid, version: [1, 0, 0] }],
      dependencies: [{ uuid: state.rpUuid, version: [1, 0, 0] }],
      metadata: { authors: ['Bloquecraft Studio'] }
    },
    rp: {
      format_version: 2,
      header: {
        name: `${base} · Recursos`,
        description: `Texturas, modelos y textos de ${base}, creado con Bloquecraft Studio.`,
        uuid: state.rpUuid,
        version: [1, 0, 0],
        min_engine_version: MIN_ENGINE
      },
      modules: [{ type: 'resources', uuid: state.rpModuleUuid, version: [1, 0, 0] }],
      metadata: { authors: ['Bloquecraft Studio'] }
    }
  };
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : fallback;
  return Math.min(max, Math.max(min, safe));
}

function safeItemRef(value, fallback = 'minecraft:stone') {
  const reference = String(value || '').trim();
  if (/^minecraft:[a-z0-9_]+$/.test(reference)) return reference;
  if (reference.startsWith(`${NAMESPACE}:`)) {
    const id = reference.slice(NAMESPACE.length + 1);
    if (state.items.some((item) => item.id === id)) return reference;
  }
  return fallback;
}

function enchantSlot(kind) {
  return ({ sword: 'sword', axe: 'axe', pickaxe: 'pickaxe', spear: 'spear' })[kind] || 'none';
}

function itemJson(item) {
  const kind = item.kind || 'gem';
  const weapon = WEAPON_KINDS.includes(kind);
  const ingredient = safeItemRef(item.ingredient, 'minecraft:amethyst_shard');
  const components = {
    'minecraft:icon': { textures: { default: `${NAMESPACE}:${item.id}` } },
    'minecraft:max_stack_size': weapon ? 1 : item.stackable ? 64 : 1,
    'minecraft:hand_equipped': weapon,
    'minecraft:tags': { tags: [`${NAMESPACE}:${kind}`] }
  };
  if (item.glow) components['minecraft:glint'] = true;
  if (RARITIES.includes(item.rarity) && item.rarity !== 'common') components['minecraft:rarity'] = item.rarity;

  if (weapon) {
    const cooldown = clampNumber(item.cooldown, 0, 0, 5);
    if (cooldown > 0) components['minecraft:cooldown'] = { category: `${NAMESPACE}:${item.id}`, duration: cooldown };
    components['minecraft:damage'] = Math.round(clampNumber(item.damage, 7, 1, 100));
    components['minecraft:durability'] = {
      damage_chance: { min: 0, max: 100 },
      max_durability: Math.round(clampNumber(item.durability, 600, 1, 10000))
    };
    components['minecraft:enchantable'] = { slot: enchantSlot(kind), value: kind === 'axe' ? 12 : 15 };
    if (kind === 'axe' || kind === 'pickaxe') {
      components['minecraft:digger'] = {
        use_efficiency: true,
        destroy_speeds: [{
          block: { tags: `q.any_tag('minecraft:is_${kind}_item_destructible')` },
          speed: kind === 'axe' ? 6 : 8
        }]
      };
    }
    components['minecraft:repairable'] = {
      repair_items: [{ items: [ingredient], repair_amount: Math.max(1, Math.round(clampNumber(item.durability, 600, 1, 10000) * 0.25)) }]
    };
  }

  if (kind === 'food') {
    components['minecraft:max_stack_size'] = item.stackable ? 64 : 1;
    components['minecraft:food'] = {
      nutrition: Math.round(clampNumber(item.nutrition, 6, 0, 20)),
      saturation_modifier: Math.round(clampNumber(item.saturation, 0.8, 0.1, 2) * 100) / 100,
      can_always_eat: false
    };
    components['minecraft:use_modifiers'] = { use_duration: 1.6, movement_modifier: 0.35 };
    components['minecraft:use_animation'] = 'eat';
  }

  return {
    format_version: FORMAT_VERSION,
    'minecraft:item': {
      description: {
        identifier: `${NAMESPACE}:${item.id}`,
        menu_category: { category: item.category === 'food' ? 'items' : item.category || 'items' }
      },
      components
    }
  };
}

function blockJson(item) {
  const components = {
    'minecraft:geometry': 'minecraft:geometry.full_block',
    'minecraft:material_instances': {
      '*': { texture: `${NAMESPACE}:${item.id}`, render_method: 'opaque' }
    },
    'minecraft:destructible_by_mining': {
      seconds_to_destroy: Math.round(clampNumber(item.hardness, 2.5, 0.1, 100) * 100) / 100
    },
    'minecraft:destructible_by_explosion': {
      explosion_resistance: Math.round(clampNumber(item.explosion, 6, 0, 100) * 100) / 100
    },
    'minecraft:map_color': item.color,
    'minecraft:light_dampening': 15,
    'minecraft:light_emission': Math.round(clampNumber(item.light, 0, 0, 15)),
    'minecraft:sound': { sound: SOUNDS.includes(item.sound) ? item.sound : 'stone' }
  };
  return {
    format_version: FORMAT_VERSION,
    'minecraft:block': {
      description: {
        identifier: `${NAMESPACE}:${item.id}`,
        menu_category: { category: item.category === 'nature' ? 'nature' : 'construction' }
      },
      components
    }
  };
}

function entityBehavior(item) {
  const hostile = item.kind === 'hostile';
  const neutral = item.kind === 'neutral';
  const scale = Math.round(clampNumber(item.scale, 1, 0.4, 2) * 100) / 100;
  const health = Math.round(clampNumber(item.health, 30, 1, 500));
  const components = {
    'minecraft:type_family': { family: [`${NAMESPACE}:${item.id}`, 'mob', hostile ? 'monster' : 'animal'] },
    'minecraft:health': { value: health, max: health },
    'minecraft:movement': { value: Math.round(clampNumber(item.speed, 0.25, 0.05, 1.5) * 100) / 100 },
    'minecraft:navigation.walk': { can_path_over_water: true, avoid_water: false },
    'minecraft:movement.basic': {},
    'minecraft:jump.static': {},
    'minecraft:collision_box': {
      width: Math.round(0.6 * scale * 100) / 100,
      height: Math.round(1.8 * scale * 100) / 100
    },
    'minecraft:physics': {},
    'minecraft:nameable': {},
    'minecraft:breathable': { total_supply: 15, suffocate_time: 0 },
    'minecraft:despawn': { despawn_from_distance: {} },
    'minecraft:loot': { table: `loot_tables/entities/${item.id}.json` },
    'minecraft:behavior.float': { priority: 0 },
    'minecraft:behavior.random_stroll': { priority: 6, speed_multiplier: 0.8 },
    'minecraft:behavior.look_at_player': { priority: 7, look_distance: 8, probability: 0.02 },
    'minecraft:behavior.random_look_around': { priority: 8 }
  };
  if (scale !== 1) components['minecraft:scale'] = { value: scale };
  if (item.damage > 0) components['minecraft:attack'] = { damage: Math.round(clampNumber(item.damage, 0, 0, 50)) };

  if (hostile || neutral) {
    components['minecraft:behavior.hurt_by_target'] = { priority: 1 };
    components['minecraft:behavior.delayed_attack'] = {
      priority: 4,
      attack_once: false,
      track_target: true,
      require_complete_path: false,
      random_stop_interval: 0,
      reach_multiplier: 1.5,
      speed_multiplier: 1,
      attack_duration: 0.75,
      hit_delay_pct: 0.5
    };
  }
  if (hostile) {
    components['minecraft:behavior.nearest_attackable_target'] = {
      priority: 2,
      within_radius: 24,
      reselect_targets: true,
      must_see: true,
      entity_types: [{
        filters: { any_of: [{ test: 'is_family', subject: 'other', value: 'player' }] },
        max_dist: 32
      }]
    };
  }
  if (!hostile && !neutral) {
    components['minecraft:behavior.panic'] = { priority: 1, speed_multiplier: 1.2 };
  }

  return {
    format_version: FORMAT_VERSION,
    'minecraft:entity': {
      description: {
        identifier: `${NAMESPACE}:${item.id}`,
        is_spawnable: item.spawn !== false,
        is_summonable: true,
        is_experimental: false,
        spawn_category: hostile ? 'monster' : 'creature'
      },
      components
    }
  };
}

function spawnRules(item) {
  const hostile = item.kind === 'hostile';
  return {
    format_version: '1.8.0',
    'minecraft:spawn_rules': {
      description: {
        identifier: `${NAMESPACE}:${item.id}`,
        population_control: hostile ? 'monster' : 'animal'
      },
      conditions: [{
        'minecraft:spawns_on_surface': {},
        'minecraft:brightness_filter': { min: hostile ? 0 : 9, max: hostile ? 7 : 15, adjust_for_weather: false },
        'minecraft:difficulty_filter': hostile ? { min: 'easy', max: 'hard' } : { min: 'peaceful', max: 'hard' },
        'minecraft:weight': { default: hostile ? 20 : 8 },
        'minecraft:herd': { min_size: hostile ? 1 : 2, max_size: hostile ? 2 : 4 },
        'minecraft:biome_filter': { test: 'has_biome_tag', operator: '==', value: hostile ? 'monster' : 'animal' }
      }]
    }
  };
}

function lootTable(item) {
  const drop = safeItemRef(item.drop, 'minecraft:rotten_flesh');
  return {
    pools: [{
      rolls: 1,
      entries: [{
        type: 'item',
        name: drop,
        weight: 1,
        functions: [{ function: 'set_count', count: { min: 1, max: item.kind === 'hostile' ? 3 : 2 } }]
      }]
    }]
  };
}

function recipeJson(item) {
  if (item.recipe === false || item.type === 'entity') return null;
  const ingredient = safeItemRef(item.ingredient, item.type === 'block' ? 'minecraft:stone' : 'minecraft:iron_ingot');
  if (ingredient === `${NAMESPACE}:${item.id}`) return null;
  let pattern;
  let key = { X: { item: ingredient } };
  if (item.type === 'block') {
    pattern = ['XX', 'XX'];
  } else if (item.kind === 'sword') {
    pattern = ['X', 'X', 'S'];
    key.S = { item: 'minecraft:stick' };
  } else if (item.kind === 'axe') {
    pattern = ['XX', 'XS', ' S'];
    key.S = { item: 'minecraft:stick' };
  } else if (item.kind === 'pickaxe') {
    pattern = ['XXX', ' S ', ' S '];
    key.S = { item: 'minecraft:stick' };
  } else if (item.kind === 'spear') {
    pattern = ['  X', ' X ', 'S  '];
    key.S = { item: 'minecraft:stick' };
  } else {
    pattern = [' X ', 'X X', ' X '];
  }
  return {
    format_version: '1.20.10',
    'minecraft:recipe_shaped': {
      description: { identifier: `${NAMESPACE}:${item.id}_recipe` },
      tags: ['crafting_table'],
      pattern,
      key,
      unlock: [{ item: ingredient }],
      result: { item: `${NAMESPACE}:${item.id}`, count: item.type === 'block' ? 4 : 1 }
    }
  };
}

function entityGeometry(item) {
  return {
    format_version: '1.12.0',
    'minecraft:geometry': [{
      description: {
        identifier: `geometry.${NAMESPACE}.${item.id}`,
        texture_width: 64,
        texture_height: 64,
        visible_bounds_width: 2,
        visible_bounds_height: 3,
        visible_bounds_offset: [0, 1.2, 0]
      },
      bones: [
        { name: 'body', pivot: [0, 12, 0], cubes: [{ origin: [-4, 6, -2], size: [8, 12, 4], uv: [0, 16] }] },
        { name: 'head', pivot: [0, 18, 0], cubes: [{ origin: [-4, 18, -4], size: [8, 8, 8], uv: [0, 0] }] },
        { name: 'right_arm', pivot: [5, 17, 0], cubes: [{ origin: [4, 7, -1.5], size: [3, 10, 3], uv: [0, 32] }] },
        { name: 'left_arm', pivot: [-5, 17, 0], cubes: [{ origin: [-7, 7, -1.5], size: [3, 10, 3], uv: [16, 32] }] },
        { name: 'right_leg', pivot: [2, 6, 0], cubes: [{ origin: [1, 0, -2], size: [3, 6, 4], uv: [32, 0] }] },
        { name: 'left_leg', pivot: [-2, 6, 0], cubes: [{ origin: [-4, 0, -2], size: [3, 6, 4], uv: [32, 16] }] }
      ]
    }]
  };
}

function entityClient(item) {
  return {
    format_version: '1.10.0',
    'minecraft:client_entity': {
      description: {
        identifier: `${NAMESPACE}:${item.id}`,
        materials: { default: 'entity_alphatest' },
        textures: { default: `textures/entity/${item.id}` },
        geometry: { default: `geometry.${NAMESPACE}.${item.id}` },
        render_controllers: [`controller.render.${NAMESPACE}.${item.id}`],
        animations: {
          idle: `animation.${NAMESPACE}.${item.id}.idle`,
          walk: `animation.${NAMESPACE}.${item.id}.walk`
        },
        scripts: {
          animate: ['idle', { walk: 'query.modified_move_speed > 0.05' }]
        },
        spawn_egg: {
          base_color: item.color,
          overlay_color: shadeColor(item.color, -38)
        }
      }
    }
  };
}

function entityAnimation(item) {
  return {
    format_version: '1.8.0',
    animations: {
      [`animation.${NAMESPACE}.${item.id}.idle`]: {
        loop: true,
        animation_length: 2,
        bones: {
          head: { rotation: ['math.sin(query.anim_time * 180) * 2', 0, 'math.cos(query.anim_time * 180) * 2'] }
        }
      },
      [`animation.${NAMESPACE}.${item.id}.walk`]: {
        loop: true,
        animation_length: 1,
        bones: {
          left_leg: { rotation: ['math.cos(query.anim_time * 360) * 35', 0, 0] },
          right_leg: { rotation: ['math.cos(query.anim_time * 360 + 180) * 35', 0, 0] },
          left_arm: { rotation: ['math.cos(query.anim_time * 360 + 180) * 25', 0, 0] },
          right_arm: { rotation: ['math.cos(query.anim_time * 360) * 25', 0, 0] }
        }
      }
    }
  };
}

function entityRenderController(item) {
  return {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NAMESPACE}.${item.id}`]: {
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default']
      }
    }
  };
}

function langFiles() {
  const lines = [];
  for (const item of state.items) {
    const label = String(item.name || item.id).replace(/[\r\n=]+/g, ' ').trim().slice(0, 32) || item.id;
    if (item.type === 'item') {
      lines.push(`item.${NAMESPACE}:${item.id}=${label}`);
      lines.push(`item.${NAMESPACE}:${item.id}.name=${label}`);
    } else if (item.type === 'block') {
      lines.push(`tile.${NAMESPACE}:${item.id}.name=${label}`);
    } else {
      lines.push(`entity.${NAMESPACE}:${item.id}.name=${label}`);
      lines.push(`item.spawn_egg.entity.${NAMESPACE}:${item.id}.name=${label}`);
    }
  }
  return lines.join('\n');
}

function buildTextFiles() {
  const manifests = packManifests();
  const { bp, rp } = packNames();
  const files = {};
  files[`${bp}/manifest.json`] = JSON.stringify(manifests.bp, null, 2);
  files[`${rp}/manifest.json`] = JSON.stringify(manifests.rp, null, 2);

  const items = state.items.filter((item) => item.type === 'item');
  const blocks = state.items.filter((item) => item.type === 'block');
  const entities = state.items.filter((item) => item.type === 'entity');

  for (const item of items) {
    files[`${bp}/items/${item.id}.json`] = JSON.stringify(itemJson(item), null, 2);
    const recipe = recipeJson(item);
    if (recipe) files[`${bp}/recipes/${item.id}.json`] = JSON.stringify(recipe, null, 2);
  }
  for (const item of blocks) {
    files[`${bp}/blocks/${item.id}.json`] = JSON.stringify(blockJson(item), null, 2);
    const recipe = recipeJson(item);
    if (recipe) files[`${bp}/recipes/${item.id}.json`] = JSON.stringify(recipe, null, 2);
  }
  for (const item of entities) {
    files[`${bp}/entities/${item.id}.json`] = JSON.stringify(entityBehavior(item), null, 2);
    files[`${bp}/loot_tables/entities/${item.id}.json`] = JSON.stringify(lootTable(item), null, 2);
    if (item.spawn !== false) files[`${bp}/spawn_rules/${item.id}.json`] = JSON.stringify(spawnRules(item), null, 2);
    files[`${rp}/entity/${item.id}.entity.json`] = JSON.stringify(entityClient(item), null, 2);
    files[`${rp}/models/entity/${item.id}.geo.json`] = JSON.stringify(entityGeometry(item), null, 2);
    files[`${rp}/animations/${item.id}.animation.json`] = JSON.stringify(entityAnimation(item), null, 2);
    files[`${rp}/render_controllers/${item.id}.render_controllers.json`] = JSON.stringify(entityRenderController(item), null, 2);
  }

  files[`${rp}/textures/item_texture.json`] = JSON.stringify({
    resource_pack_name: rp,
    texture_name: 'atlas.items',
    texture_data: Object.fromEntries(items.map((item) => [`${NAMESPACE}:${item.id}`, { textures: `textures/items/${item.id}` }]))
  }, null, 2);
  files[`${rp}/textures/terrain_texture.json`] = JSON.stringify({
    resource_pack_name: rp,
    texture_name: 'atlas.terrain',
    padding: 8,
    num_mip_levels: 4,
    texture_data: Object.fromEntries(blocks.map((item) => [`${NAMESPACE}:${item.id}`, { textures: `textures/blocks/${item.id}` }]))
  }, null, 2);

  const lang = langFiles();
  files[`${rp}/texts/languages.json`] = JSON.stringify(['en_US', 'es_ES'], null, 2);
  files[`${rp}/texts/en_US.lang`] = lang;
  files[`${rp}/texts/es_ES.lang`] = lang;
  return files;
}

function renderFiles() {
  const files = buildTextFiles();
  const tree = $('#file-tree');
  if (!tree) return;
  const { bp, rp } = packNames();
  const generatedOnExport = new Set([`${bp}/pack_icon.png`, `${rp}/pack_icon.png`]);
  for (const item of state.items) {
    if (item.type === 'item') generatedOnExport.add(`${rp}/textures/items/${item.id}.png`);
    else if (item.type === 'block') generatedOnExport.add(`${rp}/textures/blocks/${item.id}.png`);
    else generatedOnExport.add(`${rp}/textures/entity/${item.id}.png`);
  }
  const keys = [...new Set([...Object.keys(files), ...generatedOnExport])].sort((a, b) => {
    if (a.includes('manifest')) return -1;
    if (b.includes('manifest')) return 1;
    return a.localeCompare(b);
  });
  if (!files[selectedFile] && !generatedOnExport.has(selectedFile)) {
    selectedFile = keys.find((key) => key.includes('BP/manifest')) || keys[0] || 'manifest.json';
  }
  tree.innerHTML = keys.map((path) => {
    const parts = path.split('/');
    const depth = parts.length - 1;
    const filename = parts.at(-1);
    const isManifest = filename === 'manifest.json';
    const isPng = filename.endsWith('.png');
    return `<div class="tree-row ${depth ? 'indent' : ''} ${selectedFile === path ? 'selected' : ''}" data-file="${escapeHtml(path)}" style="padding-left:${7 + Math.max(0, depth - 1) * 12}px"><span class="tree-chevron">${depth ? '' : '⌄'}</span><span class="${isManifest ? 'tree-json' : isPng ? 'tree-png' : 'tree-folder'}">${isPng ? '▣' : isManifest || filename.endsWith('.json') ? '{}' : '▰'}</span>${escapeHtml(filename)}</div>`;
  }).join('');
  tree.querySelectorAll('.tree-row').forEach((row) => {
    row.onclick = () => {
      selectedFile = row.dataset.file;
      renderFiles();
    };
  });
  $('#code-file-name').textContent = selectedFile.split('/').slice(-2).join('/');
  $('#code-preview code').textContent = files[selectedFile]
    || 'Archivo PNG generado automáticamente al exportar el addon.\n\nAbre «Exportar addon» para crear el .mcaddon con todas las texturas incluidas.';
}

/* ---------- Texturas procedurales ---------- */

function hexToRgb(hex) {
  const clean = String(hex || '#9b78ee').replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const part = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function shadeColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  if (factor >= 0) {
    return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
  }
  return rgbToHex(r * (1 + factor), g * (1 + factor), b * (1 + factor));
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}

function pixel(context, x, y, color) {
  context.fillStyle = color;
  context.fillRect(x, y, 1, 1);
}

function noiseTexture(context, size, color, seed) {
  let hash = 0;
  for (const character of String(seed)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const light = shadeColor(color, 16);
  const dark = shadeColor(color, -14);
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      const chance = hash >>> 29;
      if (chance > 5) pixel(context, x, y, chance & 1 ? light : dark);
    }
  }
}

function drawItem(context, item) {
  const color = item.color || '#9b78ee';
  const light = shadeColor(color, 45);
  const dark = shadeColor(color, -28);
  const outline = shadeColor(color, -58);
  const metal = '#d9c27a';
  const wood = '#6b4a32';
  const kind = item.kind || 'gem';

  if (kind === 'sword') {
    for (let i = 0; i < 9; i += 1) {
      pixel(context, 4 + i, 11 - i, outline);
      pixel(context, 5 + i, 11 - i, i > 5 ? light : color);
      if (i < 7) pixel(context, 4 + i, 10 - i, dark);
    }
    pixel(context, 13, 2, light);
    pixel(context, 12, 2, outline);
    pixel(context, 13, 3, outline);
    pixel(context, 2, 11, metal);
    pixel(context, 3, 10, metal);
    pixel(context, 4, 12, metal);
    pixel(context, 5, 13, metal);
    pixel(context, 2, 13, wood);
    pixel(context, 1, 14, wood);
    pixel(context, 3, 14, outline);
  } else if (kind === 'axe') {
    for (let i = 0; i < 9; i += 1) {
      pixel(context, 4 + i, 13 - i, outline);
      pixel(context, 5 + i, 13 - i, wood);
    }
    for (let y = 2; y <= 7; y += 1) {
      for (let x = 6; x <= 12; x += 1) {
        if ((x + y) % 2 === 0 || x < 11) {
          pixel(context, x, y, x + y < 11 ? light : color);
        }
      }
    }
    pixel(context, 8, 2, outline);
    pixel(context, 12, 3, outline);
    pixel(context, 12, 6, outline);
    pixel(context, 7, 6, dark);
  } else if (kind === 'pickaxe') {
    for (let i = 0; i < 9; i += 1) {
      pixel(context, 4 + i, 13 - i, outline);
      pixel(context, 5 + i, 13 - i, wood);
    }
    for (let x = 5; x <= 12; x += 1) {
      pixel(context, x, 4 + Math.abs(8 - x), color);
      pixel(context, x, 3 + Math.abs(8 - x), light);
    }
    pixel(context, 4, 5, outline);
    pixel(context, 13, 5, outline);
    pixel(context, 8, 2, light);
    pixel(context, 9, 2, outline);
  } else if (kind === 'spear') {
    for (let i = 0; i < 12; i += 1) {
      pixel(context, 2 + i, 14 - i, outline);
      if (i < 10) pixel(context, 3 + i, 14 - i, wood);
    }
    pixel(context, 13, 2, light);
    pixel(context, 14, 1, light);
    pixel(context, 12, 2, color);
    pixel(context, 13, 3, dark);
    pixel(context, 11, 4, metal);
  } else if (kind === 'food') {
    for (let y = 5; y <= 12; y += 1) {
      for (let x = 4; x <= 11; x += 1) {
        const distance = Math.hypot(x - 7.5, y - 8.5);
        if (distance < 4.2) pixel(context, x, y, distance > 3.1 ? outline : x < 6 || y < 7 ? light : color);
        if (distance < 2.6) pixel(context, x, y, dark);
      }
    }
    pixel(context, 8, 3, '#5c8f45');
    pixel(context, 9, 2, '#6fa956');
    pixel(context, 7, 3, '#3f6f34');
    pixel(context, 8, 4, wood);
    pixel(context, 5, 7, '#ffffff88');
  } else {
    const points = [[8, 2], [14, 7], [8, 14], [2, 7]];
    for (let y = 2; y <= 14; y += 1) {
      for (let x = 2; x <= 14; x += 1) {
        if ((x - 8) / 6 + Math.abs(y - 8) / 6 <= 1) {
          const facet = x < 8 ? (y < 8 ? light : color) : (y < 8 ? color : dark);
          pixel(context, x, y, facet);
        }
      }
    }
    for (const [x, y] of points) pixel(context, x, y, outline);
    for (let i = 0; i < 4; i += 1) pixel(context, 8, 4 + i, '#ffffffaa');
  }
}

async function makeItemTexture(item) {
  const { canvas, context } = makeCanvas(16, 16);
  context.clearRect(0, 0, 16, 16);
  drawItem(context, item);
  return canvasBytes(canvas);
}

async function makeBlockTexture(item) {
  const { canvas, context } = makeCanvas(16, 16);
  noiseTexture(context, 16, item.color || '#9b78ee', item.id);
  const border = shadeColor(item.color, -34);
  const light = shadeColor(item.color, 25);
  context.fillStyle = border;
  context.fillRect(0, 0, 16, 1);
  context.fillRect(0, 0, 1, 16);
  context.fillStyle = light;
  context.fillRect(0, 15, 16, 1);
  context.fillRect(15, 0, 1, 16);
  if (item.category === 'nature') {
    context.fillStyle = shadeColor(item.color, -18);
    for (let i = 0; i < 6; i += 1) {
      const x = (i * 5 + 3) % 16;
      const y = (i * 7 + 4) % 16;
      context.fillRect(x, y, 1, 2);
    }
  }
  return canvasBytes(canvas);
}

async function makeEntityTexture(item) {
  const { canvas, context } = makeCanvas(64, 64);
  const color = item.color || '#9b78ee';
  noiseTexture(context, 64, color, item.id);
  const face = shadeColor(color, 16);
  const dark = shadeColor(color, -24);
  const outline = shadeColor(color, -55);
  const eye = item.kind === 'hostile' ? '#ff6b5e' : '#24352a';
  context.fillStyle = face;
  context.fillRect(8, 8, 8, 8);
  context.fillStyle = dark;
  context.fillRect(10, 13, 4, 1);
  context.fillStyle = eye;
  context.fillRect(9, 10, 2, 2);
  context.fillRect(13, 10, 2, 2);
  context.fillStyle = '#ffffff';
  context.fillRect(9, 10, 1, 1);
  context.fillRect(13, 10, 1, 1);
  context.fillStyle = outline;
  context.fillRect(8, 8, 8, 1);
  context.fillRect(4, 20, 8, 12);
  context.fillStyle = dark;
  context.fillRect(5, 27, 6, 4);
  context.fillStyle = face;
  context.fillRect(0, 32, 12, 13);
  context.fillRect(16, 32, 12, 13);
  context.fillRect(32, 0, 14, 10);
  context.fillRect(32, 16, 14, 10);
  context.fillStyle = outline;
  context.fillRect(0, 44, 12, 1);
  context.fillRect(16, 44, 12, 1);
  context.fillRect(32, 9, 14, 1);
  context.fillRect(32, 25, 14, 1);
  return canvasBytes(canvas);
}

async function makePackIcon() {
  const { canvas, context } = makeCanvas(128, 128);
  const gradient = context.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, '#16261b');
  gradient.addColorStop(1, '#2b5638');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = '#f8d48a';
  context.beginPath();
  context.arc(97, 29, 13, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#7ed99a';
  context.beginPath();
  context.moveTo(34, 48);
  context.lineTo(64, 32);
  context.lineTo(94, 48);
  context.lineTo(64, 64);
  context.closePath();
  context.fill();
  context.fillStyle = '#4f9d5c';
  context.beginPath();
  context.moveTo(34, 48);
  context.lineTo(64, 64);
  context.lineTo(64, 98);
  context.lineTo(34, 80);
  context.closePath();
  context.fill();
  context.fillStyle = '#3a7d4b';
  context.beginPath();
  context.moveTo(94, 48);
  context.lineTo(64, 64);
  context.lineTo(64, 98);
  context.lineTo(94, 80);
  context.closePath();
  context.fill();
  context.fillStyle = '#d7f5de';
  context.font = 'bold 17px sans-serif';
  context.fillText('BLOQUECRAFT', 17, 120);
  return canvasBytes(canvas);
}

function canvasBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la textura PNG.'));
        return;
      }
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
    }, 'image/png');
  });
}

/* ---------- ZIP y exportación ---------- */

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + nameBytes.length + bytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0x21, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, bytes.length, true);
    localView.setUint32(22, bytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(bytes, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0x21, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, bytes.length, true);
    centralView.setUint32(24, bytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((total, entry) => total + entry.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, centrals.length, true);
  endView.setUint16(10, centrals.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);
  const total = offset + centralSize + 22;
  const output = new Uint8Array(total);
  let position = 0;
  for (const entry of locals) {
    output.set(entry, position);
    position += entry.length;
  }
  for (const entry of centrals) {
    output.set(entry, position);
    position += entry.length;
  }
  output.set(end, position);
  return output;
}

async function exportAddon() {
  state.items = state.items.map(hydrateItem).filter(Boolean);
  if (!state.items.length) {
    toast('Añade al menos un objeto, bloque o criatura antes de exportar');
    switchView('designer');
    $('#content-name').focus();
    return;
  }
  const button = $('#export-button');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span>◌</span> Preparando...';
  try {
    const { folder, bp, rp } = packNames();
    const files = { ...buildTextFiles() };
    for (const item of state.items) {
      if (item.type === 'item') files[`${rp}/textures/items/${item.id}.png`] = await makeItemTexture(item);
      else if (item.type === 'block') files[`${rp}/textures/blocks/${item.id}.png`] = await makeBlockTexture(item);
      else files[`${rp}/textures/entity/${item.id}.png`] = await makeEntityTexture(item);
    }
    const icon = await makePackIcon();
    files[`${bp}/pack_icon.png`] = icon;
    files[`${rp}/pack_icon.png`] = icon;
    const archive = zipStore(files);
    const blob = new Blob([archive], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${folder}.mcaddon`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`¡Addon exportado! ${creationCount(state.items.length)} incluida${state.items.length === 1 ? '' : 's'}.`);
  } catch (error) {
    console.error(error);
    toast('No se pudo exportar el addon. Revisa la consola.');
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

/* ---------- IA integrada ---------- */

function aiFieldsVisible() {
  return state.aiMode === 'custom' || state.aiMode === 'ollama';
}

function renderAiSettings() {
  const mode = $('#ai-mode');
  if (!mode) return;
  mode.value = state.aiMode;
  $('#ai-endpoint').value = state.aiMode === 'ollama' && state.aiEndpoint === defaultState.aiEndpoint
    ? 'http://localhost:11434/v1'
    : state.aiEndpoint;
  $('#ai-model').value = state.aiMode === 'ollama' && state.aiModel === defaultState.aiModel
    ? 'llama3.2'
    : state.aiModel;
  $('#ai-key').value = state.aiKey;
  $('#ai-custom-fields').hidden = !aiFieldsVisible();
  const status = $('#ai-status');
  const hint = $('#ai-generate-hint');
  const note = $('#ai-settings-note');
  if (status) {
    const label = aiBusy ? 'GENERANDO...' : ({ auto: 'IA EN LA NUBE', local: 'MOTOR LOCAL', custom: 'API PROPIA', ollama: 'OLLAMA' })[state.aiMode] || 'IA LISTA';
    status.innerHTML = `<i></i><span>${label}</span>`;
    status.classList.toggle('busy', aiBusy);
  }
  if (hint && !aiBusy) {
    hint.textContent = ({
      auto: 'IA en la nube con respaldo local',
      local: 'Sin internet · generación instantánea',
      custom: 'Endpoint compatible con OpenAI',
      ollama: 'Modelo local en tu equipo'
    })[state.aiMode] || 'Generación automática';
  }
  if (note) {
    note.textContent = state.aiMode === 'auto'
      ? 'La IA en la nube usa Pollinations, un servicio gratuito sin clave. Si no responde, el motor local genera el addon igualmente. Tu clave, si usas una API propia, se guarda solo en este navegador.'
      : state.aiMode === 'local'
        ? 'El motor local funciona sin conexión y crea contenido coherente a partir de tu descripción. No envía nada a internet.'
        : state.aiMode === 'ollama'
          ? 'Ollama debe estar ejecutándose en tu equipo y permitir peticiones desde el navegador. Ejecuta Ollama con OLLAMA_ORIGINS=* si el navegador bloquea la conexión.'
          : 'Usa cualquier servicio compatible con OpenAI. La clave se guarda en el almacenamiento local de este navegador; no se envía a ningún servidor propio.';
  }
}

function aiExamples() {
  const container = $('#ai-examples');
  if (!container) return;
  const examples = (window.BloquecraftAI && BloquecraftAI.examples) || [
    'Una espada de escarcha, un bloque de hielo y un golem hostil.',
    'Una manzana lunar que brille y un cristal del vacío.'
  ];
  container.innerHTML = examples.map((example) => `<button type="button" class="ai-example" data-example="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join('');
  container.querySelectorAll('[data-example]').forEach((button) => {
    button.onclick = () => {
      $('#ai-prompt').value = button.dataset.example;
      $('#ai-counter').textContent = button.dataset.example.length;
      $('#ai-prompt').focus();
    };
  });
}

function completionsUrl(config) {
  if (config.provider === 'pollinations') return 'https://text.pollinations.ai/openai';
  const clean = config.endpoint.replace(/\/+$/g, '');
  return /\/chat\/completions$/i.test(clean) ? clean : `${clean}/chat/completions`;
}

function cloudConfig() {
  if (state.aiMode === 'auto') {
    return { provider: 'pollinations', endpoint: 'https://text.pollinations.ai/openai', model: 'openai', key: '' };
  }
  if (state.aiMode === 'ollama') {
    return {
      provider: 'ollama',
      endpoint: state.aiEndpoint || 'http://localhost:11434/v1',
      model: state.aiModel || 'llama3.2',
      key: state.aiKey || ''
    };
  }
  return {
    provider: 'openai',
    endpoint: state.aiEndpoint || 'https://api.openai.com/v1',
    model: state.aiModel || 'gpt-4o-mini',
    key: state.aiKey || ''
  };
}

function extractJsonText(content) {
  const text = String(content || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

async function generateWithCloud(prompt, options) {
  if (!window.BloquecraftAI) throw new Error('El motor de IA no está disponible.');
  const config = cloudConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  const headers = { 'Content-Type': 'application/json' };
  if (config.key) headers.Authorization = `Bearer ${config.key}`;
  try {
    const response = await fetch(completionsUrl(config), {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: BloquecraftAI.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2200
      })
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.text()).slice(0, 180); } catch { /* sin detalle */ }
      throw new Error(`La IA respondió ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? payload?.response ?? '';
    if (!content) throw new Error('La IA no devolvió contenido.');
    return BloquecraftAI.sanitizeExternal(content, { ...options, source: 'ai' });
  } finally {
    clearTimeout(timer);
  }
}

function setAiBusy(busy) {
  aiBusy = busy;
  const button = $('#ai-generate');
  if (button) {
    button.disabled = busy;
    button.classList.toggle('loading', busy);
  }
  if (button) button.querySelector('b').textContent = busy ? 'Creando tu addon...' : 'Generar addon completo';
  if (busy && $('#ai-generate-hint')) $('#ai-generate-hint').textContent = 'Diseñando objetos, texturas y archivos...';
  renderAiSettings();
}

function mergeGenerated(result) {
  const generated = (result.items || []).map(hydrateItem).filter(Boolean);
  if (!generated.length) throw new Error('La IA no generó contenido utilizable.');
  const used = new Set(state.items.map((item) => item.id));
  for (const item of generated) {
    item.id = uniqueId(item.id, used);
    state.items.push(item);
  }
  state.projectName = String(result.projectName || state.projectName || 'Mi addon').slice(0, 32);
  const first = generated[0];
  Object.assign(state, {
    type: first.type,
    kind: first.kind,
    name: first.name,
    id: first.id,
    category: first.category,
    color: first.color,
    description: first.description,
    stackable: first.stackable,
    glow: first.glow,
    edible: first.edible,
    damage: first.damage,
    durability: first.durability,
    nutrition: first.nutrition,
    saturation: first.saturation,
    hardness: first.hardness,
    light: first.light,
    explosion: first.explosion,
    sound: first.sound,
    health: first.health,
    speed: first.speed,
    scale: first.scale,
    spawn: first.spawn,
    drop: first.drop,
    ingredient: first.ingredient,
    recipe: first.recipe,
    rarity: first.rarity
  });
  saveState();
  syncInputs();
  switchView('content');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return generated;
}

async function aiGenerate() {
  if (aiBusy) return;
  const prompt = $('#ai-prompt').value.trim();
  if (prompt.length < 6) {
    $('#ai-prompt').focus();
    toast('Describe tu idea con un poco más de detalle');
    return;
  }
  if (!window.BloquecraftAI) {
    toast('El motor de IA no se cargó. Recarga la página.');
    return;
  }
  const options = {
    existingIds: state.items.map((item) => item.id),
    existingNames: state.items.map((item) => item.name)
  };
  setAiBusy(true);
  let result = null;
  let fallback = '';
  try {
    if (state.aiMode !== 'local' && navigator.onLine !== false) {
      try {
        result = await generateWithCloud(prompt, options);
      } catch (error) {
        console.warn('IA externa no disponible:', error);
        fallback = error.name === 'AbortError' ? 'La IA tardó demasiado' : error.message;
      }
    } else if (state.aiMode !== 'local') {
      fallback = 'Sin conexión a internet';
    }
    if (!result) result = BloquecraftAI.generate(prompt, options);
    const generated = mergeGenerated(result);
    const via = result.source === 'ai' ? 'IA' : 'motor local';
    toast(`${creationCount(generated.length)} generada${generated.length === 1 ? '' : 's'} con ${via}${fallback ? ' (la nube no respondió)' : ''}.`);
    $('#ai-prompt').value = '';
    $('#ai-counter').textContent = '0';
  } catch (error) {
    console.error(error);
    toast(error.message || 'No se pudo generar el addon. Prueba otra descripción.');
  } finally {
    setAiBusy(false);
  }
}

/* ---------- Inicio ---------- */

function init() {
  repairStateValues(state);
  syncInputs();
  aiExamples();
  renderAiSettings();

  $('#project-name').addEventListener('input', updateFromForm);
  ['content-name', 'content-id', 'content-category', 'content-description', 'stackable', 'glow', 'edible'].forEach((id) => {
    $(`#${id}`).addEventListener('input', updateFromForm);
    $(`#${id}`).addEventListener('change', updateFromForm);
  });

  $$('.type-option').forEach((button) => {
    button.addEventListener('click', () => {
      const nextType = button.dataset.type;
      const typeChanged = state.type !== nextType;
      state.type = nextType;
      state.kind = inferKind(state.type, state.name, state.edible);
      state.category = categoryFor(state.type, state.kind, state.category);
      if (typeChanged) applyTypeDefaults(state);
      saveState();
      syncInputs();
    });
  });
  $$('.swatch').forEach((button) => {
    button.addEventListener('click', () => {
      state.color = button.dataset.color;
      saveState();
      syncInputs();
    });
  });

  $('#create-button').addEventListener('click', addItem);
  $$('.nav-link').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  $$('[data-view="content"]').forEach((button) => button.addEventListener('click', () => switchView('content')));
  $('#template-button').addEventListener('click', () => $('#modal').classList.add('open'));
  $('#modal-close').addEventListener('click', () => $('#modal').classList.remove('open'));
  $('#modal').addEventListener('click', (event) => {
    if (event.target.id === 'modal') $('#modal').classList.remove('open');
  });
  $$('.template-options button').forEach((button) => button.addEventListener('click', () => useTemplate(button.dataset.template)));
  ['export-button', 'export-button-content', 'export-button-files'].forEach((id) => $(`#${id}`).addEventListener('click', exportAddon));
  $('#save-button').addEventListener('click', () => saveState(true));
  $('#rename-button').addEventListener('click', () => $('#project-name').focus());
  $('#help-button').addEventListener('click', () => toast('Describe tu idea a la IA o crea contenido manualmente. Exporta un .mcaddon con formato Bedrock 1.21.90+.'));
  $('#search-content').addEventListener('input', renderGrid);
  $$('.filter-tab').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      $$('.filter-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
      renderGrid();
    });
  });
  $('#new-content-button').addEventListener('click', () => switchView('designer'));
  $('#copy-code').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#code-preview code').textContent);
      toast('JSON copiado al portapapeles');
    } catch {
      toast('No se pudo acceder al portapapeles');
    }
  });
  $('#content-id').addEventListener('blur', () => {
    $('#content-id').value = slug($('#content-id').value);
    updateFromForm();
  });

  const prompt = $('#ai-prompt');
  prompt.addEventListener('input', () => { $('#ai-counter').textContent = prompt.value.length; });
  $('#ai-generate').addEventListener('click', aiGenerate);
  prompt.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') aiGenerate();
  });
  $('#ai-settings-toggle').addEventListener('click', () => {
    const panel = $('#ai-settings');
    const open = panel.hidden;
    panel.hidden = !open;
    $('#ai-settings-toggle').setAttribute('aria-expanded', String(open));
    $('#ai-settings-toggle').classList.toggle('open', open);
  });
  $('#ai-mode').addEventListener('change', () => {
    state.aiMode = $('#ai-mode').value;
    if (state.aiMode === 'ollama') {
      state.aiEndpoint = 'http://localhost:11434/v1';
      state.aiModel = 'llama3.2';
    } else if (state.aiMode === 'custom') {
      state.aiEndpoint = 'https://api.openai.com/v1';
      state.aiModel = 'gpt-4o-mini';
    }
    saveState();
    renderAiSettings();
  });
  ['ai-endpoint', 'ai-model', 'ai-key'].forEach((id) => {
    $(`#${id}`).addEventListener('input', () => {
      if (id === 'ai-endpoint') state.aiEndpoint = $(`#${id}`).value.trim();
      if (id === 'ai-model') state.aiModel = $(`#${id}`).value.trim();
      if (id === 'ai-key') state.aiKey = $(`#${id}`).value.trim();
      saveState();
    });
  });
}

init();
