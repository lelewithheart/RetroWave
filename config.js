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
        minSpawnCd: 0.3,
        spawnCdDecay: 0.92,
        hpScale: 1.22,
        speedScale: 1.07,
        damageScale: 1.10,
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
    },
    skinShop: {
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
};
