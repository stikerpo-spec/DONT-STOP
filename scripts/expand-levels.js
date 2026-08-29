const fs = require('fs');

function replaceOrFail(file, from, to, label) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(from)) {
    throw new Error(`${file}: Vorlage für ${label} nicht gefunden.`);
  }
  fs.writeFileSync(file, text.replace(from, to));
}

// 20 progression levels. Prices become intentionally expensive so Coins remain
// valuable for a long grind instead of unlocking the whole game immediately.
const levelsBlock = `  const LEVELS = {
    1: { name: 'NORMAL', speed: 11.0, spawn: 1.30, ramp: 0.10, doubleAfter: 999, doubleChance: 0.00 },
    2: { name: 'SCHNELL', speed: 12.3, spawn: 1.18, ramp: 0.11, doubleAfter: 12, doubleChance: 0.10 },
    3: { name: 'HART', speed: 13.5, spawn: 1.08, ramp: 0.12, doubleAfter: 11, doubleChance: 0.16 },
    4: { name: 'EXTREM', speed: 14.7, spawn: 0.99, ramp: 0.14, doubleAfter: 10, doubleChance: 0.22 },
    5: { name: 'CHAOS', speed: 16.0, spawn: 0.91, ramp: 0.16, doubleAfter: 9, doubleChance: 0.28 },
    6: { name: 'TURBO', speed: 17.2, spawn: 0.85, ramp: 0.18, doubleAfter: 8, doubleChance: 0.33 },
    7: { name: 'NERVEN', speed: 18.4, spawn: 0.80, ramp: 0.19, doubleAfter: 8, doubleChance: 0.38 },
    8: { name: 'RISKANT', speed: 19.5, spawn: 0.75, ramp: 0.20, doubleAfter: 7, doubleChance: 0.42 },
    9: { name: 'BRUTAL', speed: 20.5, spawn: 0.71, ramp: 0.21, doubleAfter: 7, doubleChance: 0.46 },
    10: { name: 'MASTER', speed: 21.5, spawn: 0.67, ramp: 0.22, doubleAfter: 6, doubleChance: 0.50 },
    11: { name: 'APEX', speed: 22.4, spawn: 0.63, ramp: 0.23, doubleAfter: 6, doubleChance: 0.54 },
    12: { name: 'INSANE', speed: 23.3, spawn: 0.59, ramp: 0.24, doubleAfter: 6, doubleChance: 0.58 },
    13: { name: 'NIGHTMARE', speed: 24.2, spawn: 0.56, ramp: 0.25, doubleAfter: 5, doubleChance: 0.61 },
    14: { name: 'OVERLOAD', speed: 25.0, spawn: 0.53, ramp: 0.26, doubleAfter: 5, doubleChance: 0.64 },
    15: { name: 'MERCILESS', speed: 25.8, spawn: 0.51, ramp: 0.27, doubleAfter: 5, doubleChance: 0.67 },
    16: { name: 'GODLIKE', speed: 26.6, spawn: 0.49, ramp: 0.28, doubleAfter: 4, doubleChance: 0.70 },
    17: { name: 'APOCALYPSE', speed: 27.4, spawn: 0.47, ramp: 0.29, doubleAfter: 4, doubleChance: 0.73 },
    18: { name: 'IMPOSSIBLE', speed: 28.2, spawn: 0.45, ramp: 0.30, doubleAfter: 4, doubleChance: 0.76 },
    19: { name: 'LEGEND', speed: 29.0, spawn: 0.43, ramp: 0.31, doubleAfter: 4, doubleChance: 0.79 },
    20: { name: 'ULTIMATE', speed: 30.0, spawn: 0.41, ramp: 0.32, doubleAfter: 3, doubleChance: 0.82 }
  };`;

replaceOrFail(
  'game.js',
  `  const LEVELS = {\n    1: { name: 'NORMAL', speed: 11.0, spawn: 1.30, ramp: 0.10, doubleAfter: 999, doubleChance: 0 },\n    2: { name: 'SCHNELL', speed: 13.0, spawn: 1.12, ramp: 0.13, doubleAfter: 10, doubleChance: 0.10 },\n    3: { name: 'HART', speed: 15.2, spawn: 0.98, ramp: 0.16, doubleAfter: 8, doubleChance: 0.18 },\n    4: { name: 'EXTREM', speed: 17.5, spawn: 0.87, ramp: 0.19, doubleAfter: 7, doubleChance: 0.24 },\n    5: { name: 'CHAOS', speed: 20.0, spawn: 0.76, ramp: 0.23, doubleAfter: 6, doubleChance: 0.30 }\n  };`,
  levelsBlock,
  '20-Level-Konfiguration'
);

replaceOrFail(
  'game.js',
  `selectedLevel=clamp(Number(state.selectedLevel||1),1,5)`,
  `selectedLevel=clamp(Number(state.selectedLevel||1),1,20)`,
  'erste selectedLevel-Begrenzung'
);

const currentGame = fs.readFileSync('game.js', 'utf8');
const remainingFive = (currentGame.match(/,1,5\)/g) || []).length;
if (remainingFive > 0) {
  fs.writeFileSync('game.js', currentGame.replace(/,1,5\)/g, ',1,20)'));
}

