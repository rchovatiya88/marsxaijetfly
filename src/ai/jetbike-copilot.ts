/**
 * Jetbike AI Copilot for Red Horizon
 * 
 * Powered by TypeSafe AI (Jev System One model).
 * Evaluates real-time flight telemetry to provide tactical maneuvers,
 * threat scoring, and HUD advice without stalling the game render loop.
 */

import { evaluateSystemOne, SystemOneResponse, Question } from './typesafe-client';

export interface JetbikeFlightTelemetry {
  player: {
    hull: number;       // 0 - 100
    shield: number;     // 0 - 30
    boost: number;      // 0 - 100
    altitude: number;   // meters
    speed: number;      // m/s
    isBoosting: boolean;
  };
  combat: {
    wardenDistance: number;          // meters
    incomingProjectiles: number;     // count
    isWardenCharging: boolean;       // telegraph active
    weaponHeat: number;              // 0 - 1.0
  };
  route: {
    selectedRoute: 'high_gate' | 'low_gate' | 'undecided';
    extractionActive: boolean;
  };
}

export interface CopilotRecommendation {
  threatLevel: number;             // 0.0 - 2.0
  threatConfidence: number;
  tacticalAction: string;
  actionConfidence: number;
  counterAttackSafe: boolean;
  counterAttackProbability: number;
  counterAttackStatus: 'safe' | 'contested' | 'lethal';
  hudMessage: string;
  source: 'jev' | 'fallback';
}

/**
 * Maps calibrated Noul probabilities through an inclusive uncertainty band:
 * - p > high: 'yes' (High confidence positive)
 * - p < low:  'no'  (High confidence negative)
 * - low <= p <= high: 'uncertain' (Genuine ambiguity; review / cautious mitigation)
 */
export function evaluateNoulBand(
  probability: number,
  low: number = 0.30,
  high: number = 0.70
): 'yes' | 'uncertain' | 'no' {
  if (probability > high) return 'yes';
  if (probability < low) return 'no';
  return 'uncertain';
}

export function buildCopilotQuestions(telemetry: JetbikeFlightTelemetry): Record<string, Question> {
  return {
    threat_level: {
      type: 'score',
      instructions: 'Rate the immediate survival threat level to the jetbike given `player` status and `combat` conditions.',
      criteria: [
        'Clear sky / nominal flight / no immediate hazard',
        'Active dogfight / enemy in range / manageable pressure',
        'Lethal threat / imminent incoming hit or critical hull failure'
      ]
    },
    tactical_action: {
      type: 'choice',
      instructions: 'What is the highest priority tactical flight maneuver right now?',
      criteria: {
        'dive_canyon_cover': 'Descend close to terrain to break line-of-sight and dodge incoming fire.',
        'boost_break_lock': 'Trigger boost thrust to out-accelerate enemy projectile trajectory.',
        'counter_barrage': 'Focus forward aim and fire on Warden during vulnerability window.',
        'seek_low_gate_shield': 'Steer toward the low gate to regenerate 30 shield capacity.',
        'hold_extraction': 'Maintain stable flight inside extraction zone to complete mission.'
      }
    },
    counter_attack_safe: {
      type: 'noul',
      instructions: 'Is it safe for the player to commit to an offensive weapon burst without sustaining fatal counter-damage?',
      criteria: {
        'true': 'Player has sufficient hull/shield and is not in an active telegraph crosshair.',
        'false': 'High incoming danger makes staying stationary to aim fatal.'
      }
    }
  };
}

export function computeFallbackTactics(telemetry: JetbikeFlightTelemetry): CopilotRecommendation {
  const { player, combat, route } = telemetry;
  
  let threat = 0.2;
  let action = 'maintain_course';
  let counterSafe = true;
  let hud = 'Copilot: Airspace clear. Maintain flight vector.';

  if (combat.isWardenCharging || combat.incomingProjectiles > 0) {
    threat = 1.8;
    counterSafe = false;
    if (player.boost > 20) {
      action = 'boost_break_lock';
      hud = 'Copilot: Missile lock detected! Boost immediately!';
    } else {
      action = 'dive_canyon_cover';
      hud = 'Copilot: Danger! Dive into the canyon for terrain cover!';
    }
  } else if (player.hull < 40 && route.selectedRoute === 'undecided') {
    threat = 1.2;
    action = 'seek_low_gate_shield';
    hud = 'Copilot: Hull compromised. Route to low canyon gate for shield!';
  } else if (route.extractionActive && combat.wardenDistance > 60) {
    threat = 0.5;
    action = 'hold_extraction';
    hud = 'Copilot: Warden neutralized. Hold inside extraction boundary!';
  } else if (combat.wardenDistance <= 45 && !combat.isWardenCharging) {
    threat = 1.0;
    action = 'counter_barrage';
    hud = 'Copilot: Counter window open! Fire on the Warden!';
  }

  const fallbackProb = counterSafe ? 0.82 : 0.18;
  const fallbackStatus: 'safe' | 'contested' | 'lethal' = counterSafe ? 'safe' : 'lethal';

  return {
    threatLevel: threat,
    threatConfidence: 0.9,
    tacticalAction: action,
    actionConfidence: 0.85,
    counterAttackSafe: counterSafe,
    counterAttackProbability: fallbackProb,
    counterAttackStatus: fallbackStatus,
    hudMessage: hud,
    source: 'fallback'
  };
}

