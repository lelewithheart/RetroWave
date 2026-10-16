window.RogueConfig = {
    perf: {
        // Keep text/UI readable in small windows before we allow scaling down.
        minReadableScale: 0.95,
        // Adaptive performance mode hysteresis thresholds.
        lowThreshold: 48,
        recoverThreshold: 54,
        sampleWindow: 1.2,
    },
    wave: {
        baseKills: 10,
        killsGrowth: 5,
        baseSpawnCd: 1.5,
        // Lowered from 0.30: the old cap kicked in at wave 19, which flattened
        // the whole late-game spawn curve (every decay change past wave 19 did
        // nothing). 0.25 raises the ceiling to ~4/s so the late waves keep
        // building pressure.
        minSpawnCd: 0.25,
        // The 0.94 that originally fixed the "overrun at wave 18" problem
        // overshot: kill-rate ended up 3-4x spawn-rate and the run had no
        // pressure at all. 0.91 keeps the player ahead of the arena without
        // making it a walkover (ratio ~0.6-1.3 through the late waves).
        spawnCdDecay: 0.91,
        // HP curve tuned together with the XP economy and spawn rate, see below.
        hpScale: 1.18,
        speedScale: 1.07,
        // Raised from 1.07: contact damage was the main thing keeping the late
        // waves threatening, and 1.07 made wave 25 hits cost only ~51 HP.
        damageScale: 1.12,
        restTime: 2.5,
        maxWave: 25,
        // ── Endless mode ──
        // Beating the wave-25 end boss still awards victory and prestige. The
        // player can then opt into Endless, where waves keep coming with a much
        // steeper curve so a fully upgraded account still gets pushed.
        endless: {
            enabled: true,
            // Extra HP scaling per endless wave, ON TOP of the normal hpScale.
            hpScalePerWave: 1.10,
            // Contact damage grows faster too.
            damageScalePerWave: 1.06,
            // Spawn rate keeps tightening (but is floored by minSpawnCd).
            spawnCdDecay: 0.965,
            // Kill target per endless wave grows on top of the usual growth.
            extraKillsPerWave: 6,
            // Shard payout per endless wave cleared, so the risk pays something.
            shardsPerWave: 25,
        },
    },
    bosses: {
        minibossName: "Shard Warden",
        bigbossName: "Iron Tyrant",
        bigbossNamesByWave: {
            10: "Iron Tyrant",
            20: "Abyss Colossus",
        },
        endbossName: "The Null Sovereign",
        // Absolute boss HP per boss wave, decoupled from the trash curve and
        // calibrated against the player's expected DPS at that point (roughly
        // 220 / 760 / 1890 / 3225 / 5700 dps with the new XP economy). Target
        // fight lengths: ~12s, 16s, 18s, 25s, and ~55s for the final boss.
        hpByWave: {
            5:  2500,
            10: 12000,
            15: 34000,
            20: 81000,
            25: 314000,
        },
    },
    skinShop: { // Only Fallback 
        skins: [
            { id: "default", name: "Classic Cyan", player: "#33ccff", glow: "rgba(51,204,255,0.25)", cost: 0, asset: "assets/playerskins/default.png" },
            { id: "surge", name: "Lime Surge", player: "#66ff99", glow: "rgba(102,255,153,0.25)", cost: 140, asset: "assets/playerskins/surge.png" },
            { id: "ember", name: "Ember Pulse", player: "#ff6688", glow: "rgba(255,102,136,0.25)", cost: 140, asset: "assets/playerskins/ember.png" },
            { id: "nova", name: "Nova Gold", player: "#ffd166", glow: "rgba(255,209,102,0.28)", cost: 180, asset: "assets/playerskins/nova.png" },
            { id: "rainbow", name: "Rainbow", player: "#ff00ff", glow: "rgba(255,0,255,0.4)", cost: 200, asset: "assets/playerskins/rainbow.png" },
            { id: "spiderman", name: "Spiderman Skin", player: "#d32f2f", glow: "rgba(30,90,200,0.35)", cost: 240, asset: "assets/playerskins/SpidermanSkin.png" },
        ],
        featuredIds: ["rainbow", "nova", "spiderman"],
    },
    upgrades: {
        rarityBaseWeights: {
            common: 100,
            rare: 16,
            epic: 5,
        },
        rarityColors: {
            common: "#cfd9e6",
            rare: "#66ddff",
            epic: "#c38bff",
        },
        epicUnlockWave: 6,
        waveBoosts: [
            { wave: 8, rare: 1.35, epic: 1.5 },
            { wave: 15, rare: 1.7, epic: 2.2 },
            { wave: 20, rare: 2.1, epic: 3.0 },
        ],
        bonusWaveBoost: {
            rare: 1.25,
            epic: 1.4,
        },
        bigbossBoost: {
            rare: 1.2,
            epic: 1.35,
        },
        tuning: {
            damage1: 5,
            damage2: 10,
            moveSpeedMult1: 1.15,
            moveSpeedMult2: 1.25,
            fireRateMult1: 0.8,
            fireRateMult2: 0.65,
            maxHp1: 25,
            maxHp2: 50,
            healPercent: 0.3,
            xpMagnetRange: 40,
            armor1: 3,
            armor2: 6,
            hpRegen1: 2,
            hpRegen2: 5,
            piercing: 1,
            multiShot: 1,
            critChanceAdd: 0.1,
            critDamageAdd: 0.5,
            bulletSizeMult: 1.3,
            rangeMult1: 1.2,
            rangeMult2: 1.4,
            xpGainMult1: 1.25,
            xpGainMult2: 1.5,
            executeAdd1: 0.08,
            executeAdd2: 0.12,
            executeCap: 0.5,
            weaponLevelAdd: 1,
        },
    },
    replay: {
        challengeModes: [
            {
                id: "none",
                label: "No Challenge",
                desc: "Standard run",
                enemySpeedMult: 1,
                shardRewardMult: 1,
                playerHpMult: 1,
                playerDamageMult: 1,
            },
            {
                id: "rush",
                label: "Rush",
                desc: "Faster enemies, more shards",
                enemySpeedMult: 1.22,
                shardRewardMult: 1.45,
                playerHpMult: 1,
                playerDamageMult: 1,
            },
            {
                id: "glass",
                label: "Glass Cannon",
                desc: "Low HP, high damage",
                enemySpeedMult: 1,
                shardRewardMult: 1.55,
                playerHpMult: 0.62,
                playerDamageMult: 1.45,
            },
            {
                id: "permadeath",
                label: "Permadeath",
                desc: "No revives, bigger shard payout",
                enemySpeedMult: 1.08,
                shardRewardMult: 1.85,
                playerHpMult: 1,
                playerDamageMult: 1,
                allowRevive: false,
            },
        ],
    },
    prestige: {
        enabled: true,
        gainPerClear: 1,
        resetShards: true,
        resetMeta: true,
        skinThresholds: [
            { prestigeLevel: 1, skinId: "prestige_bronze" },
            { prestigeLevel: 2, skinId: "prestige_silver" },
            { prestigeLevel: 3, skinId: "prestige_gold" },
            { prestigeLevel: 5, skinId: "prestige_diamond" },
            { prestigeLevel: 7, skinId: "prestige_platinum" },
            { prestigeLevel: 10, skinId: "prestige_emerald" },
        ],
    },
    events: {
        enabled: true,
        // A run event is offered every `interval` waves, starting at `startWave`.
        startWave: 3,
        interval: 3,
        // Never place an event on the waves leading into the final boss.
        excludeFromWave: 23,
        // Weighted pick. Higher weight = more common.
        pool: {
            eliteWave:  22,
            storm:      18,
            fountain:   16,
            ambush:     16,
            shardCache: 14,
            hunt:       14,
        },
        // Balancing knobs, read by the event definitions.
        eliteWave: {
            extraKillShare: 0.25,   // +25% kills required
            xpMult: 1.6,
            hpMult: 1.35,
        },
        storm: {
            enemySpeedMult: 1.3,
            enemyHpMult: 0.75,
            enemyDmgMult: 0.9,
            playerDamageMult: 1.15, // player hits harder too - fast, glass-cannon wave
        },
        fountain: {
            hpRegenPerSec: 4,
            xpMult: 0.4,            // far less XP while healing
        },
        ambush: {
            packSize: 6,            // enemies released per burst
            burstInterval: 1.4,     // seconds between bursts
            killsMult: 0.8,         // slightly fewer kills needed
        },
        shardCache: {
            shardReward: 12,
            carrierChance: 0.22,    // chance any given spawned enemy carries the cache
        },
        hunt: {
            // Bounty targets were barely tougher than the elites around them, so
            // the "hunt" read as a free shard pickup. Pushed up and made them
            // noticeably faster so they must actually be chased down.
            eliteHpMult: 3.4,
            eliteSpeedMult: 1.3,
            shardReward: 12,
        },
    },
    bossModifiers: {
        enabled: true,
        // Max modifiers by boss kind. The first boss a player meets stays simple.
        maxForMiniboss: 2,
        maxForBigboss: 2,
        maxForEndboss: 1,
        // Bosses never roll the same modifier twice.
        pool: {
            shieldWall:  18,
            berserker:   16,
            summoner:    16,
            siphon:      14,
            brutal:      14,
            brittle:     14,
        },
        shieldWall: { frontReduction: 0.72, arc: Math.PI * 0.6 },
        berserker:  { hpThreshold: 0.4, speedMult: 1.5, dmgMult: 1.3 },
        summoner:   { interval: 8, addCount: 2 },
        siphon:     { radius: 220, healPerSec: 6 },
        brutal:     { hpMult: 1.6, dmgMult: 1.4, speedMult: 0.9 },
        brittle:    { hpMult: 0.65, shardMult: 2.2, xpMult: 2.0 },
    },
    elites: {
        enabled: true,
        startWave: 3,
        baseChance: 0.06,
        // Elite odds climb with the wave, capped so late waves are not all elites.
        chancePerWave: 0.012,
        maxChance: 0.22,
        // Softened from 2.6x: with the flattened wave curve an elite should be a
        // speed bump, not a wall. The XP gain was raised instead, so fighting an
        // elite is still clearly worth it (it accelerates your upgrade pace,
        // which is what actually carries you through the late waves).
        hpMult: 2.2,
        speedMult: 1.08,
        dmgMult: 1.35,
        xpMult: 3.6,
        shardDropChance: 0.35,
        shardDropAmount: 3,
    },
    balance: {
        // Flat heal granted when an event payout is claimed, so the late waves
        // are not a pure war of attrition.
        eventHealAmount: 12,
        // XP economy. The real reason runs stalled around wave 20 was that the
        // player only got ~19 upgrade picks in a whole run: XP per kill grew
        // linearly (10 + wave*2) while enemy HP grew exponentially, so the
        // level curve fell behind and DPS could not keep up with the spawn rate.
        // xpPerWaveGrowth scales the XP payout per wave so upgrade income tracks
        // enemy scaling; xpNeedGrowth (see modeModifiers) was also lowered.
        xpPerWaveGrowth: 1.11,
    },
    // ─────────────────────────────────────────────────────────────────────────
    // LOOT / INVENTORY SYSTEM
    // ─────────────────────────────────────────────────────────────────────────
    // Items are permanent collection pieces. Whatever you have EQUIPPED is lost
    // when you die (unless the item carries the "afterlife" enchantment), so
    // equipping is a real risk decision. Everything unequipped stays safe.
    loot: {
        enabled: true,

        // Item rarity. Higher rarity = stronger affix rolls + more enchant slots.
        rarities: {
            common:    { label: "Common",    color: "#cfd9e6", affixCount: 1, enchantSlots: 0, weight: 100 },
            rare:      { label: "Rare",      color: "#66ddff", affixCount: 2, enchantSlots: 1, weight: 42 },
            epic:      { label: "Epic",      color: "#c38bff", affixCount: 3, enchantSlots: 1, weight: 14 },
            legendary: { label: "Legendary", color: "#ffd166", affixCount: 4, enchantSlots: 2, weight: 4 },
        },

        // Equipment slots. One item per slot.
        slots: ["weapon", "chest", "helm", "gloves", "boots", "augment"],
        slotLabels: {
            weapon:  "Weapon",
            chest:   "Chest",
            helm:    "Helm",
            gloves:  "Gloves",
            boots:   "Boots",
            augment: "Augment",
        },

        // Which categories a slot can roll from. Categories exist for the shop
        // filter and for set design; the slot decides what actually fits where.
        categories: ["weapon", "armor", "augment", "implant"],

        // Affix pool. `stat` maps onto the player stat keys used in game.js
        // (see applyLootToPlayer). Ranges are rolled per rarity tier.
        affixes: {
            damage:     { label: "Damage",        stat: "damage",     perRarity: [3, 7, 12, 20] },
            maxHp:      { label: "Max HP",        stat: "maxHp",      perRarity: [8, 18, 32, 55] },
            moveSpeed:  { label: "Move Speed",    stat: "speedMult",  perRarity: [0.03, 0.06, 0.10, 0.16] },
            fireRate:   { label: "Fire Rate",     stat: "fireRateMult", perRarity: [0.04, 0.08, 0.13, 0.20] },
            critChance: { label: "Crit Chance",   stat: "critChance", perRarity: [0.03, 0.06, 0.10, 0.15] },
            critDamage: { label: "Crit Damage",   stat: "critMult",   perRarity: [0.15, 0.30, 0.50, 0.80] },
            armor:      { label: "Armor",         stat: "armor",      perRarity: [2, 4, 7, 11] },
            hpRegen:    { label: "HP / sec",      stat: "hpRegen",    perRarity: [1, 2, 4, 7] },
            xpGain:     { label: "XP Gain",       stat: "xpGainMult", perRarity: [0.05, 0.10, 0.18, 0.30] },
            magnet:     { label: "Pickup Range",  stat: "magnet",     perRarity: [15, 30, 55, 90] },
            piercing:   { label: "Piercing",      stat: "piercing",   perRarity: [1, 1, 2, 3] },
            multiShot:  { label: "Multi-Shot",    stat: "multiShot",  perRarity: [1, 1, 1, 2] },
        },

        // Enchantments. `onDrop` items can roll one; the rest are applied later
        // at the enchanter for a shard cost (see enchantCost).
        enchantments: {
            afterlife:  { label: "Afterlife",   color: "#b9f1ff", desc: "Kept even if you die with it equipped", dropOnly: false, weight: 22 },
            vampiric:   { label: "Vampiric",    color: "#ff6688", desc: "+HP on kill",            dropOnly: false, weight: 20, perKillHeal: 1 },
            swift:      { label: "Swift",       color: "#66ff99", desc: "+8% move speed",          dropOnly: false, weight: 20, speedBonus: 0.08 },
            fortune:    { label: "Fortune",     color: "#ffd166", desc: "+20% shard payout",       dropOnly: false, weight: 18, shardMult: 1.2 },
            overload:   { label: "Overload",    color: "#c38bff", desc: "+12% damage",             dropOnly: false, weight: 18, damageMult: 1.12 },
            guardian:   { label: "Guardian",    color: "#66ddff", desc: "+4 armor",                dropOnly: false, weight: 16, armorBonus: 4 },
        },
        // Cost to apply a chosen enchantment at the enchanter.
        enchantCost: 120,
        // Chance that any given item drop already carries a random enchantment.
        dropEnchantChance: 0.35,

        // Sets. Each item rolls a set id (or none). Wearing N pieces of a set
        // unlocks escalating bonuses.
        sets: {
            ashen: {
                label: "Ashen Vanguard",
                color: "#ff8899",
                pieces: 6,
                bonuses: [
                    { need: 2, desc: "+10% damage",              stat: "damageMult", value: 1.10 },
                    { need: 4, desc: "+15% max HP, +3 armor",    stat: "maxHpMult",  value: 1.15, extra: { armor: 3 } },
                    { need: 6, desc: "+25% damage, +2 HP/sec",   stat: "damageMult", value: 1.25, extra: { hpRegen: 2 } },
                ],
            },
            voltaic: {
                label: "Voltaic Circuit",
                color: "#88ddff",
                pieces: 6,
                bonuses: [
                    { need: 2, desc: "+10% fire rate",           stat: "fireRateMult", value: 0.90 },
                    { need: 4, desc: "+15% fire rate",           stat: "fireRateMult", value: 0.85 },
                    { need: 6, desc: "+10% crit chance",         stat: "critChance",   value: 0.10 },
                ],
            },
            sovereign: {
                label: "Sovereign Core",
                color: "#c38bff",
                pieces: 6,
                bonuses: [
                    { need: 2, desc: "+15% XP gain",             stat: "xpGainMult",  value: 1.15 },
                    { need: 4, desc: "+25% pickup range",        stat: "magnetMult",  value: 1.25 },
                    { need: 6, desc: "+1 multi-shot",            stat: "multiShot",   value: 1 },
                ],
            },
        },
        // Chance that a rolled item belongs to a set at all.
        setChance: 0.45,

        // Chests. Costs are in shards. `rarityWeights` overrides the global
        // rarity weights so better chests skew toward higher rarities.
        chests: [
            {
                id: "standard", label: "Standard Cache", cost: 100, itemCount: 1, color: "#cfd9e6",
                desc: "1 item. A fair roll at any rarity.",
                rarityWeights: { common: 100, rare: 42, epic: 14, legendary: 4 },
            },
            {
                id: "premium", label: "Premium Cache", cost: 300, itemCount: 2, color: "#66ddff",
                desc: "2 items, better odds of rare and above.",
                rarityWeights: { common: 55, rare: 60, epic: 30, legendary: 9 },
            },
            {
                id: "elite", label: "Elite Cache", cost: 800, itemCount: 3, color: "#c38bff",
                desc: "3 items, strongly weighted toward epic and legendary.",
                rarityWeights: { common: 15, rare: 45, epic: 55, legendary: 22 },
            },
        ],
        // Chance an item drop also rolls a set piece (supporter chest forces it).
        startingShards: 250,
    },
};
