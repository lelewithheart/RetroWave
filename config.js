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
        minSpawnCd: 0.30,
        // Raised from 0.92: the old value ramped the spawn rate to ~3.3/s while
        // the player could only kill ~1.7/s by wave 20, so the arena inevitably
        // overran you around wave 18-20. Slower ramp keeps kill-rate ahead of
        // spawn-rate (ratio stays >= ~1.2 through the whole run).
        spawnCdDecay: 0.94,
        // HP curve tuned together with the XP economy and spawn rate, see below.
        hpScale: 1.18,
        speedScale: 1.07,
        damageScale: 1.07,
        restTime: 2.5,
        maxWave: 25,
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
            eliteHpMult: 2.2,
            eliteSpeedMult: 1.15,
            shardReward: 8,
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
};
