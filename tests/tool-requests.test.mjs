import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeToolRequest } from '../commerce/tool-requests.mjs';

test('tool requests preserve the requested name, detail, priority and contact number', () => {
  assert.deepEqual(
    normalizeToolRequest({
      toolName: ' Runway ',
      requirement: 'I need a one-month Pro plan for video generation.',
      priority: 'URGENT',
      contactNumber: '+92 311 6185711',
    }),
    {
      toolName: 'Runway',
      requirement: 'I need a one-month Pro plan for video generation.',
      priority: 'urgent',
      contactNumber: '+92 311 6185711',
    },
  );
});

test('tool requests reject incomplete details, unknown priority and invalid contact numbers', () => {
  assert.throws(
    () => normalizeToolRequest({ toolName: 'AI tool', requirement: 'Short', priority: 'low', contactNumber: '+923116185711' }),
    /Describe what you need/,
  );
  assert.throws(
    () => normalizeToolRequest({ toolName: 'AI tool', requirement: 'I need a monthly plan with one seat.', priority: 'normal', contactNumber: '+923116185711' }),
    /valid request priority/,
  );
  assert.throws(
    () => normalizeToolRequest({ toolName: 'AI tool', requirement: 'I need a monthly plan with one seat.', priority: 'moderate', contactNumber: '123' }),
    /valid contact number/,
  );
});
