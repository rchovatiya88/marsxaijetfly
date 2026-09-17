export type FlightAxis = { x: number; y: number };
export type FlightInputSample = {
  active: boolean;
  move: { x: number; y: number; z: number };
  look: FlightAxis;
  boost: boolean;
};

type GamepadLike = {
  axes?: ArrayLike<number>;
  buttons?: ArrayLike<{ pressed?: boolean; value?: number } | number>;
  connected?: boolean;
  mapping?: string;
};

type FlightInputOptions = {
  deadzone?: number;
  getGamepads?: () => ArrayLike<GamepadLike | null> | null | undefined;
  getTouchFlight?: () => TouchFlightLike | null | undefined;
};

type TouchFlightLike = Partial<FlightInputSample> & {
  lookMode?: 'axis' | 'delta';
};

const ZERO_SAMPLE: FlightInputSample = Object.freeze({
  active: false,
  move: Object.freeze({ x: 0, y: 0, z: 0 }),
  look: Object.freeze({ x: 0, y: 0 }),
  boost: false,
});

function axis(value: unknown, deadzone: number): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0;
  const clamped = Math.max(-1, Math.min(1, raw));
  const magnitude = Math.abs(clamped);
  if (magnitude <= deadzone) return 0;
  const scaled = (magnitude - deadzone) / (1 - deadzone);
  return Math.sign(clamped) * scaled;
}

function buttonValue(button: unknown): number {
  if (typeof button === 'number') return button;
  const value = button as { value?: number } | undefined;
  return Number(value?.value || 0);
}

function pressed(button: unknown): boolean {
  const value = button as { pressed?: boolean } | undefined;
  return !!value?.pressed || buttonValue(button) > 0.5;
}

function normalizeMove(move: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const length = Math.hypot(move.x, move.y, move.z);
  if (length <= 1) return move;
  return { x: move.x / length, y: move.y / length, z: move.z / length };
}

export class FlightInputAdapter {
  private readonly deadzone: number;
  private readonly getGamepads?: () => ArrayLike<GamepadLike | null> | null | undefined;
  private readonly getTouchFlight?: () => TouchFlightLike | null | undefined;

  constructor(options: FlightInputOptions = {}) {
    this.deadzone = Math.max(0, Math.min(0.75, options.deadzone ?? 0.18));
    this.getGamepads = options.getGamepads;
    this.getTouchFlight = options.getTouchFlight;
  }

  sampleGamepad(): FlightInputSample {
    const touch = this.sampleTouch();
    if (touch.active) return touch;
    const pads = this.getGamepads?.();
    if (!pads) return ZERO_SAMPLE;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || pad.connected === false) continue;
      const axes = pad.axes || [];
      const buttons = pad.buttons || [];
      const move = normalizeMove({
        x: axis(axes[0], this.deadzone),
        y: (pressed(buttons[5]) ? 1 : 0) - (pressed(buttons[4]) ? 1 : 0),
        z: axis(axes[1], this.deadzone),
      });
      const look = {
        x: axis(axes[2], this.deadzone),
        y: axis(axes[3], this.deadzone),
      };
      const boost = pressed(buttons[10]) || pressed(buttons[0]) || buttonValue(buttons[7]) > 0.5;
      const active = boost || Math.hypot(move.x, move.y, move.z, look.x, look.y) > 0;
      if (active) return { active, move, look, boost };
    }
    return ZERO_SAMPLE;
  }

  private sampleTouch(): FlightInputSample {
    const touch = this.getTouchFlight?.();
    if (!touch) return ZERO_SAMPLE;
    const move = normalizeMove({
      x: axis(touch.move?.x, 0),
      y: axis(touch.move?.y, 0),
      z: axis(touch.move?.z, 0),
    });
    const look = {
      x: axis(touch.look?.x, 0),
      y: axis(touch.look?.y, 0),
    };
    const boost = !!touch.boost;
    const active = !!touch.active || boost || Math.hypot(move.x, move.y, move.z, look.x, look.y) > 0;
    if (touch.lookMode === 'delta' && touch.look) {
      touch.look.x = 0;
      touch.look.y = 0;
      touch.active = boost || Math.hypot(move.x, move.y, move.z) > 0;
    }
    return active ? { active, move, look, boost } : ZERO_SAMPLE;
  }
}

export function createBrowserFlightInputAdapter(globalObject: any = globalThis): FlightInputAdapter {
  const navigatorObject = globalObject?.navigator;
  return new FlightInputAdapter({
    getGamepads: typeof navigatorObject?.getGamepads === 'function' ? () => navigatorObject.getGamepads() : undefined,
    getTouchFlight: () => globalObject?.__RED_HORIZON_TOUCH_FLIGHT__,
  });
}
