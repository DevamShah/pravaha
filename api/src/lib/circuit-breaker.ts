/**
 * Circuit Breaker for data source health management.
 *
 * States:
 *   CLOSED (healthy)  → requests pass through
 *   OPEN (unhealthy)  → requests blocked, waiting for cooldown
 *   HALF_OPEN         → one test request allowed to check recovery
 */

export interface SourceState {
  name: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  avgLatencyMs: number;
  unhealthyUntil: Date | null;
  totalRequests: number;
  totalFailures: number;
}

const THRESHOLD = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? "3", 10);
const COOLDOWN_MS = parseInt(process.env.CIRCUIT_BREAKER_COOLDOWN_MS ?? "300000", 10);

const sources = new Map<string, SourceState>();

function getOrCreate(name: string): SourceState {
  let state = sources.get(name);
  if (!state) {
    state = {
      name,
      isHealthy: true,
      consecutiveFailures: 0,
      lastSuccess: null,
      lastFailure: null,
      avgLatencyMs: 0,
      unhealthyUntil: null,
      totalRequests: 0,
      totalFailures: 0,
    };
    sources.set(name, state);
  }
  return state;
}

export function isSourceHealthy(name: string): boolean {
  const state = getOrCreate(name);

  if (state.isHealthy) return true;

  // Check if cooldown has elapsed (half-open: allow one request)
  if (state.unhealthyUntil && new Date() >= state.unhealthyUntil) {
    return true; // Let one request through to test
  }

  return false;
}

export function recordSuccess(name: string, latencyMs: number): void {
  const state = getOrCreate(name);
  state.consecutiveFailures = 0;
  state.isHealthy = true;
  state.lastSuccess = new Date();
  state.unhealthyUntil = null;
  state.totalRequests++;

  // Exponential moving average for latency
  if (state.avgLatencyMs === 0) {
    state.avgLatencyMs = latencyMs;
  } else {
    state.avgLatencyMs = Math.round(state.avgLatencyMs * 0.7 + latencyMs * 0.3);
  }
}

export function recordFailure(name: string): void {
  const state = getOrCreate(name);
  state.consecutiveFailures++;
  state.lastFailure = new Date();
  state.totalRequests++;
  state.totalFailures++;

  if (state.consecutiveFailures >= THRESHOLD) {
    state.isHealthy = false;
    state.unhealthyUntil = new Date(Date.now() + COOLDOWN_MS);
    console.warn(
      `[CircuitBreaker] Source "${name}" marked UNHEALTHY after ${state.consecutiveFailures} failures. Cooldown until ${state.unhealthyUntil.toISOString()}`
    );
  }
}

export function getAllSourceStates(): SourceState[] {
  // Ensure all known sources exist
  for (const name of ["fixtweet", "playwright", "syndication"]) {
    getOrCreate(name);
  }
  return Array.from(sources.values());
}

export function getSourceState(name: string): SourceState {
  return getOrCreate(name);
}
