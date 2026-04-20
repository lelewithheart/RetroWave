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
};
