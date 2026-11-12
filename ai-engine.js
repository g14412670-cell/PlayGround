/* Bloquecraft Studio · motor de generación creativa
   Funciona sin conexión: interpreta una descripción y construye especificaciones
   completas para objetos, bloques y criaturas de Bedrock. */
(function () {
  'use strict';

  const ENGINE_VERSION = '1.21.90';
  const DEFAULT_COLOR = '#9b78ee';

  const COLORS = {
    violeta: '#9b78ee', morado: '#9b78ee', purpura: '#9b78ee', purple: '#9b78ee',
    naranja: '#f1a94e', fuego: '#f1a94e', orange: '#f1a94e',
    verde: '#5cc995', naturaleza: '#5cc995', green: '#5cc995',
    azul: '#4ea8de', hielo: '#4ea8de', blue: '#4ea8de',
    rojo: '#e97683', rosa: '#e97683', red: '#e97683',
    dorado: '#d8a63a', oro: '#d8a63a', gold: '#d8a63a', amarillo: '#d8a63a',
    obsidiana: '#4b5563', negro: '#2f3634', black: '#2f3634',
    blanco: '#edf2ea', white: '#edf2ea',
    cian: '#55c7c8', turquesa: '#55c7c8', cyan: '#55c7c8'
  };

  const CATEGORIES = new Set(['items', 'equipment', 'construction', 'nature', 'none']);
  const RARITIES = new Set(['common', 'uncommon', 'rare', 'epic']);
  const SOUNDS = new Set(['stone', 'wood', 'gravel', 'grass', 'sand', 'glass', 'metal', 'wool']);
  const INGREDIENTS = new Set([
    'minecraft:iron_ingot', 'minecraft:gold_ingot', 'minecraft:diamond', 'minecraft:emerald',
    'minecraft:amethyst_shard', 'minecraft:redstone', 'minecraft:copper_ingot', 'minecraft:coal',
    'minecraft:quartz', 'minecraft:blaze_powder', 'minecraft:blue_ice', 'minecraft:obsidian',
    'minecraft:netherite_ingot', 'minecraft:stone', 'minecraft:oak_planks', 'minecraft:phantom_membrane'
  ]);
  const DROPS = new Set([
    'minecraft:rotten_flesh', 'minecraft:bone', 'minecraft:leather', 'minecraft:gunpowder',
    'minecraft:ender_pearl', 'minecraft:amethyst_shard', 'minecraft:blaze_rod',
    'minecraft:gold_nugget', 'minecraft:iron_ingot', 'minecraft:blue_ice',
    'minecraft:phantom_membrane', 'minecraft:obsidian', 'minecraft:diamond',
    'minecraft:netherite_scrap', 'minecraft:copper_ingot'
  ]);

  const THEMES = [
    {
      key: 'fuego', label: 'fuego', of: 'de fuego', color: '#f1a94e', dark: true,
      words: ['fuego', 'llama', 'llamas', 'igneo', 'ignea', 'ardiente', 'infierno', 'lava', 'volcan', 'magma', 'flame', 'fire'],
      rarity: 'rare', light: 13, damage: 2, durability: 120, ingredient: 'minecraft:blaze_powder',
      drop: 'minecraft:blaze_rod', sound: 'stone', glint: true
    },
    {
      key: 'escarcha', label: 'escarcha', of: 'de escarcha', color: '#4ea8de', dark: false,
      words: ['hielo', 'escarcha', 'nieve', 'glaciar', 'frost', 'invierno', 'congelado', 'congelada', 'ice', 'snow', 'azul'],
      rarity: 'rare', light: 5, damage: 1, durability: 180, ingredient: 'minecraft:blue_ice',
      drop: 'minecraft:blue_ice', sound: 'glass', glint: true
    },
    {
      key: 'tormenta', label: 'tormenta', of: 'de la tormenta', color: '#55c7c8', dark: false,
      words: ['tormenta', 'rayo', 'rayos', 'relampago', 'relampagos', 'trueno', 'viento', 'cicion', 'ciclón', 'ciclón', 'huracan', 'huracán', 'electricidad', 'storm', 'thunder'],
      rarity: 'epic', light: 9, damage: 2, durability: 140, ingredient: 'minecraft:copper_ingot',
      drop: 'minecraft:copper_ingot', sound: 'metal', glint: true
    },
    {
      key: 'vacio', label: 'vacío', of: 'del vacío', color: '#9b78ee', dark: true,
      words: ['vacio', 'vacío', 'sombra', 'sombras', 'oscuro', 'oscura', 'arcano', 'arcana', 'magico', 'mágico', 'magica', 'mágica', 'misterioso', 'abismo', 'espiritu', 'espíritu', 'void', 'shadow', 'arcane'],
      rarity: 'epic', light: 7, damage: 2, durability: 160, ingredient: 'minecraft:amethyst_shard',
      drop: 'minecraft:ender_pearl', sound: 'glass', glint: true
    },
    {
      key: 'naturaleza', label: 'naturaleza', of: 'de la naturaleza', color: '#5cc995', dark: false,
      words: ['naturaleza', 'bosque', 'musgo', 'verde', 'selva', 'tierra', 'madera', 'hoja', 'hojas', 'flor', 'flores', 'jardin', 'jardín', 'primavera', 'nature', 'forest', 'moss'],
      rarity: 'uncommon', light: 2, damage: 0, durability: 80, ingredient: 'minecraft:emerald',
      drop: 'minecraft:leather', sound: 'grass', glint: false
    },
    {
      key: 'sangre', label: 'sangre', of: 'de sangre', color: '#e97683', dark: true,
      words: ['sangre', 'carmesi', 'carmesí', 'rojo', 'roja', 'crimson', 'vampiro', 'carne', 'blood', 'red'],
      rarity: 'rare', light: 1, damage: 2, durability: 100, ingredient: 'minecraft:redstone',
      drop: 'minecraft:rotten_flesh', sound: 'stone', glint: false
    },
    {
      key: 'luna', label: 'luna', of: 'de la luna', color: '#8f8be8', dark: true,
      words: ['luna', 'lunar', 'selene', 'noche', 'estelar', 'estrella', 'estrellas', 'cosmico', 'cósmico', 'moon', 'night', 'star'],
      rarity: 'epic', light: 10, damage: 1, durability: 150, ingredient: 'minecraft:amethyst_shard',
      drop: 'minecraft:phantom_membrane', sound: 'glass', glint: true
    },
    {
      key: 'obsidiana', label: 'obsidiana', of: 'de obsidiana', color: '#4b5563', dark: true,
      words: ['obsidiana', 'obsidian'],
      rarity: 'epic', light: 2, damage: 3, durability: 500, ingredient: 'minecraft:obsidian',
      drop: 'minecraft:obsidian', sound: 'stone', glint: false
    },
    {
      key: 'diamante', label: 'diamante', of: 'de diamante', color: '#4ea8de', dark: false,
      words: ['diamante', 'diamantes', 'diamond'],
      rarity: 'rare', light: 4, damage: 2, durability: 700, ingredient: 'minecraft:diamond',
      drop: 'minecraft:diamond', sound: 'glass', glint: true
    },
    {
      key: 'netherita', label: 'netherita', of: 'de netherita', color: '#7a3b33', dark: true,
      words: ['netherita', 'netherite'],
      rarity: 'epic', light: 3, damage: 3, durability: 1100, ingredient: 'minecraft:netherite_ingot',
      drop: 'minecraft:netherite_scrap', sound: 'metal', glint: false
    },
    {
      key: 'oro', label: 'oro', of: 'de oro', color: '#d8a63a', dark: false,
      words: ['oro', 'dorado', 'dorada', 'golden', 'gold'],
      rarity: 'uncommon', light: 5, damage: 1, durability: 90, ingredient: 'minecraft:gold_ingot',
      drop: 'minecraft:gold_nugget', sound: 'metal', glint: true
    },
    {
      key: 'amatista', label: 'amatista', of: 'de amatista', color: '#9b78ee', dark: false,
      words: ['amatista', 'amethyst'],
      rarity: 'rare', light: 5, damage: 1, durability: 180, ingredient: 'minecraft:amethyst_shard',
      drop: 'minecraft:amethyst_shard', sound: 'glass', glint: true
    },
    {
      key: 'hierro', label: 'hierro', of: 'de hierro', color: '#9aa4ad', dark: false,
      words: ['hierro', 'iron'],
      rarity: 'common', light: 0, damage: 1, durability: 200, ingredient: 'minecraft:iron_ingot',
      drop: 'minecraft:iron_ingot', sound: 'metal', glint: false
    },
    {
      key: 'piedra', label: 'piedra', of: 'de piedra', color: '#7d8580', dark: false,
      words: ['piedra', 'roca', 'stone', 'rock'],
      rarity: 'common', light: 0, damage: 0, durability: 60, ingredient: 'minecraft:stone',
      drop: 'minecraft:stone', sound: 'stone', glint: false
    },
    {
      key: 'cobre', label: 'cobre', of: 'de cobre', color: '#c07a4a', dark: false,
      words: ['cobre', 'copper'],
      rarity: 'common', light: 0, damage: 0, durability: 80, ingredient: 'minecraft:copper_ingot',
      drop: 'minecraft:copper_ingot', sound: 'metal', glint: false
    }
  ];

  const MATERIALS = [
    { key: 'obsidiana', words: ['obsidiana', 'obsidian'], damage: 2, durability: 500, health: 12, ingredient: 'minecraft:obsidian', drop: 'minecraft:obsidian' },
    { key: 'diamante', words: ['diamante', 'diamantes', 'diamond'], damage: 2, durability: 700, health: 8, ingredient: 'minecraft:diamond', drop: 'minecraft:diamond' },
    { key: 'netherita', words: ['netherita', 'netherite'], damage: 3, durability: 1000, health: 16, ingredient: 'minecraft:netherite_ingot', drop: 'minecraft:netherite_scrap' },
    { key: 'oro', words: ['oro', 'dorado', 'gold'], damage: 1, durability: 100, health: 4, ingredient: 'minecraft:gold_ingot', drop: 'minecraft:gold_nugget' },
    { key: 'hierro', words: ['hierro', 'iron'], damage: 1, durability: 200, health: 6, ingredient: 'minecraft:iron_ingot', drop: 'minecraft:iron_ingot' },
    { key: 'amatista', words: ['amatista', 'amethyst'], damage: 1, durability: 180, health: 5, ingredient: 'minecraft:amethyst_shard', drop: 'minecraft:amethyst_shard' },
    { key: 'cobre', words: ['cobre', 'copper'], damage: 0, durability: 80, health: 3, ingredient: 'minecraft:copper_ingot', drop: 'minecraft:copper_ingot' },
    { key: 'piedra', words: ['piedra', 'roca', 'stone'], damage: 0, durability: 60, health: 2, ingredient: 'minecraft:stone', drop: 'minecraft:stone' },
    { key: 'madera', words: ['madera', 'wood', 'roble'], damage: 0, durability: 40, health: 0, ingredient: 'minecraft:oak_planks', drop: 'minecraft:oak_planks' }
  ];

  const ITEM_BASES = {
    gem: {
      stackable: true, glow: false, edible: false, rarity: 'common', damage: 0, durability: 0,
      cooldown: 0.4, nutrition: 4, saturation: 0.6, recipe: true, ingredient: 'minecraft:amethyst_shard'
    },
    food: {
      stackable: true, glow: false, edible: true, rarity: 'common', damage: 0, durability: 0,
      cooldown: 0.4, nutrition: 6, saturation: 0.8, recipe: true, ingredient: 'minecraft:apple'
    },
    sword: {
      stackable: false, glow: false, edible: false, rarity: 'uncommon', damage: 8, durability: 600,
      cooldown: 0.55, nutrition: 4, saturation: 0.6, recipe: true, ingredient: 'minecraft:iron_ingot'
    },
    axe: {
      stackable: false, glow: false, edible: false, rarity: 'uncommon', damage: 10, durability: 700,
      cooldown: 0.9, nutrition: 4, saturation: 0.6, recipe: true, ingredient: 'minecraft:iron_ingot'
    },
    pickaxe: {
      stackable: false, glow: false, edible: false, rarity: 'uncommon', damage: 4, durability: 500,
      cooldown: 0.5, nutrition: 4, saturation: 0.6, recipe: true, ingredient: 'minecraft:iron_ingot'
    },
    spear: {
      stackable: false, glow: false, edible: false, rarity: 'rare', damage: 9, durability: 650,
      cooldown: 0.7, nutrition: 4, saturation: 0.6, recipe: true, ingredient: 'minecraft:iron_ingot'
    }
  };

  const BLOCK_BASE = {
    stackable: true, glow: false, edible: false, rarity: 'common', damage: 0, durability: 0,
    cooldown: 0.4, nutrition: 4, saturation: 0.6, hardness: 2.5, light: 0,
    explosion: 6, sound: 'stone', recipe: true, ingredient: 'minecraft:stone'
  };

  const ENTITY_BASE = {
    stackable: false, glow: false, edible: false, rarity: 'common', damage: 4, durability: 0,
    cooldown: 0.4, nutrition: 4, saturation: 0.6, hardness: 0, light: 0,
    explosion: 0, sound: 'stone', health: 30, speed: 0.25, scale: 1,
    spawn: true, drop: 'minecraft:rotten_flesh', recipe: false, ingredient: 'minecraft:iron_ingot'
  };

  const NOUNS = {
    sword: ['espada', 'sable', 'katana', 'daga', 'filo', 'mandoble', 'sword', 'blade'],
    axe: ['hacha', 'hachuela', 'axe', 'hatchet'],
    pickaxe: ['pico', 'picota', 'pickaxe', 'pick'],
    spear: ['lanza', 'tridente', 'spear', 'trident'],
    food: ['manzana', 'fruta', 'comida', 'pan', 'estofado', 'bayas', 'pastel', 'galleta', 'platano', 'plátano', 'apple', 'food'],
    gem: ['cristal', 'gema', 'amatista', 'rubi', 'rubí', 'esmeralda', 'orbe', 'reliquia', 'moneda', 'objeto', 'lingote', 'anillo', 'talisman', 'talismán', 'gem', 'crystal', 'orb'],
    block: ['bloque', 'piedra', 'roca', 'ladrillo', 'mineral', 'block', 'stone', 'brick'],
    entity: ['golem', 'dragon', 'dragón', 'criatura', 'mob', 'guardian', 'guardián', 'espiritu', 'espíritu', 'zombi', 'zombie', 'esqueleto', 'bestia', 'lobo', 'gato', 'perro', 'ciervo', 'vaca', 'cerdo', 'oveja', 'gallina', 'caballo', 'zorro', 'oso', 'conejo', 'araña', 'murciélago', 'abeja', 'pez', 'tortuga', 'pájaro', 'pajaro', 'rana', 'ave', 'serpiente', 'demonio', 'titan', 'titán', 'entidad', 'animal', 'mascota']
  };

  const NOUN_LABELS = {
    espada: 'Espada', sable: 'Sable', katana: 'Katana', daga: 'Daga', filo: 'Filo', mandoble: 'Mandoble', sword: 'Espada', blade: 'Filo',
    hacha: 'Hacha', hachuela: 'Hachuela', axe: 'Hacha', hatchet: 'Hachuela',
    pico: 'Pico', picota: 'Picota', pickaxe: 'Pico', pick: 'Pico',
    lanza: 'Lanza', tridente: 'Tridente', spear: 'Lanza', trident: 'Tridente',
    manzana: 'Manzana', fruta: 'Fruta', comida: 'Comida', pan: 'Pan', estofado: 'Estofado', bayas: 'Bayas', pastel: 'Pastel', galleta: 'Galleta', platano: 'Plátano', plátano: 'Plátano', apple: 'Manzana', food: 'Comida',
    cristal: 'Cristal', gema: 'Gema', amatista: 'Amatista', rubi: 'Rubí', rubí: 'Rubí', esmeralda: 'Esmeralda', orbe: 'Orbe', reliquia: 'Reliquia', moneda: 'Moneda', objeto: 'Objeto', lingote: 'Lingote', anillo: 'Anillo', talisman: 'Talismán', talismán: 'Talismán', gem: 'Gema', crystal: 'Cristal', orb: 'Orbe',
    bloque: 'Bloque', piedra: 'Piedra', roca: 'Roca', ladrillo: 'Ladrillo', mineral: 'Mineral', block: 'Bloque', stone: 'Piedra', brick: 'Ladrillo',
    golem: 'Golem', dragon: 'Dragón', dragón: 'Dragón', criatura: 'Criatura', mob: 'Criatura', guardian: 'Guardián', guardián: 'Guardián', espiritu: 'Espíritu', espíritu: 'Espíritu', zombi: 'Zombi', zombie: 'Zombi', esqueleto: 'Esqueleto', bestia: 'Bestia', lobo: 'Lobo', gato: 'Gato', perro: 'Perro', ciervo: 'Ciervo', vaca: 'Vaca', cerdo: 'Cerdo', oveja: 'Oveja', gallina: 'Gallina', caballo: 'Caballo', zorro: 'Zorro', oso: 'Oso', conejo: 'Conejo', araña: 'Araña', murciélago: 'Murciélago', abeja: 'Abeja', pez: 'Pez', tortuga: 'Tortuga', pájaro: 'Pájaro', pajaro: 'Pájaro', rana: 'Rana', ave: 'Ave', serpiente: 'Serpiente', demonio: 'Demonio', titan: 'Titán', titán: 'Titán', entidad: 'Criatura', animal: 'Animal', mascota: 'Mascota'
  };

  const SYSTEM_PROMPT = `Eres un diseñador experto de addons para Minecraft Bedrock ${ENGINE_VERSION}. Convierte la idea del usuario en contenido completo, coherente y jugable.
Devuelve SOLO JSON válido, sin markdown ni explicaciones. Estructura:
{"projectName":"Nombre del addon","items":[
{"type":"item","kind":"sword|axe|pickaxe|spear|gem|food","name":"...","id":"minusculas_con_guiones_bajos","color":"#rrggbb","description":"...","damage":0,"durability":0,"cooldown":0.5,"nutrition":4,"saturation":0.6,"rarity":"common|uncommon|rare|epic","glow":false,"recipe":true,"ingredient":"minecraft:diamond"},
{"type":"block","kind":"block","name":"...","id":"...","color":"#rrggbb","description":"...","hardness":3,"light":0,"explosion":6,"sound":"stone","recipe":true,"ingredient":"minecraft:stone"},
{"type":"entity","kind":"passive|neutral|hostile","name":"...","id":"...","color":"#rrggbb","description":"...","health":40,"damage":7,"speed":0.25,"scale":1,"spawn":true,"drop":"minecraft:rotten_flesh"}
]}
Reglas: 1 a 6 items; nombres en español de máximo 32 caracteres; ids únicos en minúsculas (a-z, 0-9, _), máximo 24; descripciones de máximo 100 caracteres; colores hexadecimales; daño 0-50; durabilidad 0-5000; salud 1-200; velocidad 0.1-1; escala 0.6-1.6; luz 0-15; rareza solo para objetos. Para armas usa recipe true e ingredient de una lista vanilla válida. Los bloques deben ser sólidos. Las criaturas deben ser compatibles con Bedrock y tener spawn egg. No inventes componentes; usa solo datos de juego.`;

  const EXAMPLES = [
    'Forja un arsenal de escarcha: espada, hacha y un golem hostil que patrulle la nieve.',
    'Crea una manzana lunar que brille y un bloque de cristal que ilumine la noche.',
    'Un addon de fuego con espada, pico, bloque de magma y un dragón hostil.',
    'Una reliquia del vacío, un bloque de obsidiana rúnica y un guardián neutral.'
  ];

  function cleanText(value, max) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 200);
  }

  function cleanMultiline(value, max) {
    return String(value == null ? '' : value)
      .replace(/\r/g, '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, max || 200);
  }

  function slugify(value) {
    let text = String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (/^[0-9]/.test(text)) text = 'b_' + text;
    return text.slice(0, 24).replace(/_+$/g, '') || '';
  }

  function uniqueId(base, used) {
    let id = base || 'contenido';
    let n = 2;
    while (used.has(id)) {
      const suffix = '_' + n;
      id = (base || 'contenido').slice(0, 24 - suffix.length) + suffix;
      n += 1;
    }
    used.add(id);
    return id;
  }

  function uniqueName(base, used) {
    let name = base;
    let n = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = n === 2 ? ' II' : ' ' + n;
      name = base.slice(0, 32 - suffix.length) + suffix;
      n += 1;
    }
    used.add(name.toLowerCase());
    return name;
  }

  function toBool(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
  }

  function numberValue(value, fallback, min, max, integer) {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value == null ? '' : value).replace(',', '.'));
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    const safeFallback = Number.isFinite(fallback) ? fallback : safeMin;
    let result = Number.isFinite(parsed) ? parsed : safeFallback;
    result = Math.min(safeMax, Math.max(safeMin, result));
    return integer ? Math.round(result) : Math.round(result * 100) / 100;
  }

  function normalizeColor(value) {
    if (typeof value !== 'string') return DEFAULT_COLOR;
    const trimmed = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
    if (/^#[0-9a-f]{3}$/.test(trimmed)) {
      return '#' + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3];
    }
    const key = trimmed.replace(/^#/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return COLORS[key] || DEFAULT_COLOR;
  }

  function normalizeType(value) {
    const text = String(value == null ? '' : value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['block', 'bloque', 'decoracion', 'construccion'].includes(text)) return 'block';
    if (['entity', 'entidad', 'mob', 'criatura', 'creature'].includes(text)) return 'entity';
    if (['item', 'objeto', 'arma', 'weapon', 'comida', 'food', 'gem', 'gema'].includes(text)) return 'item';
    return 'item';
  }

  function normalizeKind(type, value) {
    const text = String(value == null ? '' : value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (type === 'block') return 'block';
    if (type === 'entity') {
      if (['passive', 'pasiva', 'pasivo', 'animal', 'mascota', 'amistosa'].includes(text)) return 'passive';
      if (['neutral', 'neutrala', 'defensiva', 'defensivo'].includes(text)) return 'neutral';
      if (['hostile', 'hostil', 'enemigo', 'monstruo', 'monster'].includes(text)) return 'hostile';
      return 'hostile';
    }
    if (['sword', 'espada', 'sable', 'katana', 'daga', 'filo'].includes(text)) return 'sword';
    if (['axe', 'hacha', 'hachuela'].includes(text)) return 'axe';
    if (['pickaxe', 'pico', 'picota'].includes(text)) return 'pickaxe';
    if (['spear', 'lanza', 'tridente'].includes(text)) return 'spear';
    if (['food', 'comida', 'manzana', 'fruta'].includes(text)) return 'food';
    if (['gem', 'gema', 'cristal', 'objeto', 'item'].includes(text)) return 'gem';
    return 'gem';
  }

  function defaultFor(type, kind) {
    let base;
    if (type === 'block') base = { ...BLOCK_BASE };
    else if (type === 'entity') base = { ...ENTITY_BASE };
    else base = { ...(ITEM_BASES[kind] || ITEM_BASES.gem) };
    return {
      ...base, type, kind, name: '', id: '', category: type === 'block' ? 'construction' : type === 'entity' ? 'items' : 'items',
      color: DEFAULT_COLOR, description: ''
    };
  }

  function inferKind(type, raw) {
    const name = String(raw.name || raw.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (type === 'block') return 'block';
    if (type === 'entity') {
      if (/pasiv|animal|mascota|amigable|inofensiv/.test(name)) return 'passive';
      if (/hostil|enemigo|monstruo|maligno|agresiv|demonio|dragon|zombi|esqueleto|titan|bestia/.test(name)) return 'hostile';
      if (/neutral|guardian|golem|protector/.test(name)) return 'neutral';
      return 'hostile';
    }
    if (toBool(raw.edible, false) || raw.category === 'food') return 'food';
    if (NOUNS.sword.some((word) => name.includes(word))) return 'sword';
    if (NOUNS.axe.some((word) => name.includes(word))) return 'axe';
    if (NOUNS.pickaxe.some((word) => name.includes(word))) return 'pickaxe';
    if (NOUNS.spear.some((word) => name.includes(word))) return 'spear';
    return 'gem';
  }

  function themeScore(text, theme) {
    let score = 0;
    for (const word of theme.words) {
      if (text === word || text.includes(' ' + word + ' ') || text.startsWith(word + ' ') || text.endsWith(' ' + word) || text.includes(word)) {
        score += word.length >= 4 ? 1 : 0.5;
      }
    }
    return score;
  }

  function detectTheme(text) {
    const normalized = String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let best = null;
    let bestScore = 0;
    for (const theme of THEMES) {
      const score = themeScore(normalized, theme);
      if (score > bestScore) {
        best = theme;
        bestScore = score;
      }
    }
    return best;
  }

  function detectMaterial(text) {
    const normalized = String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const material of MATERIALS) {
      if (material.words.some((word) => normalized.includes(word))) return material;
    }
    return null;
  }

  function detectKind(clause) {
    const text = String(clause).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (NOUNS.entity.some((word) => text.includes(word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      let behavior = 'hostile';
      if (/pasiv|amigable|inofensiv|animal|mascota/.test(text)) behavior = 'passive';
      else if (/hostil|enemigo|monstruo|maligno|agresiv/.test(text)) behavior = 'hostile';
      else if (/neutral|guardian|golem|protector|defiende/.test(text)) behavior = 'neutral';
      else if (/perro|gato|vaca|cerdo|oveja|gallina|caballo|zorro|conejo|pez|tortuga|pajaro|rana|ciervo|ave|murcielago/.test(text)) behavior = 'passive';
      else if (/lobo|abeja|oso/.test(text)) behavior = 'neutral';
      else if (/dragon|zombi|esqueleto|demonio|bestia|titan|arana|serpiente/.test(text)) behavior = 'hostile';
      return { type: 'entity', kind: behavior };
    }
    if (/\bbloque\b|\bpiedra\b|\broca\b|\bladrillo\b|\bmineral\b/.test(text)) {
      return { type: 'block', kind: 'block' };
    }
    if (NOUNS.sword.some((word) => text.includes(word))) return { type: 'item', kind: 'sword' };
    if (NOUNS.axe.some((word) => text.includes(word))) return { type: 'item', kind: 'axe' };
    if (NOUNS.pickaxe.some((word) => text.includes(word))) return { type: 'item', kind: 'pickaxe' };
    if (NOUNS.spear.some((word) => text.includes(word))) return { type: 'item', kind: 'spear' };
    if (NOUNS.food.some((word) => text.includes(word))) return { type: 'item', kind: 'food' };
    if (NOUNS.gem.some((word) => text.includes(word))) return { type: 'item', kind: 'gem' };
    return null;
  }

  function splitClauses(prompt) {
    const chunks = String(prompt)
      .replace(/\n+/g, ' , ')
      .split(/\s*[,;]\s*|\s+(?:y|e|con)\s+/i)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 1);
    return chunks.length ? chunks : [String(prompt).trim()];
  }

  function nounFor(kind, clause, fallback) {
    const text = String(clause).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const groups = {
      sword: NOUNS.sword, axe: NOUNS.axe, pickaxe: NOUNS.pickaxe, spear: NOUNS.spear,
      food: NOUNS.food, gem: NOUNS.gem, block: NOUNS.block, entity: NOUNS.entity
    };
    const list = groups[kind] || [];
    for (const word of list) {
      const normalizedWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (text.includes(normalizedWord)) return NOUN_LABELS[word] || fallback;
    }
    return fallback;
  }

  function categoryFor(type, kind, theme) {
    if (type === 'block') return theme && theme.key === 'naturaleza' ? 'nature' : 'construction';
    if (type === 'entity') return 'items';
    if (['sword', 'axe', 'pickaxe', 'spear'].includes(kind)) return 'equipment';
    return 'items';
  }

  function defaultSet(theme) {
    return [
      { type: 'item', kind: 'sword' },
      { type: 'item', kind: 'axe' },
      { type: 'block', kind: 'block' },
      { type: 'entity', kind: theme && theme.dark ? 'hostile' : 'neutral' }
    ];
  }

  function rarityRank(value) {
    return { common: 0, uncommon: 1, rare: 2, epic: 3 }[value] || 0;
  }

  function bestRarity(...values) {
    return values.filter(Boolean).sort((a, b) => rarityRank(b) - rarityRank(a))[0] || 'common';
  }

  function localDescription(type, kind, theme) {
    if (type === 'block') return `Un bloque de ${theme.label} con textura propia. Perfecto para construir, decorar y dar carácter a tu mundo.`;
    if (type === 'entity') {
      if (kind === 'hostile') return `Una criatura hostil nacida de ${theme.label}. Patrulla la superficie y ataca a los jugadores que se acercan.`;
      if (kind === 'neutral') return `Una criatura neutral de ${theme.label}. Solo ataca si se siente amenazada.`;
      return `Una criatura pacífica de ${theme.label}. Explora el mundo y huye cuando detecta peligro.`;
    }
    if (kind === 'food') return `Un alimento tocado por ${theme.label}. Restaura hambre y da un impulso al explorador.`;
    if (kind === 'gem') return `Un cristal que concentra ${theme.label}. Brilla incluso en la oscuridad más profunda.`;
    if (kind === 'axe') return `Un hacha pesada imbuida con ${theme.label}. Rompe la guardia de cualquier enemigo.`;
    if (kind === 'pickaxe') return `Una herramienta de minero con el poder de ${theme.label}. Abre túneles en la roca.`;
    if (kind === 'spear') return `Una lanza forjada con ${theme.label}. Mantén la distancia y ataca con precisión.`;
    return `Un filo forjado con ${theme.label}. Un arma de combate con un golpe que no perdona.`;
  }

  function buildLocalSpec(spec, theme, material, usedIds, usedNames, explicitName) {
    const type = spec.type;
    const kind = spec.kind;
    const mat = material && theme && material.key === theme.key ? null : material;
    const base = defaultFor(type, kind);
    let noun = nounFor(type === 'entity' ? 'entity' : kind, spec.clause || '', type === 'entity' ? 'Criatura' : type === 'block' ? 'Bloque' : 'Cristal');
    if (slugify(noun) === slugify(theme.label)) {
      if (type === 'block') noun = 'Bloque';
      else if (type === 'entity') noun = 'Criatura';
      else if (kind === 'food') noun = 'Alimento';
      else if (kind === 'gem') noun = 'Gema';
      else noun = 'Reliquia';
    }
    const rawName = explicitName || `${noun} ${theme.of}`;
    const name = uniqueName(cleanText(rawName, 32) || `${noun} ${theme.of}`, usedNames);
    const id = uniqueId(slugify(name), usedIds);
    const rarity = type === 'item' ? bestRarity(theme.rarity, mat && (mat.key === 'oro' ? 'uncommon' : mat.key === 'hierro' ? 'common' : 'rare')) : 'common';
    const item = {
      ...base, type, kind, name, id,
      color: theme.color,
      category: categoryFor(type, kind, theme),
      description: localDescription(type, kind, theme)
    };

    if (type === 'item' && ['sword', 'axe', 'pickaxe', 'spear'].includes(kind)) {
      const damageBase = { sword: 7, axe: 9, pickaxe: 4, spear: 8 }[kind];
      const durabilityBase = { sword: 500, axe: 550, pickaxe: 450, spear: 500 }[kind];
      item.damage = numberValue(damageBase + (theme.damage || 0) + (mat ? mat.damage : 0), 8, 1, 50, true);
      item.durability = numberValue(durabilityBase + (theme.durability || 0) + (mat ? mat.durability : 0), 600, 1, 5000, true);
      item.cooldown = numberValue({ sword: 0.55, axe: 0.9, pickaxe: 0.5, spear: 0.7 }[kind], 0.55, 0.2, 3, false);
      item.rarity = rarity;
      item.glow = Boolean(theme.glint || mat && mat.key === 'diamante' || rarity === 'epic');
      item.stackable = false;
      item.edible = false;
      item.recipe = true;
      item.ingredient = (mat && mat.ingredient) || theme.ingredient;
    } else if (type === 'item' && kind === 'food') {
      item.nutrition = numberValue(theme.key === 'naturaleza' ? 8 : 6, 6, 1, 20, true);
      item.saturation = numberValue(theme.key === 'naturaleza' ? 1 : 0.8, 0.8, 0.1, 2, false);
      item.edible = true;
      item.stackable = true;
      item.damage = 0;
      item.durability = 0;
      item.rarity = bestRarity(theme.rarity, 'common');
      item.glow = Boolean(theme.glint && ['luna', 'fuego', 'vacio', 'diamante', 'amatista'].includes(theme.key));
      item.recipe = true;
      item.ingredient = (mat && mat.ingredient) || 'minecraft:apple';
    } else if (type === 'item') {
      item.stackable = true;
      item.edible = false;
      item.damage = 0;
      item.durability = 0;
      item.rarity = rarity;
      item.glow = Boolean(theme.glint || mat && mat.key === 'diamante');
      item.recipe = true;
      item.ingredient = (mat && mat.ingredient) || theme.ingredient;
    } else if (type === 'block') {
      item.stackable = true;
      item.hardness = numberValue(2.5 + (mat ? (mat.key === 'obsidiana' ? 8 : mat.key === 'piedra' ? 1 : mat.key === 'madera' ? -1 : 2) : 0), 2.5, 0.1, 50, false);
      item.light = numberValue(theme.light || 0, 0, 0, 15, true);
      item.explosion = numberValue(theme.key === 'obsidiana' ? 30 : 6 + (mat ? 4 : 0), 6, 0, 100, false);
      item.sound = theme.sound;
      item.glow = item.light > 0;
      item.recipe = true;
      item.ingredient = (mat && mat.ingredient) || theme.ingredient;
    } else if (type === 'entity') {
      const behaviorBase = kind === 'hostile' ? 8 : kind === 'neutral' ? 5 : 0;
      item.health = numberValue((kind === 'hostile' ? 40 : kind === 'neutral' ? 35 : 24) + (mat ? mat.health : 0), 30, 1, 200, true);
      item.damage = numberValue(behaviorBase + (theme.damage || 0) + (mat ? mat.damage : 0), 5, 0, 50, true);
      item.speed = numberValue(0.25 + (theme.key === 'tormenta' ? 0.05 : 0), 0.25, 0.1, 1, false);
      item.scale = numberValue(mat && mat.key === 'obsidiana' ? 1.2 : 1, 1, 0.6, 1.6, false);
      item.spawn = true;
      item.drop = (mat && mat.drop) || theme.drop;
      item.glow = false;
      item.recipe = false;
    }
    return item;
  }

  function extractProjectName(prompt) {
    const match = String(prompt).match(/(?:proyecto|addon|mod|paquete)\s+(?:llamad[oa]\s+)?["“'']([^"”'']{2,32})["”'']/i);
    return match ? cleanText(match[1], 32) : '';
  }

  function extractExplicitName(prompt) {
    const match = String(prompt).match(/(?:llamad[oa]|nombre)\s+["“'']([^"”'']{2,32})["”'']/i);
    return match ? cleanText(match[1], 32) : '';
  }

  function generate(prompt, options) {
    const optionsValue = options || {};
    const text = cleanMultiline(prompt, 500);
    if (!text) throw new Error('Describe tu idea para generar el addon.');
    const globalTheme = detectTheme(text) || THEMES[3];
    const globalMaterial = detectMaterial(text);
    const chunks = splitClauses(text);
    const detected = [];
    for (const clause of chunks) {
      const kind = detectKind(clause);
      if (!kind) continue;
      const clauseTheme = detectTheme(clause) || globalTheme;
      const clauseMaterial = detectMaterial(clause) || globalMaterial;
      detected.push({ ...kind, clause, theme: clauseTheme, material: clauseMaterial });
    }

    const wantsArsenal = /addon|arsenal|paquete|forja|combate|guerra|acci[oó]n|mod\b/i.test(text);
    let selected = detected.length ? detected.slice(0, 6) : defaultSet(globalTheme).map((spec) => ({ ...spec, clause: text, theme: globalTheme, material: globalMaterial }));
    if (wantsArsenal && selected.length < 3) {
      const extras = defaultSet(globalTheme);
      for (const extra of extras) {
        if (selected.length >= 4) break;
        if (!selected.some((entry) => entry.type === extra.type && entry.kind === extra.kind)) {
          selected.push({ ...extra, clause: text, theme: globalTheme, material: globalMaterial });
        }
      }
    }

    const deduped = [];
    const seen = new Set();
    for (const entry of selected) {
      const key = entry.type + '|' + entry.kind + '|' + cleanText(entry.clause, 120).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(entry);
    }

    const usedIds = new Set(optionsValue.existingIds || []);
    const usedNames = new Set((optionsValue.existingNames || []).map((name) => String(name).toLowerCase()));
    const explicitName = deduped.length === 1 ? extractExplicitName(text) : '';
    const items = deduped.slice(0, 6).map((entry) => buildLocalSpec(entry, entry.theme, entry.material, usedIds, usedNames, explicitName));
    if (!items.length) throw new Error('No se pudo interpretar la idea. Prueba a nombrar una espada, un bloque o una criatura.');

    let projectName = extractProjectName(text);
    if (!projectName) {
      const theme = deduped[0].theme;
      projectName = items.length >= 3 ? `Forja ${theme.of}` : `Addon ${theme.of}`;
    }
    projectName = cleanText(projectName, 32) || 'Mi addon generado';
    return { projectName, items, source: 'local' };
  }

  function sanitizeExternal(data, options) {
    const optionsValue = options || {};
    let payload = data;
    if (typeof payload === 'string') {
      let text = payload.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) text = text.slice(start, end + 1);
      try { payload = JSON.parse(text); } catch (error) { throw new Error('La IA devolvió un texto que no es JSON válido.'); }
    }
    if (Array.isArray(payload)) payload = { items: payload };
    if (!payload || typeof payload !== 'object') throw new Error('La IA no devolvió un addon válido.');
    if (payload.addon && typeof payload.addon === 'object') payload = { ...payload, ...payload.addon };
    const rawItems = payload.items || payload.content || payload.creations || payload.contenido;
    if (!Array.isArray(rawItems) || !rawItems.length) throw new Error('La IA no incluyó contenido para el addon.');

    const usedIds = new Set(optionsValue.existingIds || []);
    const usedNames = new Set((optionsValue.existingNames || []).map((name) => String(name).toLowerCase()));
    const items = [];
    for (const raw of rawItems.slice(0, 6)) {
      if (!raw || typeof raw !== 'object') continue;
      const rawName = raw.name || raw.nombre || raw.display_name;
      if (!rawName) continue;
      const type = normalizeType(raw.type || raw.tipo || (raw.health || raw.vida ? 'entity' : raw.hardness || raw.dureza ? 'block' : 'item'));
      let kind = raw.kind || raw.archetype || raw.arquetipo || raw.behavior || raw.comportamiento;
      if (!kind && type === 'item' && raw.edible) kind = 'food';
      if (!kind && type === 'entity') kind = raw.hostile ? 'hostile' : 'neutral';
      kind = normalizeKind(type, kind || inferKind(type, raw));
      const item = normalizeItem({
        ...raw,
        type, kind,
        name: rawName,
        id: raw.id || raw.identifier || raw.identificador || rawName,
        description: raw.description || raw.descripcion || raw.descripción || '',
        color: raw.color || raw.colour || (detectTheme(String(rawName) + ' ' + (raw.description || '')) || {}).color,
        damage: raw.damage ?? raw.daño ?? raw.dano ?? raw.attack ?? raw.ataque,
        durability: raw.durability ?? raw.durabilidad,
        cooldown: raw.cooldown ?? raw.enfriamiento,
        nutrition: raw.nutrition ?? raw.nutricion ?? raw.nutrición,
        saturation: raw.saturation ?? raw.saturacion ?? raw.saturación,
        hardness: raw.hardness ?? raw.dureza,
        light: raw.light ?? raw.luz,
        explosion: raw.explosion ?? raw.resistencia,
        sound: raw.sound ?? raw.sonido,
        health: raw.health ?? raw.vida,
        speed: raw.speed ?? raw.velocidad,
        scale: raw.scale ?? raw.escala,
        spawn: raw.spawn ?? raw.generar,
        drop: raw.drop ?? raw.botín ?? raw.botin,
        recipe: raw.recipe ?? raw.receta,
        ingredient: raw.ingredient ?? raw.ingrediente,
        rarity: raw.rarity ?? raw.rareza,
        glow: raw.glow ?? raw.brillo,
        stackable: raw.stackable ?? raw.apilable,
        edible: raw.edible ?? raw.comestible
      }, { unique: true, uniqueNames: true, existingIds: usedIds, existingNames: usedNames });
      if (item) items.push(item);
    }
    if (!items.length) throw new Error('La IA no devolvió contenido con un formato válido. Prueba de nuevo o usa la IA local.');
    const projectName = cleanText(payload.projectName || payload.project || payload.nombreProyecto || payload.nombre || '', 32) || `Forja de ${items[0].name}`;
    return { projectName, items, source: optionsValue.source || 'ai' };
  }

  function normalizeItem(raw, options) {
    if (!raw || typeof raw !== 'object') return null;
    const optionsValue = options || {};
    const type = normalizeType(raw.type || raw.tipo);
    const kind = normalizeKind(type, raw.kind || raw.archetype || raw.arquetipo || inferKind(type, raw));
    const base = defaultFor(type, kind);
    const rawName = cleanText(raw.name || raw.nombre || '', 32);
    const fallbackName = type === 'block' ? 'Bloque' : type === 'entity' ? 'Criatura' : kind === 'food' ? 'Comida' : kind === 'gem' ? 'Cristal' : 'Objeto';
    const existingNames = optionsValue.existingNames instanceof Set
      ? optionsValue.existingNames
      : new Set((optionsValue.existingNames || []).map((n) => String(n).toLowerCase()));
    const name = optionsValue.uniqueNames ? uniqueName(rawName || fallbackName, existingNames) : (rawName || fallbackName);
    let id = slugify(raw.id || raw.identifier || raw.identificador || name);
    if (!id) id = 'contenido';
    if (optionsValue.unique) {
      const existingIds = optionsValue.existingIds instanceof Set
        ? optionsValue.existingIds
        : new Set(optionsValue.existingIds || []);
      id = uniqueId(id, existingIds);
    }
    const theme = detectTheme(`${rawName} ${raw.description || raw.descripcion || ''}`) || null;
    const color = normalizeColor(raw.color || raw.colour || (theme && theme.color) || base.color);
    const description = cleanMultiline(raw.description || raw.descripcion || raw.descripción || base.description || '', 100);
    const item = {
      ...base, type, kind, name, id, color,
      category: CATEGORIES.has(raw.category) ? raw.category : categoryFor(type, kind, theme),
      description
    };
    item.stackable = toBool(raw.stackable ?? raw.apilable, base.stackable);
    item.glow = toBool(raw.glow ?? raw.brillo, base.glow);
    item.edible = toBool(raw.edible ?? raw.comestible, base.edible);
    item.rarity = RARITIES.has(raw.rarity || raw.rareza) ? (raw.rarity || raw.rareza) : base.rarity;
    item.damage = numberValue(raw.damage ?? raw.daño ?? raw.dano ?? raw.attack ?? raw.ataque, base.damage, 0, 100, true);
    item.durability = numberValue(raw.durability ?? raw.durabilidad, base.durability, 0, 10000, true);
    item.cooldown = numberValue(raw.cooldown ?? raw.enfriamiento, base.cooldown, 0, 5, false);
    item.nutrition = numberValue(raw.nutrition ?? raw.nutricion ?? raw.nutrición, base.nutrition, 0, 20, true);
    item.saturation = numberValue(raw.saturation ?? raw.saturacion ?? raw.saturación, base.saturation, 0.1, 2, false);
    item.hardness = numberValue(raw.hardness ?? raw.dureza, base.hardness, 0, 100, false);
    item.light = numberValue(raw.light ?? raw.luz, base.light, 0, 15, true);
    item.explosion = numberValue(raw.explosion ?? raw.resistencia, base.explosion, 0, 100, false);
    item.sound = SOUNDS.has(raw.sound || raw.sonido) ? (raw.sound || raw.sonido) : base.sound;
    item.health = numberValue(raw.health ?? raw.vida, base.health, 1, 500, true);
    item.speed = numberValue(raw.speed ?? raw.velocidad, base.speed, 0.05, 1.5, false);
    item.scale = numberValue(raw.scale ?? raw.escala, base.scale, 0.4, 2, false);
    item.spawn = toBool(raw.spawn ?? raw.generar, base.spawn);
    item.recipe = toBool(raw.recipe ?? raw.receta, base.recipe);
    item.ingredient = INGREDIENTS.has(raw.ingredient || raw.ingrediente) ? (raw.ingredient || raw.ingrediente) : base.ingredient;
    const rawDrop = raw.drop ?? raw.botín ?? raw.botin;
    item.drop = typeof rawDrop === 'string' && (DROPS.has(rawDrop) || /^bc:[a-z0-9_]{1,24}$/.test(rawDrop)) ? rawDrop : base.drop;
    item.category = CATEGORIES.has(item.category) ? item.category : categoryFor(type, kind, theme);

    if (type === 'item') {
      if (kind === 'food') {
        item.edible = true;
        item.stackable = true;
        item.damage = 0;
        item.durability = 0;
      } else if (['sword', 'axe', 'pickaxe', 'spear'].includes(kind)) {
        item.edible = false;
        item.stackable = false;
        item.durability = Math.max(1, item.durability);
        item.damage = Math.max(1, item.damage);
      } else {
        item.edible = false;
        item.durability = 0;
      }
    } else if (type === 'block') {
      item.stackable = true;
      item.edible = false;
      item.damage = 0;
      item.durability = 0;
      item.category = item.category === 'nature' ? 'nature' : 'construction';
      item.recipe = true;
    } else {
      item.stackable = false;
      item.edible = false;
      item.glow = false;
      item.damage = Math.max(0, item.damage);
      item.hardness = 0;
      item.light = 0;
      item.explosion = 0;
      item.recipe = false;
      item.category = 'items';
      item.health = Math.max(1, item.health);
    }
    return item;
  }

  window.BloquecraftAI = {
    engineVersion: ENGINE_VERSION,
    systemPrompt: SYSTEM_PROMPT,
    examples: EXAMPLES,
    generate,
    sanitizeExternal,
    normalizeItem,
    defaultFor,
    slugify,
    normalizeColor,
    detectTheme
  };
})();
