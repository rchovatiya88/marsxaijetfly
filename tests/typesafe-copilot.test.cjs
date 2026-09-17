const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(file, globals = {}) {
  const exportsObject = {};
  const code = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(transpiled, {
    exports: exportsObject,
    console,
    clearTimeout,
    setTimeout,
    fetch: globalThis.fetch,
    ...globals
  });
  return exportsObject;
}

const clientExports = loadModule('src/ai/typesafe-client.ts');
const copilotExports = loadModule('src/ai/jetbike-copilot.ts', {
  require: (name) => {
    if (name === './typesafe-client') return clientExports;
    return require(name);
  }
});

const { buildCopilotQuestions, computeFallbackTactics, evaluateFlightTactics, evaluateNoulBand } = copilotExports;

test('evaluateNoulBand correctly implements the Consistency Noul 0.30-0.70 review band', () => {
  assert.equal(evaluateNoulBand(0.85), 'yes');
  assert.equal(evaluateNoulBand(0.71), 'yes');
  assert.equal(evaluateNoulBand(0.70), 'uncertain'); // Inclusive band boundary
  assert.equal(evaluateNoulBand(0.50), 'uncertain');
  assert.equal(evaluateNoulBand(0.30), 'uncertain'); // Inclusive band boundary
  assert.equal(evaluateNoulBand(0.29), 'no');
  assert.equal(evaluateNoulBand(0.05), 'no');
});

test('copilot structures TypeSafe questions across Choice, Score, and Noul primitives', () => {
  const telemetry = {
    player: { hull: 80, shield: 30, boost: 50, altitude: 12, speed: 25, isBoosting: false },
    combat: { wardenDistance: 40, incomingProjectiles: 1, isWardenCharging: true, weaponHeat: 0.2 },
    route: { selectedRoute: 'low_gate', extractionActive: false }
  };

  const questions = buildCopilotQuestions(telemetry);
  assert.equal(questions.threat_level.type, 'score');
  assert.ok(Array.isArray(questions.threat_level.criteria));
  assert.ok(questions.threat_level.criteria.length >= 3);

  assert.equal(questions.tactical_action.type, 'choice');
  assert.ok(typeof questions.tactical_action.criteria === 'object');
  assert.ok(questions.tactical_action.criteria.dive_canyon_cover);

  assert.equal(questions.counter_attack_safe.type, 'noul');
  assert.ok(questions.counter_attack_safe.criteria.true);
  assert.ok(questions.counter_attack_safe.criteria.false);
});

test('copilot fallback tactics provide immediate evasive advice under active missile lock', () => {
  const telemetry = {
    player: { hull: 50, shield: 0, boost: 40, altitude: 15, speed: 20, isBoosting: false },
    combat: { wardenDistance: 35, incomingProjectiles: 1, isWardenCharging: true, weaponHeat: 0.1 },
    route: { selectedRoute: 'undecided', extractionActive: false }
  };

  const recommendation = computeFallbackTactics(telemetry);
  assert.equal(recommendation.tacticalAction, 'boost_break_lock');
  assert.equal(recommendation.counterAttackSafe, false);
  assert.equal(recommendation.counterAttackStatus, 'lethal');
  assert.ok(recommendation.threatLevel >= 1.5);
  assert.ok(recommendation.hudMessage.includes('Missile lock'));
});

test('copilot fallback tactics recommend low gate shield recharge when hull is critical', () => {
  const telemetry = {
    player: { hull: 25, shield: 0, boost: 10, altitude: 8, speed: 18, isBoosting: false },
    combat: { wardenDistance: 70, incomingProjectiles: 0, isWardenCharging: false, weaponHeat: 0 },
    route: { selectedRoute: 'undecided', extractionActive: false }
  };

  const recommendation = computeFallbackTactics(telemetry);
  assert.equal(recommendation.tacticalAction, 'seek_low_gate_shield');
  assert.ok(recommendation.hudMessage.includes('shield'));
});

test('copilot evaluation safely falls back offline without throwing exceptions', async () => {
  const telemetry = {
    player: { hull: 100, shield: 30, boost: 100, altitude: 20, speed: 30, isBoosting: false },
    combat: { wardenDistance: 90, incomingProjectiles: 0, isWardenCharging: false, weaponHeat: 0 },
    route: { selectedRoute: 'high_gate', extractionActive: false }
  };

  // Provide an invalid key or trigger fallback
  const recommendation = await evaluateFlightTactics(telemetry, 'invalid_test_key', 500);
  assert.ok(recommendation);
  assert.ok(recommendation.tacticalAction);
  assert.ok(recommendation.hudMessage.startsWith('Copilot:'));
});

test('Consistency Noul pacing director structures calibrated questions', () => {
  const { buildPacingQuestions } = copilotExports;
  const questions = buildPacingQuestions({
    playerHull: 90,
    playerShield: 30,
    playerBoost: 80,
    wardenDefeatSeconds: 8,
    pursuitActive: true,
    activeEnemiesCount: 2
  });

  assert.equal(questions.player_combat_dominance.type, 'noul');
  assert.ok(questions.player_combat_dominance.criteria.true);
  assert.ok(questions.player_combat_dominance.criteria.false);
});

test('Consistency Noul 3-tier routing escalates when player dominates (P > 0.70)', () => {
  const { computeFallbackPacing } = copilotExports;
  const pacing = computeFallbackPacing({
    playerHull: 95,
    playerShield: 30,
    playerBoost: 90,
    wardenDefeatSeconds: 6,
    pursuitActive: true,
    activeEnemiesCount: 2
  });

  assert.equal(pacing.directorZone, 'aggressive_escalation');
  assert.ok(pacing.dominanceProbability > 0.70);
  assert.ok(pacing.droneSpeedMultiplier > 1.0);
  assert.equal(pacing.emergencyChaffActive, false);
});

test('Consistency Noul 3-tier routing activates emergency lifeline when player is critical (P < 0.30)', () => {
  const { computeFallbackPacing } = copilotExports;
  const pacing = computeFallbackPacing({
    playerHull: 20,
    playerShield: 0,
    playerBoost: 15,
    wardenDefeatSeconds: 28,
    pursuitActive: true,
    activeEnemiesCount: 2
  });

  assert.equal(pacing.directorZone, 'emergency_lifeline');
  assert.ok(pacing.dominanceProbability < 0.30);
  assert.ok(pacing.droneSpeedMultiplier < 1.0);
  assert.equal(pacing.emergencyChaffActive, true);
  assert.equal(pacing.shieldGateAvailable, true);
});

test('Consistency Noul 3-tier routing maintains flow state in equilibrium (0.30 <= P <= 0.70)', () => {
  const { computeFallbackPacing } = copilotExports;
  const pacing = computeFallbackPacing({
    playerHull: 60,
    playerShield: 10,
    playerBoost: 50,
    wardenDefeatSeconds: 15,
    pursuitActive: true,
    activeEnemiesCount: 2
  });

  assert.equal(pacing.directorZone, 'flow_state');
  assert.ok(pacing.dominanceProbability >= 0.30 && pacing.dominanceProbability <= 0.70);
  assert.equal(pacing.droneSpeedMultiplier, 1.0);
});
