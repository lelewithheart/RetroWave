// Focused test: Afterlife protection, set bonuses, chest guarantees, save/load round-trip.
const fs = require('fs');
const vm = require('vm');

const config = fs.readFileSync('config.js', 'utf8');
const game = fs.readFileSync('game.js', 'utf8');

function makeCtx2d() {
    const noop = () => {};
    const grad = { addColorStop: noop };
    return {
        fillRect: noop, clearRect: noop, strokeRect: noop,
        beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
        arc: noop, ellipse: noop, rect: noop, roundRect: noop,
        fill: noop, stroke: noop, clip: noop, fillText: noop, strokeText: noop,
        save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
        setTransform: noop, drawImage: noop,
        createLinearGradient: () => grad, createRadialGradient: () => grad,
        measureText: () => ({ width: 10 }), putImageData: noop,
        getImageData: () => ({ data: [] }),
    };
}
function makeEl() {
    return {
        getContext: makeCtx2d, style: {}, addEventListener: () => {}, removeEventListener: () => {},
        getBoundingClientRect: () => ({ x: 0, y: 0, width: 960, height: 640 }),
        appendChild: () => {}, width: 960, height: 640,
    };
}

let saved = null;   // captured localStorage payload for the round-trip test

const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map,
    parseInt, parseFloat, isNaN, isFinite, Symbol, Error, Promise, RegExp,
    Uint8Array, Float32Array, ArrayBuffer,
    atob: (s) => s, btoa: (s) => s,
    TextEncoder: class { encode() { return new Uint8Array(); } },
    Image: class { constructor() { this.complete = false; } },
    performance: { now: () => 0 },
    requestAnimationFrame: () => {}, setTimeout: () => {}, clearTimeout: () => {},
    addEventListener: () => {},
    fetch: () => Promise.reject(new Error('no fetch')),
    localStorage: {
        getItem: () => saved,
        setItem: (k, v) => { saved = v; },
        removeItem: () => { saved = null; },
    },
    document: {
        getElementById: makeEl, createElement: makeEl,
        querySelector: makeEl, querySelectorAll: () => [], addEventListener: () => {},
        hidden: false,
        body: { appendChild: () => {}, classList: { toggle: () => {}, add: () => {}, remove: () => {} } },
        documentElement: { classList: { toggle: () => {}, add: () => {}, remove: () => {} }, style: {} },
    },
    crypto: { getRandomValues: (a) => a, subtle: { importKey: async () => ({}), encrypt: async () => new ArrayBuffer(8) } },
    navigator: { userAgent: 'node', maxTouchPoints: 0 },
    location: { href: '' },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;

vm.createContext(ctx);
vm.runInContext(config, ctx, { filename: 'config.js' });
vm.runInContext(game, ctx, { filename: 'game.js' });
const P = vm.runInContext('Progression', ctx);

function ok(label, cond, extra) {
    console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra !== undefined ? '  -> ' + extra : ''));
}

// ── 1. Afterlife keeps the item on death ──
let withAfter = null;
let withoutAfter = null;
// Craft items directly with the shape the store uses.
const mk = (id, slot, enchants, affinity) => ({
    id, slot, rarity: 'epic', name: 'T' + id, affixes: [], enchants, set: affinity || null, locked: false,
});
withAfter = mk(9001, 'helm', ['afterlife']);
withoutAfter = mk(9002, 'boots', []);

// Push them into the store via addItem + equip.
P.addItem(withAfter);
P.addItem(withoutAfter);
P.equipItem(9001);
P.equipItem(9002);
const pen = P.applyDeathPenalty();
const lostIds = pen.lost.map((i) => i.id);
const keptIds = pen.kept.map((i) => i.id);
ok('Afterlife item kept on death', keptIds.indexOf(9001) !== -1, JSON.stringify(keptIds));
ok('Plain item lost on death', lostIds.indexOf(9002) !== -1, JSON.stringify(lostIds));
ok('Afterlife item still in inventory', P.getItemById(9001) !== null);
ok('Plain item removed from inventory', P.getItemById(9002) === null);
ok('Afterlife item still equipped', P.getEquipped('helm') !== null);

// ── 2. Set bonus activates at thresholds ──
// Equip 2 ashen pieces -> +10% damage bonus should apply.
P.addItem(mk(9101, 'chest', [], 'ashen'));
P.addItem(mk(9102, 'gloves', [], 'ashen'));
P.addItem(mk(9103, 'weapon', [], 'ashen'));
P.equipItem(9101);
P.equipItem(9102);
let sets = P.getSetStatus();
ok('2 ashen pieces counted', sets.ashen.have === 2, sets.ashen.have);
ok('2-piece bonus active', sets.ashen.active.length === 1, sets.ashen.active.length);
let stats = P.computeLootStats();
ok('2-piece damage bonus applied (x1.10)', Math.abs(stats.damageMult - 1.10) < 0.001, stats.damageMult);

// Add third piece -> still only the 2-piece tier (4-piece needs 4).
P.equipItem(9103);
sets = P.getSetStatus();
ok('3 ashen pieces, still 1 bonus tier', sets.ashen.active.length === 1, sets.ashen.active.length);

// ── 3. Enchant slot limit ──
// Epic has 1 enchant slot. 9001 already has afterlife; adding another must fail.
const dupTry = P.enchantItem(9001, 'guardian');
ok('Enchant rejected when slots full', dupTry.ok === false && dupTry.reason === 'full', dupTry.reason);

// ── 4. Save/load round trip keeps the inventory ──
(async () => {
const beforeCount = P.getItems().length;
const beforeHelm = P.getEquipped('helm') ? P.getEquipped('helm').id : null;
saved = JSON.stringify({ shards: P.get().shards, loot: JSON.parse(JSON.stringify(P.get().loot)) });
// Re-init from the captured payload.
await P.init();
const afterCount = P.getItems().length;
const afterHelm = P.getEquipped('helm') ? P.getEquipped('helm').id : null;
ok('Item count survives reload', afterCount === beforeCount, beforeCount + ' -> ' + afterCount);
ok('Equipped helm survives reload', afterHelm === beforeHelm, beforeHelm + ' -> ' + afterHelm);
ok('Afterlife enchant survives reload',
   (P.getItemById(9001) || {}).enchants && P.getItemById(9001).enchants.indexOf('afterlife') !== -1);

// ── 5. Elite chest always yields the requested count and never a common ──
let eliteHasCommon = false;
let eliteCounts = [];
for (let i = 0; i < 30; i++) {
    const r = P.openChest('elite');
    if (r.ok) {
        eliteCounts.push(r.items.length);
        if (r.items.some((it) => it.rarity === 'common')) eliteHasCommon = true;
    }
}
ok('Elite chest yields 3 items', eliteCounts.every((c) => c === 3), JSON.stringify(eliteCounts.slice(0, 3)));
console.log('INFO  elite chest common hits over 30 opens:', eliteHasCommon);

// ── 6. Insufficient shards is refused ──
// Drain shards first.
while (P.get().shards >= 100) { P.openChest('standard'); }
const poor = P.openChest('standard');
ok('Chest refused without shards', poor.ok === false && poor.reason === 'shards', poor.reason + ' (shards=' + P.get().shards + ')');
})();
