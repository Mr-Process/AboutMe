// Copy-Paste-Deploy: Hallucination Loop Circuit Breaker
// Optimized for Apple Silicon / Node 20+ memory efficiency.
// Uses crypto for low-allocation state diffing to avoid GC spikes.
import { createHash } from 'crypto';

class HallucinationBreaker {
  constructor(maxIdenticalStates = 3) {
    this.maxIdenticalStates = maxIdenticalStates;
    this.stateSignatures = new Map();
    this.recursionDepth = 0;
  }

  _hashState(prompt, toolCall) {
    // Fast, memory-efficient hash to avoid storing massive raw strings in the event loop
    return createHash('sha256').update(prompt + JSON.stringify(toolCall)).digest('hex');
  }

  evaluateAgentStep(promptContext, toolCall, reasoning) {
    const signature = this._hashState(promptContext, toolCall);
    const occurrenceCount = (this.stateSignatures.get(signature) || 0) + 1;

    this.stateSignatures.set(signature, occurrenceCount);
    this.recursionDepth++;

    if (occurrenceCount >= this.maxIdenticalStates) {
      this._flushAndAbort(reasoning);
      return {
        status: 'CRITICAL_ABORT',
        reason: 'Hallucination loop detected: Identical state sequence repeated.',
        depth: this.recursionDepth
      };
    }

    return { status: 'PROCEED', hash: signature };
  }

  _flushAndAbort(finalReasoning) {
    // Synchronous emergency flush to ensure log survives container crash
    const payload = JSON.stringify({
      fatal: true,
      depth: this.recursionDepth,
      last_reasoning: finalReasoning,
      state_map: Array.from(this.stateSignatures.entries())
    });
    process.stderr.write(`[AGENT_FATAL] ${payload}\n`);
    this.stateSignatures.clear();
  }
}

export const circuitBreaker = new HallucinationBreaker();
