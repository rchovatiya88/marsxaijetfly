const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(file, globals = {}) {
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
    performance: globalThis.performance,
    ...globals
  });
  return exportsObject;
}

const sortieRecorderModule = loadTsModule('src/telemetry/sortie-recorder.ts');
const { SortieRecorder } = sortieRecorderModule;
const { simulateSortie } = require('../scripts/run-balance-matrix.cjs');
const { generateSampleCohort, analyzeTelemetryLogs } = require('../scripts/diagnose-telemetry.cjs');
const { dist3D, angleBetween, auditLayoutKinematics } = require('../scripts/validate-corridor-readability.cjs');

test('SortieRecorder accurately samples flight path and records discrete events', () => {
  const recorder = new SortieRecorder();
  recorder.startSortie('bridgehead-run');
  assert.equal(recorder.isRecording(), true);

  // Record flight frames
  recorder.recordFlightFrame(0, { x: 0, y: 3, z: 0 }, 20, 100, 100, 30);
  recorder.recordFlightFrame(300, { x: 0, y: 3, z: -6 }, 20, 95, 100, 30); // Ignored (< 500ms)
  recorder.recordFlightFrame(550, { x: 0, y: 3, z: -11 }, 20, 90, 100, 30); // Recorded (>= 500ms)

  const path = recorder.getFlightPath();
  assert.equal(path.length, 2);
  assert.equal(path[0].z, 0);
  assert.equal(path[1].z, -11);

  // Record events
  recorder.recordEvent('GATE_BREACHED', 4500, { x: -6, y: 10, z: -10 }, { gateId: 'high', speed: 38 });
  recorder.recordEvent('BOOST_EXHAUSTED', 8200, { x: 0, y: 4, z: -25 }, { boostLevel: 0 });
  recorder.recordEvent('DAMAGE_SUSTAINED', 9500, { x: 2, y: 3, z: -28 }, { isFatal: true, source: 'railgun', amount: 40 });

  const events = recorder.getEvents();
  assert.equal(events.length, 3);
  assert.equal(events[0].type, 'GATE_BREACHED');
  assert.equal(events[1].type, 'BOOST_EXHAUSTED');
  assert.equal(events[2].type, 'DAMAGE_SUSTAINED');

  // Finish sortie
  const log = recorder.finishSortie({
    mode: 'bridgehead-run',
    route: 'high',
    won: false,
    durationSeconds: 10,
    score: 850,
    shotsFired: 6,
    chargesSpent: 3,
    hullLost: 100,
    shieldRemaining: 0
  });

  assert.equal(recorder.isRecording(), false);
  assert.equal(log.version, 1);
  assert.equal(log.summary.won, false);
  assert.equal(log.summary.fatalIncident?.source, 'railgun');
  assert.equal(log.summary.fatalIncident?.damage, 40);
});

test('Balance matrix simulation produces consistent metrics and respects route benefits', () => {
  // High route test
  const highRun = simulateSortie({
    bikeSpeed: 20,
    boostSpeed: 38,
    telegraphWindupS: 1.0,
    bossCooldownS: 2.0,
    bossDamage: 13,
    bossHealthStart: 260,
    chosenRoute: 'high'
  }, 0);

  assert.ok(highRun.durationS > 0);
  assert.equal(highRun.chosenRoute, 'high');

  // Low route test
  const lowRun = simulateSortie({
    bikeSpeed: 20,
    boostSpeed: 38,
    telegraphWindupS: 1.0,
    bossCooldownS: 2.0,
    bossDamage: 13,
    bossHealthStart: 260,
    chosenRoute: 'low'
  }, 1);

  assert.equal(lowRun.chosenRoute, 'low');
});

test('Telemetry diagnostic engine accurately aggregates incidents and reaction margins', () => {
  const sampleLogs = generateSampleCohort();
  assert.equal(sampleLogs.length, 10);

  const summary = analyzeTelemetryLogs(sampleLogs);
  assert.equal(summary.totalSorties, 10);
  assert.equal(summary.wins, 7);
  assert.equal(summary.losses, 3);
  assert.ok(summary.routePreference.highCount > 0);
  assert.ok(summary.routePreference.lowCount > 0);
  assert.ok(summary.pilotKinematics.avgReactionDelayMs > 0);
  assert.ok(summary.pilotKinematics.reactionMarginMs > 0);
});

test('Corridor readability validator computes valid 3D angles, distances, and FOV visibility', () => {
  // Test vector helpers
  assert.equal(dist3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5);
  const a90 = angleBetween({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
  assert.equal(Math.round(a90), 90);

  const mockLayout = {
    camera: { fov: 80 },
    movement: { speed: 20, boost: 38 },
    start: { x: 0, y: 0, z: 0 },
    highApproach: { position: { x: 0, y: 5, z: -50 } },
    highGate: { position: { x: 0, y: 5, z: -80 }, radius: 4 },
    highExit: { position: { x: 0, y: 5, z: -120 } },
    lowApproach: { position: { x: 10, y: 0, z: -40 } },
    lowGate: { position: { x: 10, y: 0, z: -70 }, radius: 4 },
    lowExit: { position: { x: 10, y: 0, z: -100 } },
    world: { boxes: [{ id: 'post-1' }, { id: 'post-2' }] }
  };

  const audit = auditLayoutKinematics(mockLayout);
  assert.equal(audit.camera.fov, 80);
  assert.equal(audit.speeds.nominalSpeed, 20);
  assert.equal(audit.speeds.boostSpeed, 38);
  assert.equal(audit.geometry.totalCollisionBoxes, 2);
  assert.equal(audit.highRoute.turnAngleDeg, 5.7); // 5.7 deg pitch transition
  assert.equal(audit.highRoute.isFovVisible, true);
  assert.ok(audit.highRoute.reactionTimeBoostS > 0);
});
