#!/usr/bin/env node
'use strict';

// A ledger validator, not an automated substitute for observing people play.
// Every awarded half requires complete attestations and hash-bound evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const CATEGORIES = [
  { id: 'flight', weight: 20, checks: ['ordinaryHighTraversal', 'ordinaryLowTraversal', 'noTunnellingOrTrapping', 'capturedInput', 'cursorInput', 'pauseResume', 'retry'] },
  { id: 'route', weight: 20, checks: ['orderedMarkers', 'exclusiveRewards', 'highExposure', 'lowCover'] },
  { id: 'combat', weight: 20, checks: ['telegraphLockProjectileRecovery', 'reciprocalCover', 'hitFeedback', 'deathFeedback', 'noAttackThroughCover'] },
  { id: 'mission', weight: 15, checks: ['ordinaryHighWin', 'ordinaryLowWin', 'loss', 'retry', 'invalidCrossing', 'assetFailure', 'pausedExtraction', 'oneResultPerRun'] },
  { id: 'identity', weight: 10, checks: ['launchCapture', 'forkCapture', 'bridgeCapture', 'courtCapture', 'noMissingMaterials', 'noLodHoles', 'noOcclusionMismatch', 'sound', 'mute', 'reducedEffects'] },
  { id: 'performance', weight: 10, checks: ['threeForegroundRuns', 'tenFullRetryCycles', 'noMonotonicSettledResourceGrowth'] },
  { id: 'replay', weight: 5, checks: ['routeResult', 'shotsAndChargeResult', 'damageResult', 'timeResult', 'sameRendererRetry', 'qaScoreSeparation', 'noDuplicateReward'] }
];
const HARD_CHECKS = ['noCrash', 'noSoftlock', 'noWrongResult', 'noThroughCoverDamage', 'noInputLoss', 'noColliderStreamingDefect', 'ordinaryHighWin', 'ordinaryLowWin', 'tenFullRetryCycles', 'declaredForegroundConditions'];
const HUMAN_FIELDS = ['launchSteerFirstHitWithin90s', 'cameraOcclusionBlocker', 'explainsRouteRewardAndCost', 'voluntaryOtherBranch', 'identifiesDamageAndIntentionalResponse', 'unavoidableDamageReproduced', 'objectiveClearAtLaunchForkExtraction', 'completesWithinThreeUncoachedAttempts', 'routeThreatExitWithoutColorAlone', 'bikeAndWardenReadableInMotion', 'supportedBrowserLaunchWithoutBlocker', 'responsiveDuringDetailAndFocusRecovery', 'voluntaryReplayWithImprovement'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const all = (object, keys) => keys.every(key => object?.[key] === true);
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}
function inventory(root) {
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw Error(`Freeze refuses symlink: ${absolute}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(absolute);
        files.push({ path: path.relative(root, absolute).split(path.sep).join('/'), bytes: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  visit(root);
  return files;
}
function template(candidateId) {
  return {
    schemaVersion: 1, candidateId,
    contract: 'docs/BRIDGEHEAD_RUN_SCORECARD.md',
    evidence: {},
    engineering: Object.fromEntries(CATEGORIES.map(category => [category.id, { checks: Object.fromEntries(category.checks.map(check => [check, false])), evidenceRefs: [], notes: '' }])),
    hardPrerequisites: { checks: Object.fromEntries(HARD_CHECKS.map(check => [check, false])), evidenceRefs: [], notes: '' },
    rights: { allRequiredAssetsHaveCommercialRights: false, evidenceRefs: [], notes: '' },
    formativeSessions: [], sessions: [], foregroundRuns: [], retryCycles: [], unresolvedDefects: [],
    playerReview: { bikeAndWardenSilhouettesReadableInMotion: false, evidenceRefs: [], notes: '' },
    notes: 'Unobserved fields stay false. Human sample is zero until real sessions are recorded. See docs/BRIDGEHEAD_ITERATION_REVIEW.md for schemas and procedure.'
  };
}
function freeze(root, destination) {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw Error('Build first: npm run build');
  if (fs.existsSync(destination)) throw Error('Use a new candidate directory; existing evidence is never overwritten.');
  const files = inventory(dist);
  const candidateId = hash(JSON.stringify(files));
  const sourceFiles = ['package.json', 'package-lock.json', 'vite.config.mjs', 'tsconfig.json', 'index.html']
    .filter(name => fs.existsSync(path.join(root, name)))
    .map(name => ({ path: name, sha256: hash(fs.readFileSync(path.join(root, name))) }));
  for (const dir of ['src', 'scripts']) {
    for (const file of inventory(path.join(root, dir))) sourceFiles.push({ ...file, path: `${dir}/${file.path}` });
  }
  const git = args => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return 'unavailable'; } };
  fs.mkdirSync(destination, { recursive: true });
  // Preserve the tested bytes. Later rebuilds of dist cannot mutate this candidate.
  fs.cpSync(dist, path.join(destination, 'build'), { recursive: true, errorOnExist: true, force: false });
  const manifest = { schemaVersion: 1, candidateId, createdAt: new Date().toISOString(), gitHead: git(['rev-parse', 'HEAD']), gitStatus: git(['status', '--short']), files, sourceFiles };
  fs.writeFileSync(path.join(destination, 'candidate.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(destination, 'acceptance.json'), JSON.stringify(template(candidateId), null, 2) + '\n');
  return manifest;
}

function evaluate(ledger, options = {}) {
  const issues = [];
  const fail = message => { issues.push(message); return false; };
  const base = options.base || process.cwd();
  const verifyFiles = options.verifyFiles !== false;
  const evidenceValid = refs => Array.isArray(refs) && refs.length > 0 && refs.every(ref => {
    const evidence = ledger.evidence?.[ref];
    if (!evidence || evidence.candidateId !== ledger.candidateId || !nonempty(evidence.path) || !/^[a-f0-9]{64}$/.test(evidence.sha256 || '') || !nonempty(evidence.procedure)) return false;
    if (!verifyFiles) return true;
    try { return hash(fs.readFileSync(path.resolve(base, evidence.path))) === evidence.sha256; } catch { return false; }
  });
  const attested = entry => evidenceValid(entry?.evidenceRefs) && nonempty(entry?.notes);
  const candidateValid = /^[a-f0-9]{64}$/.test(ledger.candidateId || '') && ledger.schemaVersion === 1 && options.candidateVerified === true;
  if (!candidateValid) fail('Frozen candidate bytes are not verified.');

  const sessions = Array.isArray(ledger.sessions) ? ledger.sessions : [];
  const cohortValid = sessions.length === 10 && new Set(sessions.map(s => s.id)).size === 10 && sessions.every(s =>
    nonempty(s.id) && s.realHuman === true && s.freshPlayer === true && s.candidateId === ledger.candidateId &&
    nonempty(s.browser) && nonempty(s.hardware) && nonempty(s.settings) && nonempty(s.observationNotes) &&
    typeof s.coached === 'boolean' && typeof s.completedSession === 'boolean' &&
    HUMAN_FIELDS.every(field => typeof s[field] === 'boolean') && evidenceValid(s.evidenceRefs));
  if (!cohortValid) fail('A complete ten-person fresh-human cohort with recorded failures/attrition is missing or invalid.');
  const formative = Array.isArray(ledger.formativeSessions) ? ledger.formativeSessions : [];
  const formativeValid = formative.length === 5 && new Set(formative.map(s => s.id)).size === 5 && formative.every(s =>
    nonempty(s.id) && s.realHuman === true && s.freshPlayer === true && nonempty(s.buildId) && nonempty(s.observationNotes) &&
    !sessions.some(scored => scored.id === s.id) && evidenceValid(s.evidenceRefs));
  if (!formativeValid) fail('The separate five-person formative round is unrecorded.');
  // Attrition and coached sessions remain in the denominator and cannot become unassisted successes.
  const count = (field, unassisted = false) => cohortValid ? sessions.filter(s => s.completedSession && (!unassisted || !s.coached) && s[field] === true).length : 0;
  const none = field => cohortValid && sessions.every(s => s[field] === false);
  const human = {
    flight: count('launchSteerFirstHitWithin90s', true) >= 8 && none('cameraOcclusionBlocker'),
    route: count('explainsRouteRewardAndCost') >= 8 && count('voluntaryOtherBranch') >= 5,
    combat: count('identifiesDamageAndIntentionalResponse') >= 8 && none('unavoidableDamageReproduced'),
    mission: count('objectiveClearAtLaunchForkExtraction') >= 8 && count('completesWithinThreeUncoachedAttempts', true) >= 7,
    identity: count('routeThreatExitWithoutColorAlone') >= 8 && ledger.playerReview?.bikeAndWardenSilhouettesReadableInMotion === true && attested(ledger.playerReview),
    performance: count('supportedBrowserLaunchWithoutBlocker') === 10 && count('responsiveDuringDetailAndFocusRecovery') === 10,
    replay: count('voluntaryReplayWithImprovement') >= 5
  };

  const runs = Array.isArray(ledger.foregroundRuns) ? ledger.foregroundRuns : [];
  const runSummaries = runs.map(run => {
    const values = run.frameIntervalsMs;
    const samplesValid = Array.isArray(values) && values.length > 0 && values.every(ms => Number.isFinite(ms) && ms > 0);
    const streamingRecorded = run.streamingScenarioCovered === true && Array.isArray(run.streamingHitchesMs) && run.streamingHitchesMs.every(ms => Number.isFinite(ms) && ms >= 0);
    const result = { id: run.id, samples: samplesValid ? values.length : 0, p95: samplesValid ? percentile(values, .95) : null, p99: samplesValid ? percentile(values, .99) : null };
    result.conditions = samplesValid && streamingRecorded && run.source === 'foreground-browser' && run.warmupExcluded === true && run.renderWidth === 1280 && run.renderHeight === 720 && nonempty(run.hardware) && nonempty(run.browser) && nonempty(run.settings) && nonempty(run.scenario) && run.candidateId === ledger.candidateId && evidenceValid(run.evidenceRefs);
    result.pass = result.conditions && result.p95 <= 20 && result.p99 <= 33.3 && run.streamingHitchesMs.every(ms => ms <= 100);
    return result;
  });
  const fixedConditions = runs.length === 3 && new Set(runs.map(run => run.id)).size === 3 && runs.every(run => nonempty(run.id) && run.hardware === runs[0].hardware && run.browser === runs[0].browser && run.settings === runs[0].settings && run.scenario === runs[0].scenario);
  const performanceValid = fixedConditions && runSummaries.every(run => run.pass);
  const foregroundConditionsValid = fixedConditions && runSummaries.every(run => run.conditions);
  if (!performanceValid) fail('Three fixed foreground runs with p95 <=20ms, p99 <=33.3ms, and no streaming hitch >100ms are unverified.');
  const cycles = Array.isArray(ledger.retryCycles) ? ledger.retryCycles : [];
  const retriesValid = cycles.length >= 10 && new Set(cycles.map(cycle => cycle.id)).size === cycles.length &&
    cycles.some(cycle => cycle.outcome === 'win') && cycles.some(cycle => cycle.outcome === 'loss') &&
    cycles.every(cycle => nonempty(cycle.id) && cycle.candidateId === ledger.candidateId && cycle.ordinaryInput === true && cycle.fullSortie === true && cycle.retryCompleted === true && cycle.usedTeleportOrDirectHealth === false && ['win', 'loss'].includes(cycle.outcome) && evidenceValid(cycle.evidenceRefs) && ['geometries', 'textures', 'materials', 'listeners'].every(key => Number.isInteger(cycle.settledResources?.[key]) && cycle.settledResources[key] >= 0));
  if (!retriesValid) fail('Ten complete ordinary-input win/loss/retry cycles with settled resources are unverified.');
  const monotonicGrowth = retriesValid && ['geometries', 'textures', 'materials', 'listeners'].some(key =>
    cycles[cycles.length - 1].settledResources[key] > cycles[0].settledResources[key] &&
    cycles.every((cycle, index) => index === 0 || cycle.settledResources[key] >= cycles[index - 1].settledResources[key]));
  if (monotonicGrowth) fail('At least one resource count grows monotonically across settled full retries.');

  const rows = CATEGORIES.map(category => {
    const entry = ledger.engineering?.[category.id];
    const engineering = candidateValid && all(entry?.checks, category.checks) && attested(entry) && (category.id !== 'performance' || performanceValid && retriesValid && !monotonicGrowth);
    const player = candidateValid && cohortValid && human[category.id];
    return { category: category.id, weight: category.weight, engineering, player, points: (Number(engineering) + Number(player)) * category.weight / 2 };
  });
  const score = rows.reduce((sum, row) => sum + row.points, 0);
  const hard = ledger.hardPrerequisites;
  const noUnresolvedDefects = Array.isArray(ledger.unresolvedDefects) && ledger.unresolvedDefects.length === 0;
  const hardValid = candidateValid && all(hard?.checks, HARD_CHECKS) && attested(hard) && noUnresolvedDefects && retriesValid && foregroundConditionsValid;
  if (!hardValid) fail('Hard prerequisites have unresolved defects, missing attestations, or missing evidence.');
  const everyCategoryHalf = rows.every(row => row.points >= row.weight / 2);
  const coreFull = rows.filter(row => ['flight', 'route', 'combat'].includes(row.category)).every(row => row.engineering && row.player);
  const designPass = score >= 90 && everyCategoryHalf && coreFull && hardValid && formativeValid;
  const rights = ledger.rights?.allRequiredAssetsHaveCommercialRights === true && attested(ledger.rights);
  if (!rights) fail('Commercial rights for every required source/derived asset remain unverified.');
  return { status: designPass ? rights ? 'PASS' : 'INTERNAL PASS; PREMIUM-READY BLOCKED BY RIGHTS' : 'NOT YET', score, maximum: 100, rows, humanSessions: sessions.length, coreFull, everyCategoryHalf, hardPrerequisites: hardValid, rightsVerified: rights, foregroundRuns: runSummaries, issues, notice: 'Scores validate the recorded attestations and evidence references; they do not independently establish fun, commercial demand, or publication authorization.' };
}

function verifyCandidate(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'candidate.json'), 'utf8'));
  const actual = inventory(path.join(directory, 'build'));
  if (hash(JSON.stringify(actual)) !== manifest.candidateId || JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw Error('Frozen build bytes differ from candidate.json. Create a new candidate and new scoring cohort.');
  return manifest;
}

if (require.main === module) {
  try {
    const [command, destinationArg] = process.argv.slice(2);
    if (!destinationArg || !['freeze', 'score', 'verify'].includes(command)) throw Error('Usage: node scripts/bridgehead-acceptance.cjs freeze|verify|score <candidate-directory>');
    const destination = path.resolve(destinationArg);
    if (command === 'freeze') {
      const manifest = freeze(process.cwd(), destination);
      console.log(JSON.stringify({ candidateId: manifest.candidateId, directory: destination, files: manifest.files.length, status: 'FROZEN; NO ACCEPTANCE EVIDENCE RECORDED' }, null, 2));
    } else {
      const manifest = verifyCandidate(destination);
      if (command === 'verify') console.log(`Verified ${manifest.candidateId}`);
      else {
        const ledger = JSON.parse(fs.readFileSync(path.join(destination, 'acceptance.json'), 'utf8'));
        if (ledger.candidateId !== manifest.candidateId) throw Error('Ledger belongs to a different candidate.');
        const report = evaluate(ledger, { base: destination, candidateVerified: true });
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = report.status === 'PASS' ? 0 : 2;
      }
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { CATEGORIES, HARD_CHECKS, HUMAN_FIELDS, evaluate, template, freeze, verifyCandidate, percentile, hash };
