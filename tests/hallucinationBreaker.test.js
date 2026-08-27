import test from 'node:test';
import assert from 'node:assert';
import { circuitBreaker } from '../src/hallucinationBreaker.js';

test('HallucinationBreaker', async (t) => {
  await t.test('allows normal tool calls to proceed', () => {
    // Reset state for testing
    circuitBreaker.stateSignatures.clear();
    circuitBreaker.recursionDepth = 0;

    const res1 = circuitBreaker.evaluateAgentStep('context 1', { name: 'toolA' }, 'reasoning A');
    assert.strictEqual(res1.status, 'PROCEED');
    assert.strictEqual(circuitBreaker.recursionDepth, 1);

    const res2 = circuitBreaker.evaluateAgentStep('context 2', { name: 'toolB' }, 'reasoning B');
    assert.strictEqual(res2.status, 'PROCEED');
    assert.strictEqual(circuitBreaker.recursionDepth, 2);
  });

  await t.test('aborts when max identical states are reached', () => {
    // Reset state for testing
    circuitBreaker.stateSignatures.clear();
    circuitBreaker.recursionDepth = 0;

    // Suppress stderr during test to avoid noisy logs
    const originalWrite = process.stderr.write;
    process.stderr.write = () => {};

    const promptContext = 'same context';
    const toolCall = { name: 'repeatTool' };
    const reasoning = 'same reasoning';

    // Step 1
    const res1 = circuitBreaker.evaluateAgentStep(promptContext, toolCall, reasoning);
    assert.strictEqual(res1.status, 'PROCEED');

    // Step 2
    const res2 = circuitBreaker.evaluateAgentStep(promptContext, toolCall, reasoning);
    assert.strictEqual(res2.status, 'PROCEED');

    // Step 3 - This should trip the maxIdenticalStates (default is 3)
    const res3 = circuitBreaker.evaluateAgentStep(promptContext, toolCall, reasoning);
    assert.strictEqual(res3.status, 'CRITICAL_ABORT');
    assert.strictEqual(res3.reason, 'Hallucination loop detected: Identical state sequence repeated.');

    // State should be cleared after flush
    assert.strictEqual(circuitBreaker.stateSignatures.size, 0);

    // Restore stderr
    process.stderr.write = originalWrite;
  });
});