// Replace the simple spawn routine with more varied late-game patterns.
const refreshedGame = fs.readFileSync('game.js', 'utf8');
const oldSpawn = `  function spawnPattern(){const cfg=levelConfig(),safeLane=Math.floor(Math.random()*3),canDouble=elapsed>=cfg.doubleAfter&&Math.random()<cfg.doubleChance;if(canDouble){for(let i=0;i<3;i++)if(i!==safeLane)addObject('obstacle',i,-75,{height:1.65});}else addObject('obstacle',(safeLane+1)%3,-75,{height:1.55});if(Math.random()<0.65)addObject('coin',safeLane,-67,{y:1.55});}`;
const newSpawn = `  function spawnPattern(){const cfg=levelConfig();const safeLane=Math.floor(Math.random()*3);const hardTier=selectedLevel>=8;const brutalTier=selectedLevel>=14;const canDouble=elapsed>=cfg.doubleAfter&&Math.random()<cfg.doubleChance;const roll=Math.random();if(brutalTier&&roll<0.28){const firstSafe=safeLane;const secondSafe=(safeLane+(Math.random()<0.5?1:2))%3;for(let i=0;i<3;i++)if(i!==firstSafe)addObject('obstacle',i,-75,{height:1.62});for(let i=0;i<3;i++)if(i!==secondSafe)addObject('obstacle',i,-89,{height:1.68});}else if(hardTier&&roll<0.24){for(let i=0;i<3;i++)if(i!==safeLane)addObject('obstacle',i,-75,{height:1.68});const nextSafe=(safeLane+(Math.random()<0.5?1:2))%3;for(let i=0;i<3;i++)if(i!==nextSafe)addObject('obstacle',i,-90,{height:1.62});}else if(canDouble){for(let i=0;i<3;i++)if(i!==safeLane)addObject('obstacle',i,-75,{height:1.65});}else addObject('obstacle',(safeLane+1)%3,-75,{height:1.55});if(Math.random()<(brutalTier?0.78:0.65))addObject('coin',safeLane,-67,{y:1.55});}`;
if (!refreshedGame.includes(oldSpawn)) throw new Error('game.js: spawnPattern-Vorlage nicht gefunden.');
fs.writeFileSync('game.js', refreshedGame.replace(oldSpawn, newSpawn));

// Expand the in-app level shop to 20 unlockable tiers.
const index = fs.readFileSync('index.html', 'utf8');
const start = index.indexOf('      const levelData={');
const end = index.indexOf('\n      let state=window.DontStopSave.read();', start);
if (start === -1 || end === -1) throw new Error('index.html: levelData-Bereich nicht gefunden.');
const shopBlock = `      const levelData={\n        1:{name:'NORMAL',cost:0,desc:'Ruhiges Tempo. Perfekt zum Start.'},\n        2:{name:'SCHNELL',cost:15,desc:'Schneller. Erste Doppel-Hindernisse.'},\n        3:{name:'HART',cost:40,desc:'Deutlich weniger Reaktionszeit.'},\n        4:{name:'EXTREM',cost:90,desc:'Hohes Tempo und dichteres Timing.'},\n        5:{name:'CHAOS',cost:180,desc:'Fiese Kombinationen und hohe Geschwindigkeit.'},\n        6:{name:'TURBO',cost:350,desc:'Das Tempo zieht richtig an.'},\n        7:{name:'NERVEN',cost:650,desc:'Doppel-Hindernisse kommen deutlich häufiger.'},\n        8:{name:'RISKANT',cost:1100,desc:'Neue Ketten aus mehreren Hindernissen.'},\n        9:{name:'BRUTAL',cost:1800,desc:'Extrem wenig Zeit für Fehler.'},\n        10:{name:'MASTER',cost:3000,desc:'Nur mit sauberem Timing.'},\n        11:{name:'APEX',cost:5000,desc:'Sehr hohes Tempo und harte Muster.'},\n        12:{name:'INSANE',cost:8000,desc:'Fast jeder Abschnitt fordert volle Konzentration.'},\n        13:{name:'NIGHTMARE',cost:12500,desc:'Dichte Hindernisse und kaum Leerlauf.'},\n        14:{name:'OVERLOAD',cost:20000,desc:'Ketten wechseln schnell die sichere Spur.'},\n        15:{name:'MERCILESS',cost:32000,desc:'Nur konstante Spieler kommen weit.'},\n        16:{name:'GODLIKE',cost:50000,desc:'Extremes Tempo mit brutalen Sequenzen.'},\n        17:{name:'APOCALYPSE',cost:80000,desc:'Fast kein Raum für einen schlechten Move.'},\n        18:{name:'IMPOSSIBLE',cost:125000,desc:'Für absolute Grind-Profis.'},\n        19:{name:'LEGEND',cost:200000,desc:'Eine der härtesten Herausforderungen.'},\n        20:{name:'ULTIMATE',cost:325000,desc:'Das Endgame. Jeder Run zählt.'}\n      };`;
fs.writeFileSync('index.html', index.slice(0, start) + shopBlock + index.slice(end));

console.log('DON’T STOP: 20 Grind-Level aktiviert.');