export async function evaluateFlightTactics(
  telemetry: JetbikeFlightTelemetry,
  apiKey?: string,
  timeoutMs: number = 1500
): Promise<CopilotRecommendation> {
  const questions = buildCopilotQuestions(telemetry);

  try {
    const response: SystemOneResponse = await evaluateSystemOne({
      state: telemetry,
      questions,
      apiKey,
      timeoutMs
    });

    const threatAns = response.answers.threat_level as any;
    const actionAns = response.answers.tactical_action as any;
    const counterAns = response.answers.counter_attack_safe as any;

    const threatLevel = threatAns?.score ?? 1.0;
    const threatConf = threatAns?.confidence ?? 0.8;
    const action = actionAns?.choice ?? 'dive_canyon_cover';
    const actionConf = actionAns?.confidence ?? 0.8;
    const counterProb = typeof counterAns?.noul === 'number' ? counterAns.noul : 0.5;

    // Consistency Noul Tri-Band Evaluation (0.30 - 0.70 band)
    const counterBand = evaluateNoulBand(counterProb, 0.30, 0.70);
    const counterStatus: 'safe' | 'contested' | 'lethal' = 
      counterBand === 'yes' ? 'safe' : counterBand === 'no' ? 'lethal' : 'contested';
    const counterSafe = counterStatus === 'safe';

    let hud = 'Copilot: Systems nominal.';
    if (action === 'boost_break_lock') {
      hud = 'Copilot: Evade! Hit boost to break trajectory!';
    } else if (action === 'dive_canyon_cover') {
      hud = 'Copilot: Dive low! Use canyon walls for cover!';
    } else if (action === 'counter_barrage') {
      if (counterStatus === 'safe') {
        hud = 'Copilot: Counter window clear! Open fire on Warden!';
      } else if (counterStatus === 'contested') {
        hud = 'Copilot: Contested window! Defensive burst only!';
      } else {
        hud = 'Copilot: Danger! Evasive maneuvers priority over counter-fire!';
      }
    } else if (action === 'seek_low_gate_shield') {
      hud = 'Copilot: Divert to low gate to restore shields!';
    } else if (action === 'hold_extraction') {
      hud = 'Copilot: Hold position in extraction zone!';
    }

    return {
      threatLevel,
      threatConfidence: threatConf,
      tacticalAction: action,
      actionConfidence: actionConf,
      counterAttackSafe: counterSafe,
      counterAttackProbability: counterProb,
      counterAttackStatus: counterStatus,
      hudMessage: hud,
      source: 'jev'
    };
  } catch (_err) {
    // Graceful offline fallback
    return computeFallbackTactics(telemetry);
  }
}

/**
 * Consistency Noul Sortie Pacing & Difficulty Director
 * 
 * Implements the TypeSafe AI Consistency Noul pattern:
 * Uses calibrated probability P(dominance) to route adaptive gameplay into 3 stable zones:
 * - P > 0.70: Aggressive escalation (drones match speed, fire twin-bursts)
 * - P < 0.30: Emergency lifeline (auto-chaff, drone fire dampened, shield recharge)
 * - 0.30 <= P <= 0.70: Equilibrium flow state (balanced dogfight challenge)
 */
export interface SortiePacingTelemetry {
  playerHull: number;          // 0 - 100
  playerShield: number;        // 0 - 30
  playerBoost: number;         // 0 - 100
  wardenDefeatSeconds: number; // time taken to eliminate Warden
  pursuitActive: boolean;
  activeEnemiesCount: number;
  shotsAccuracy?: number;      // 0 - 1.0
}

export interface PacingDirectorDecision {
  dominanceProbability: number; // Calibrated P in [0, 1]
  directorZone: 'aggressive_escalation' | 'flow_state' | 'emergency_lifeline';
  droneSpeedMultiplier: number;
  droneFireRateMultiplier: number;
  tacticalDirective: string;
  emergencyChaffActive: boolean;
  shieldGateAvailable: boolean;
  source: 'jev' | 'fallback';
}

