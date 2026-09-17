/**
 * TypeSafe AI (Jev System One) Client for Red Horizon
 * 
 * Provides typed snap judgments and calibrated evaluations.
 * Supports both live evaluation with Jev and robust offline fallbacks.
 */

export interface NoulQuestion {
  type: 'noul';
  instructions: string | Record<string, any>;
  criteria?: {
    true?: string | Record<string, any>;
    false?: string | Record<string, any>;
  };
}

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string | Record<string, any>;
  criteria: Record<string, string | Record<string, any> | null>;
}

export interface ScoreQuestion {
  type: 'score';
  instructions: string | Record<string, any>;
  criteria: Array<string | Record<string, any>>;
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: 'score';
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface SystemOneResponse {
  model: string;
  answers: Record<string, Answer>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface EvaluationOptions {
  state: any;
  questions: Record<string, Question>;
  apiKey?: string;
  timeoutMs?: number;
}

const API_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

function resolveApiKey(explicitKey?: string): string {
  if (explicitKey) return explicitKey;
  const proc = (globalThis as any).process;
  if (proc && proc.env && proc.env.TYPESAFE_API_KEY) {
    return proc.env.TYPESAFE_API_KEY;
  }
  try {
    const metaEnv = (new Function('return typeof import.meta !== "undefined" ? import.meta.env : undefined'))();
    if (metaEnv && metaEnv.VITE_TYPESAFE_API_KEY) {
      return metaEnv.VITE_TYPESAFE_API_KEY;
    }
  } catch (_e) {
    // Ignore in CommonJS/test runners where import.meta is unsupported
  }
  return '';
}

export async function evaluateSystemOne(options: EvaluationOptions): Promise<SystemOneResponse> {
  const apiKey = resolveApiKey(options.apiKey);

  if (!apiKey) {
    throw new Error('TypeSafe API Key is required for live System One evaluation.');
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller && options.timeoutMs 
    ? setTimeout(() => controller.abort(), options.timeoutMs) 
    : null;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: options.state,
        model: 'jev-latest',
        questions: options.questions,
      }),
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TypeSafe API Error ${response.status}: ${errorText}`);
    }

    return (await response.json()) as SystemOneResponse;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
