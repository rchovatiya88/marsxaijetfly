'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CATEGORIES, HARD_CHECKS, HUMAN_FIELDS, evaluate, template, freeze, verifyCandidate, hash, percentile } = require('../scripts/bridgehead-acceptance.cjs');

// Deliberately synthetic validator input, never a real project acceptance result.
const id = 'a'.repeat(64);
const options = { verifyFiles: false, candidateVerified: true };
function syntheticLedger() {
  const ledger = template(id);
  ledger.evidence.example = { candidateId: id, path: 'SYNTHETIC-TEST-FIXTURE', sha256: 'b'.repeat(64), procedure: 'Synthetic unit test; no people observed.' };
  const attest = entry => { entry.evidenceRefs = ['example']; entry.notes = 'Synthetic criterion met only to test validator.'; };
  for (const category of CATEGORIES) {
    const entry = ledger.engineering[category.id];
    category.checks.forEach(key => { entry.checks[key] = true; }); attest(entry);
  }
  HARD_CHECKS.forEach(key => { ledger.hardPrerequisites.checks[key] = true; }); attest(ledger.hardPrerequisites);
  ledger.rights.allRequiredAssetsHaveCommercialRights = true; attest(ledger.rights);
  ledger.playerReview.bikeAndWardenSilhouettesReadableInMotion = true; attest(ledger.playerReview);
  ledger.formativeSessions = Array.from({ length: 5 }, (_, i) => ({ id: `formative-${i}`, realHuman: true, freshPlayer: true, buildId: 'synthetic-formative-build', observationNotes: 'Synthetic', evidenceRefs: ['example'] }));
  ledger.sessions = Array.from({ length: 10 }, (_, i) => ({
    id: `synthetic-${i}`, realHuman: true, freshPlayer: true, candidateId: id, browser: 'Synthetic browser', hardware: 'Synthetic hardware', settings: 'Synthetic settings', observationNotes: 'Synthetic', coached: false, completedSession: true, evidenceRefs: ['example'],
    ...Object.fromEntries(HUMAN_FIELDS.map(field => [field, !['cameraOcclusionBlocker', 'unavoidableDamageReproduced'].includes(field)]))
  }));
  ledger.foregroundRuns = Array.from({ length: 3 }, (_, i) => ({ id: `run-${i}`, candidateId: id, source: 'foreground-browser', warmupExcluded: true, renderWidth: 1280, renderHeight: 720, browser: 'Synthetic browser', hardware: 'Synthetic hardware', settings: 'Synthetic settings', scenario: 'Synthetic route and combat', frameIntervalsMs: Array(100).fill(16), streamingScenarioCovered: true, streamingHitchesMs: [50], evidenceRefs: ['example'] }));
  ledger.retryCycles = Array.from({ length: 10 }, (_, i) => ({ id: `cycle-${i}`, candidateId: id, ordinaryInput: true, fullSortie: true, retryCompleted: true, usedTeleportOrDirectHealth: false, outcome: i % 2 ? 'win' : 'loss', settledResources: { geometries: 85, textures: 53, materials: 10, listeners: 10 }, evidenceRefs: ['example'] }));
  return ledger;
}