export function buildPacingQuestions(telemetry: SortiePacingTelemetry): Record<string, Question> {
  return {
    player_combat_dominance: {
      type: 'noul',
      instructions: 'Based on the jetbike pilot telemetry, is the player heavily dominating the sortie (high hull/shield, fast boss elimination, surplus boost)?',
      criteria: {
        'true': 'Player is heavily dominating with high health, high boost reserves, and fast boss defeat pace.',
        'false': 'Player is taking severe damage, struggling with survival, or in critical danger of mission failure.'
      }
    }
  };
}

export function computeFallbackPacing(telemetry: SortiePacingTelemetry): PacingDirectorDecision {
  const hullRatio = Math.max(0, Math.min(1, telemetry.playerHull / 100));
  const shieldRatio = Math.max(0, Math.min(1, telemetry.playerShield / 30));
  const boostRatio = Math.max(0, Math.min(1, telemetry.playerBoost / 100));
  const speedBonus = telemetry.wardenDefeatSeconds > 0 
    ? Math.max(0, Math.min(1, 1 - (telemetry.wardenDefeatSeconds - 5) / 20))
    : 0.5;

  // Calibrated composite probability estimation
  const pDominance = Number((0.35 * hullRatio + 0.25 * shieldRatio + 0.20 * boostRatio + 0.20 * speedBonus).toFixed(3));

  if (pDominance > 0.70) {
    return {
      dominanceProbability: pDominance,
      directorZone: 'aggressive_escalation',
      droneSpeedMultiplier: 1.35,
      droneFireRateMultiplier: 1.4,
      tacticalDirective: 'PURSUIT INTENSIFIED: Hostiles matching acceleration! Execute canyon evasions!',
      emergencyChaffActive: false,
      shieldGateAvailable: false,
      source: 'fallback'
    };
  } else if (pDominance < 0.30) {
    return {
      dominanceProbability: pDominance,
      directorZone: 'emergency_lifeline',
      droneSpeedMultiplier: 0.75,
      droneFireRateMultiplier: 0.5,
      tacticalDirective: 'EMERGENCY: Hull critical! Auto-chaff deployed, shield recovery active!',
      emergencyChaffActive: true,
      shieldGateAvailable: true,
      source: 'fallback'
    };
  } else {
    return {
      dominanceProbability: pDominance,
      directorZone: 'flow_state',
      droneSpeedMultiplier: 1.0,
      droneFireRateMultiplier: 1.0,
      tacticalDirective: 'DOGFIGHT BALANCED: Maintain flight vector while holding extraction approach.',
      emergencyChaffActive: false,
      shieldGateAvailable: false,
      source: 'fallback'
    };
  }
}

export async function evaluateSortiePacing(
  telemetry: SortiePacingTelemetry,
  apiKey?: string,
  timeoutMs: number = 1500
): Promise<PacingDirectorDecision> {
  const questions = buildPacingQuestions(telemetry);

  try {
    const response: SystemOneResponse = await evaluateSystemOne({
      state: telemetry,
      questions,
      apiKey,
      timeoutMs
    });

    const dominanceAns = response.answers.player_combat_dominance as any;
    const pDominance = typeof dominanceAns?.noul === 'number' ? dominanceAns.noul : 0.5;

    // Consistency Noul 3-Way Action Routing:
    // P > 0.70: High confidence escalation
    // P < 0.30: High confidence defensive lifeline
    // 0.30 <= P <= 0.70: Flow state equilibrium
    if (pDominance > 0.70) {
      return {
        dominanceProbability: pDominance,
        directorZone: 'aggressive_escalation',
        droneSpeedMultiplier: 1.35,
        droneFireRateMultiplier: 1.4,
        tacticalDirective: 'PURSUIT INTENSIFIED: Interceptors matching speed! High-G turns recommended!',
        emergencyChaffActive: false,
        shieldGateAvailable: false,
        source: 'jev'
      };
    } else if (pDominance < 0.30) {
      return {
        dominanceProbability: pDominance,
        directorZone: 'emergency_lifeline',
        droneSpeedMultiplier: 0.75,
        droneFireRateMultiplier: 0.5,
        tacticalDirective: 'EMERGENCY: Copilot chaff deployed! Divert to low gate to restore hull!',
        emergencyChaffActive: true,
        shieldGateAvailable: true,
        source: 'jev'
      };
    } else {
      return {
        dominanceProbability: pDominance,
        directorZone: 'flow_state',
        droneSpeedMultiplier: 1.0,
        droneFireRateMultiplier: 1.0,
        tacticalDirective: 'DOGFIGHT FLOW: Hostiles in range. Execute tactical roll and fire!',
        emergencyChaffActive: false,
        shieldGateAvailable: false,
        source: 'jev'
      };
    }
  } catch (_err) {
    return computeFallbackPacing(telemetry);
  }
}
