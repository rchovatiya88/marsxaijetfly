const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  probeVideo,
  computeSampleTimestamps,
  analyzeFrameVisuals
} = require('../scripts/analyze-gameplay-video.cjs');

test('computeSampleTimestamps produces evenly spaced intervals', () => {
  const duration = 18.0;
  const count = 9;
  const stamps = computeSampleTimestamps(duration, count);

  assert.equal(stamps.length, 9);
  assert.equal(stamps[0], 1.8);
  assert.equal(stamps[4], 9.0);
  assert.equal(stamps[8], 16.2);

  // Monotonically increasing
  for (let i = 1; i < stamps.length; i++) {
    assert.ok(stamps[i] > stamps[i - 1]);
  }
});

test('computeSampleTimestamps handles single sample boundary', () => {
  const stamps = computeSampleTimestamps(10.0, 1);
  assert.deepEqual(stamps, [5.0]);
});

test('probeVideo correctly extracts metadata from real QuickTime recording', () => {
  const videoPath = '/Users/ronakchovatiya/Downloads/gamep32.mov';
  if (!fs.existsSync(videoPath)) return; // Skip if file moved

  const meta = probeVideo(videoPath);
  assert.equal(meta.filename, 'gamep32.mov');
  assert.equal(meta.width, 3360);
  assert.equal(meta.height, 2100);
  assert.equal(meta.fps, 60);
  assert.ok(meta.durationSeconds > 17.0 && meta.durationSeconds < 18.5);
  assert.equal(meta.codec, 'h264');
  assert.ok(meta.hasAudio);
});

test('probeVideo rejects nonexistent file with descriptive error', () => {
  assert.throws(() => {
    probeVideo('/tmp/nonexistent-video-file-xyz.mp4');
  }, /Video file not found/);
});
