// Run: node lib/report/issue-url.test.ts   (Node >=22.18 strips types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueUrl, scrubNote } from './issue-url.ts';

test('builds a github new-issue URL with the staleness label', () => {
  const url = buildIssueUrl({ refId: 'spokeo', kind: 'broker', label: 'Spokeo' });
  const u = new URL(url);
  assert.equal(u.origin, 'https://github.com');
  assert.equal(u.pathname, '/morgancollado/self-audit-tool/issues/new');
  assert.equal(u.searchParams.get('labels'), 'content-staleness');
  assert.match(u.searchParams.get('title') ?? '', /\[stale\] broker: Spokeo \(spokeo\)/);
});

test('carries the warning and never the placeholder PII', () => {
  const url = buildIssueUrl({ refId: 'spokeo', kind: 'broker', label: 'Spokeo' });
  const body = new URL(url).searchParams.get('body') ?? '';
  assert.match(body, /do NOT include your name, deadname/);
});

test('scrubNote strips emails and long digit runs', () => {
  assert.equal(scrubNote('reach me at jane@example.com please'), 'reach me at [removed] please');
  assert.equal(scrubNote('my number is 415-555-0199 ok'), 'my number is [removed] ok');
});

test('scrubNote is applied inside the built body', () => {
  const url = buildIssueUrl({ refId: 'x', kind: 'broker', label: 'X', note: 'email a@b.co here' });
  const body = new URL(url).searchParams.get('body') ?? '';
  assert.match(body, /\[removed\] here/);
  assert.doesNotMatch(body, /a@b\.co/);
});

test('note is length-capped', () => {
  const long = 'a'.repeat(5000);
  assert.ok(scrubNote(long).length <= 1000);
});
