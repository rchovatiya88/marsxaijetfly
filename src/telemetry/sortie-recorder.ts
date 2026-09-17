/**
 * Sortie Telemetry Recorder for Red Horizon
 * 
 * Captures flight vectors, tactical events, damage spikes, and route decisions.
 * Designed for low-overhead in-game sampling and export to Jev diagnostic tools.
 */

export interface TelemetryPoint {
  timeMs: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  boost: number;
  hull: number;
  shield: number;
}

export interface TelemetryEvent {
  type: 'BOOST_EXHAUSTED' | 'TELEGRAPH_TRIGGERED' | 'DAMAGE_SUSTAINED' | 'GATE_BREACHED' | 'SORTIE_ENDED';
  timeMs: number;
  position: { x: number; y: number; z: number };
  details: Record<string, any>;
}

export interface SortieSummary {
  mode: string;
  route: string;
  won: boolean;
  durationSeconds: number;
  score: number;
  shotsFired: number;
  chargesSpent: number;
  hullLost: number;
  shieldRemaining: number;
  fatalIncident?: {
    timeMs: number;
    position: { x: number; y: number; z: number };
    source: string;
    damage: number;
    distanceToCover: number;
  };
}

export interface SortieTelemetryLog {
  version: 1;
  sortieId: string;
  timestamp: string;
  summary: SortieSummary;
  events: TelemetryEvent[];
  flightPath: TelemetryPoint[];
}

export class SortieRecorder {
  private active = false;
  private sortieId: string = '';
  private startTime = 0;
  private lastSampleTime = 0;
  private sampleIntervalMs = 500; // Sample flight path every 500ms
  private flightPath: TelemetryPoint[] = [];
  private events: TelemetryEvent[] = [];
  private fatalIncident?: SortieSummary['fatalIncident'];

  public startSortie(mode: string): void {
    this.active = true;
    this.sortieId = `sortie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.lastSampleTime = -this.sampleIntervalMs;
    this.flightPath = [];
    this.events = [];
    this.fatalIncident = undefined;
  }

  public isRecording(): boolean {
    return this.active;
  }

  public recordFlightFrame(
    elapsedMs: number,
    position: { x: number; y: number; z: number },
    speed: number,
    boost: number,
    hull: number,
    shield: number
  ): void {
    if (!this.active) return;
    if (elapsedMs - this.lastSampleTime >= this.sampleIntervalMs) {
      this.lastSampleTime = elapsedMs;
      this.flightPath.push({
        timeMs: Math.round(elapsedMs),
        x: Math.round(position.x * 10) / 10,
        y: Math.round(position.y * 10) / 10,
        z: Math.round(position.z * 10) / 10,
        speed: Math.round(speed * 10) / 10,
        boost: Math.round(boost),
        hull: Math.round(hull),
        shield: Math.round(shield)
      });
    }
  }

  public recordEvent(
    type: TelemetryEvent['type'],
    elapsedMs: number,
    position: { x: number; y: number; z: number },
    details: Record<string, any> = {}
  ): void {
    if (!this.active) return;
    const event: TelemetryEvent = {
      type,
      timeMs: Math.round(elapsedMs),
      position: {
        x: Math.round(position.x * 10) / 10,
        y: Math.round(position.y * 10) / 10,
        z: Math.round(position.z * 10) / 10
      },
      details
    };
    this.events.push(event);

    if (type === 'DAMAGE_SUSTAINED' && details.isFatal) {
      this.fatalIncident = {
        timeMs: Math.round(elapsedMs),
        position: event.position,
        source: details.source || 'enemy_projectile',
        damage: details.amount || 0,
        distanceToCover: details.distanceToCover ?? -1
      };
    }
  }

  public finishSortie(summaryData: {
    mode: string;
    route: string;
    won: boolean;
    durationSeconds: number;
    score: number;
    shotsFired: number;
    chargesSpent: number;
    hullLost: number;
    shieldRemaining: number;
  }): SortieTelemetryLog {
    this.active = false;

    const summary: SortieSummary = {
      ...summaryData,
      fatalIncident: this.fatalIncident
    };

    const log: SortieTelemetryLog = {
      version: 1,
      sortieId: this.sortieId,
      timestamp: new Date().toISOString(),
      summary,
      events: [...this.events],
      flightPath: [...this.flightPath]
    };

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('red-horizon-last-telemetry', JSON.stringify(log));
      }
    } catch {
      // Storage limits or private mode; non-blocking
    }

    return log;
  }

  public getFlightPath(): TelemetryPoint[] {
    return this.flightPath;
  }

  public getEvents(): TelemetryEvent[] {
    return this.events;
  }
}

export const activeSortieRecorder = new SortieRecorder();
