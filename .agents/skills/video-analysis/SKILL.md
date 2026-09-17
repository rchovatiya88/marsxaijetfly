---
name: video-analysis
description: Ingests, probes, samples, and critiques gameplay video recordings (.mov, .mp4, .webm) using FFmpeg, FFprobe, and TypeSafe AI (Jev System One). Use to audit visual contrast, motion kinematics, frame pacing, and combat readability against vertical slice standards.
---

# Video Analysis & Verification Skill

This skill provides automated video verification procedures for `marsxaijetfly`. It processes real video captures (desktop recordings, QuickTime `.mov`, OBS `.mp4`, or WebM captures) to enforce the visual and performance standards established in `docs/VALIDATION.md` and `docs/CAMERA_MOUSE_REAL_PLAYTEST_PLAN.md`.

---

## 1. Quick Start

Run the automated video analysis tool against default or custom recordings:

```bash
# Analyze historical baseline recording (/Users/ronakchovatiya/Downloads/gamep32.mov)
npm run ai:video

# Analyze a specific recording with custom frame sample count
node scripts/analyze-gameplay-video.cjs /path/to/capture.mov --frames 12

# Run without remote AI evaluation (pure FFmpeg computer vision metrics)
node scripts/analyze-gameplay-video.cjs --no-ai
```

---

## 2. Core Capabilities

### A. Stream Metadata Probing (`ffprobe`)
- **Resolution & Aspect Ratio**: Validates against target viewports (1280×720 / 1920×1080 / Retina).
- **Frame Rate**: Probes average and instantaneous frame rates to flag drops below 60 FPS.
- **Bitrate & Codec**: Audits video encoder quality (H.264 / HEVC / ProRes) and audio channel configuration.

### B. Representative Frame Sampling (`ffmpeg`)
- Automatically samples $N$ keyframes (default 9 frames) evenly spaced across the recording duration.
- Generates high-resolution JPG/PNG frame artifacts and saves them into the active conversation artifacts directory.

### C. Quantitative Visual Metrics
- **Scene Luminance**: Detects overexposed skyboxes or crushed dark shadow faces.
- **Martian Red Dominance**: Measures the ratio of red color energy vs green/blue to detect visual monotony or washed-out terrain.
- **Dynamic Contrast Range**: Assesses whether neon cyan/emerald gates and Warden telegraphs stand out against background cliffs.

### D. TypeSafe AI (Jev System One) Calibration
When `TYPESAFE_API_KEY` is present in `.env`, the tool queries Jev System One:
- **`visual_clarity_score`** (`Score` primitive, 0.0 - 2.0): Measures combat legibility and contrast against red terrain.
- **`flight_kinematics_assessment`** (`Choice` primitive): Detects missing vehicle banking roll ($\pm 24^\circ$) or missing speed-tunnel FOV surge ($80^\circ \to 90^\circ$).
- **`release_readiness`** (`Noul` primitive): Evaluates whether the captured gameplay satisfies paid commercial vertical slice gates.

---

## 3. Evidence Protocol

When documenting results in `docs/VALIDATION.md`:
1. Record file name, duration, pixel dimensions, and capture hardware.
2. Embed the sampled frame gallery.
3. Compare against previous recordings to prevent visual regressions.
