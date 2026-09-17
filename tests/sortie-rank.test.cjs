const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const code = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  const exports = {};
  vm.runInNewContext(transpiled, { exports, require });
  return exports;
}

test('computeSortieRank grades S, A, B, and C ranks correctly according to Jev criteria', () => {
  const { computeSortieRank } = load('src/sortie-rank.ts');

  // Rank S: Clean sheet, fast flight
  const ace = computeSortieRank({ score: 1400, won: true, seconds: 28, hullLost: 0, shots: 18 });
  assert.equal(ace.rank, 'S');
  assert.equal(ace.title, 'LEGENDARY MARS ACE');
  assert.equal(ace.color, '#ffe29a');

  // Rank A: Minor damage or moderate time
  const elite = computeSortieRank({ score: 1200, won: true, seconds: 40, hullLost: 25, shots: 30 });
  assert.equal(elite.rank, 'A');
  assert.equal(elite.title, 'COMBAT ELITE');
  assert.equal(elite.color, '#78ffe1');

  // Rank B: Standard completion
  const certified = computeSortieRank({ score: 1000, won: true, seconds: 55, hullLost: 60, shots: 45 });
  assert.equal(certified.rank, 'B');
  assert.equal(certified.title, 'SORTIE CERTIFIED');
  assert.equal(certified.color, '#00ff9d');

  // Rank C: Defeat / Hull depleted
  const lost = computeSortieRank({ score: 400, won: false, seconds: 20, hullLost: 100, shots: 15 });
  assert.equal(lost.rank, 'C');
  assert.equal(lost.title, 'SIGNAL LOST');
  assert.equal(lost.color, '#ff4f45');

  // Default null
  const trainee = computeSortieRank(null);
  assert.equal(trainee.rank, 'C');
  assert.equal(trainee.title, 'TRAINEE');
});

test('GameAudio setEngineThrottle handles idle, cruising, and boosted flight speeds safely', () => {
  const audioCode = fs.readFileSync('src/game-audio.ts', 'utf8');
  const transpiled = ts.transpileModule(audioCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;

  let freqSet = 0;
  let gainSet = 0;
  const mockContext = {
    currentTime: 1.5,
    state: 'running',
    createGain: () => ({
      gain: { value: 0, setTargetAtTime: (val) => { gainSet = val; } },
      connect: () => {}
    }),
    destination: {}
  };

  const mockOscillator = {
    frequency: { value: 42, setTargetAtTime: (val) => { freqSet = val; } },
    connect: () => {},
    start: () => {},
    stop: () => {},
    disconnect: () => {}
  };

  const mockAudio = {
    AudioContext: function() { return mockContext; }
  };

  const exports = {};
  vm.runInNewContext(transpiled, {
    exports,
    require,
    window: mockAudio,
    AudioContext: mockAudio.AudioContext
  });

  const { gameAudio } = exports;
  gameAudio.ambient = mockOscillator;
  gameAudio.ambientGain = { gain: { setTargetAtTime: (val) => { gainSet = val; } } };
  gameAudio.context = mockContext;

  // Test idle (speed = 0)
  gameAudio.setEngineThrottle(0, false);
  assert.equal(freqSet, 42);

  // Test cruise (speed = 15 m/s)
  gameAudio.setEngineThrottle(15, false);
  assert.ok(freqSet > 80 && freqSet < 120);

  // Test boost (speed = 25 m/s, isBoost = true)
  gameAudio.setEngineThrottle(25, true);
  assert.ok(freqSet >= 180);
});
