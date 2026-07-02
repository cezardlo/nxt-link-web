import assert from 'node:assert/strict';
import test from 'node:test';

import { csvEscape, toCsv } from '@/lib/events/csv';

test('csvEscape passes plain values through', () => {
  assert.equal(csvEscape('hello'), 'hello');
  assert.equal(csvEscape(42), '42');
  assert.equal(csvEscape(null), '');
  assert.equal(csvEscape(undefined), '');
});

test('csvEscape quotes commas, quotes, and newlines', () => {
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('line1\nline2'), '"line1\nline2"');
});

test('csvEscape guards against formula injection', () => {
  assert.equal(csvEscape('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvEscape('+1234'), "'+1234");
  assert.equal(csvEscape('-cmd'), "'-cmd");
  assert.equal(csvEscape('@import'), "'@import");
});

test('csvEscape JSON-encodes arrays and objects', () => {
  assert.equal(csvEscape(['a', 'b']), '"[""a"",""b""]"');
});

test('toCsv writes header + rows with CRLF line endings', () => {
  const rows = [
    { name: 'Expo, West', priority: 'high' },
    { name: 'Chamber mixer', priority: 'low' },
  ];
  const csv = toCsv(rows, [
    { key: 'name', header: 'Name' },
    { key: 'priority' },
  ]);
  assert.equal(csv, 'Name,priority\r\n"Expo, West",high\r\nChamber mixer,low\r\n');
});

test('toCsv with no rows still returns the header', () => {
  const csv = toCsv([] as Array<{ a: string }>, [{ key: 'a' }]);
  assert.equal(csv, 'a\r\n');
});