test('empty acceptance ledger awards no halves and cannot invent human evidence', () => {
  const result = evaluate(template(id), options);
  assert.equal(result.score, 0); assert.equal(result.status, 'NOT YET'); assert.equal(result.humanSessions, 0);
});
test('exact 90 gate permits whole non-core halves to fail but rejects any failed core half', () => {
  const ledger = syntheticLedger();
  ledger.engineering.mission.checks.assetFailure = false;
  ledger.engineering.replay.checks.qaScoreSeparation = false;
  assert.equal(evaluate(ledger, options).score, 90);
  assert.equal(evaluate(ledger, options).status, 'PASS');
  ledger.engineering.flight.checks.cursorInput = false;
  assert.equal(evaluate(ledger, options).status, 'NOT YET');
  assert.equal(evaluate(ledger, options).coreFull, false);
});
test('partial evidence, another build, coaching and substituted participants cannot certify core categories', () => {
  for (const mutate of [
    ledger => { ledger.engineering.flight.evidenceRefs = []; },
    ledger => { ledger.sessions[0].candidateId = 'c'.repeat(64); },
    ledger => { ledger.sessions.slice(0, 3).forEach(session => { session.coached = true; }); },
    ledger => { ledger.sessions[9].id = ledger.sessions[0].id; },
    ledger => { ledger.sessions.push({ ...ledger.sessions[0], id: 'replacement' }); },
    ledger => { ledger.sessions[0].realHuman = false; }
  ]) {
    const ledger = syntheticLedger(); mutate(ledger);
    assert.equal(evaluate(ledger, options).status, 'NOT YET');
  }
});
test('a high aggregate cannot mask a category with neither half or unresolved hard defect', () => {
  const ledger = syntheticLedger();
  ledger.engineering.replay.checks.qaScoreSeparation = false;
  ledger.sessions.forEach(session => { session.voluntaryReplayWithImprovement = false; });
  const result = evaluate(ledger, options);
  assert.equal(result.score, 95); assert.equal(result.everyCategoryHalf, false); assert.equal(result.status, 'NOT YET');
  const defective = syntheticLedger(); defective.unresolvedDefects.push({ id: 'input-loss', reproduction: 'Synthetic' });
  assert.equal(evaluate(defective, options).score, 100);
  assert.equal(evaluate(defective, options).status, 'NOT YET');
});
test('scripted retries, embedded timing, wrong rendering pixels and variable conditions are rejected', () => {
  for (const mutate of [
    ledger => { ledger.retryCycles[0].usedTeleportOrDirectHealth = true; },
    ledger => { ledger.foregroundRuns[0].source = 'embedded-browser'; },
    ledger => { ledger.foregroundRuns[0].renderWidth = 1279; },
    ledger => { ledger.foregroundRuns[0].settings = 'different'; }
  ]) {
    const ledger = syntheticLedger(); mutate(ledger);
    assert.equal(evaluate(ledger, options).hardPrerequisites, false);
  }
});
test('raw foreground samples and retry resource growth withhold the performance engineering half', () => {
  const ledger = syntheticLedger();
  ledger.foregroundRuns[0].frameIntervalsMs = Array(100).fill(21);
  const slow = evaluate(ledger, options);
  assert.equal(slow.rows.find(row => row.category === 'performance').engineering, false);
  // The written contract separately requires declared conditions as a hard gate;
  // it does not silently turn every performance point into another hard gate.
  assert.equal(slow.hardPrerequisites, true);
  const leaking = syntheticLedger(); leaking.retryCycles.forEach((cycle, i) => { cycle.settledResources.geometries += i; });
  assert.equal(evaluate(leaking, options).rows.find(row => row.category === 'performance').engineering, false);
  assert.equal(percentile([10, 20, 30, 40], .95), 40);
});
test('rights distinguish an internal design pass from premium-ready label', () => {
  const ledger = syntheticLedger(); ledger.rights.allRequiredAssetsHaveCommercialRights = false;
  assert.equal(evaluate(ledger, options).status, 'INTERNAL PASS; PREMIUM-READY BLOCKED BY RIGHTS');
});
test('freeze preserves build bytes and detects later tampering and evidence hash mismatch', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bridgehead-acceptance-test-'));
  try {
    for (const dir of ['dist', 'src', 'scripts']) fs.mkdirSync(path.join(root, dir));
    fs.writeFileSync(path.join(root, 'dist', 'index.html'), 'synthetic-build');
    const destination = path.join(root, 'candidate');
    const manifest = freeze(root, destination);
    fs.writeFileSync(path.join(root, 'dist', 'index.html'), 'later-build');
    assert.equal(verifyCandidate(destination).candidateId, manifest.candidateId);
    assert.throws(() => freeze(root, destination), /never overwritten/);
    const ledger = syntheticLedger();
    fs.writeFileSync(path.join(destination, 'evidence.txt'), 'recorded evidence');
    ledger.evidence.example.path = 'evidence.txt'; ledger.evidence.example.sha256 = hash('recorded evidence');
    assert.equal(evaluate(ledger, { base: destination, candidateVerified: true }).score, 100);
    fs.writeFileSync(path.join(destination, 'evidence.txt'), 'modified evidence');
    assert.equal(evaluate(ledger, { base: destination, candidateVerified: true }).score, 0);
    fs.writeFileSync(path.join(destination, 'build', 'index.html'), 'tampered');
    assert.throws(() => verifyCandidate(destination), /differ/);
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
