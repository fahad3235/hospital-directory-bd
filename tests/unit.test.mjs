// hospital-directory-bd - unit tests (node --test tests/unit.test.mjs)
// The app ships as classic <script> files (file://-safe, no ES modules), so
// the tests load the same sources via Function-concatenation instead of import.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = ['js/data.js', 'js/core.js', 'js/i18n.js']
  .map((f) => readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const factory = new Function(src + '\n;return { HOSPITALS, DIVISIONS, EMERGENCY_NUMBERS,'
  + ' filterHospitals, sortHospitals, countByDivision, divisionName, telHref,'
  + ' validateHospital, makeCustomHospital, toggleFavourite, exportBackup,'
  + ' parseImportText, checkBuiltinData, toBnDigits, formatCount,'
  + ' STRINGS, t, serviceLabel, i18nKeys };');
const { HOSPITALS, DIVISIONS, EMERGENCY_NUMBERS,
  filterHospitals, sortHospitals, countByDivision, divisionName, telHref,
  validateHospital, makeCustomHospital, toggleFavourite, exportBackup,
  parseImportText, checkBuiltinData, toBnDigits, formatCount,
  STRINGS, t, serviceLabel, i18nKeys } = factory();

test('builtin data: 24 hospitals, all 8 divisions, integrity clean', () => {
  assert.equal(HOSPITALS.length, 24);
  assert.equal(DIVISIONS.length, 8);
  assert.deepEqual(checkBuiltinData(), []);
  const counts = countByDivision(HOSPITALS);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 24);
  assert.equal(counts.dhaka, 16);
  for (const d of DIVISIONS) assert.ok(counts[d.id] >= 1, d.id + ' empty');
});

test('builtin data: emergency counts and types', () => {
  assert.equal(HOSPITALS.filter((h) => h.emergency24).length, 18);
  assert.equal(HOSPITALS.filter((h) => h.type === 'private').length, 3);
  assert.equal(HOSPITALS.filter((h) => h.category === 'specialized').length, 8);
  assert.equal(HOSPITALS.filter((h) => h.phone).length, 9);
  for (const h of HOSPITALS) {
    assert.ok(h.nameBn.length > 0, h.id + ' missing Bengali name');
    assert.ok(h.services.length > 0, h.id + ' missing services');
  }
});

test('emergency numbers: 999 + 16263 + hotlines', () => {
  assert.equal(EMERGENCY_NUMBERS.length, 4);
  assert.deepEqual(EMERGENCY_NUMBERS.map((n) => n.number), ['999', '16263', '10616', '10678']);
});

test('filter: division', () => {
  assert.equal(filterHospitals(HOSPITALS, { division: 'sylhet' }).length, 1);
  assert.equal(filterHospitals(HOSPITALS, { division: 'chattogram' }).length, 2);
  assert.equal(filterHospitals(HOSPITALS, { division: 'dhaka' }).length, 16);
  assert.equal(filterHospitals(HOSPITALS, {}).length, 24);
});

test('filter: type / category / emergency', () => {
  assert.equal(filterHospitals(HOSPITALS, { type: 'private' }).length, 3);
  assert.equal(filterHospitals(HOSPITALS, { type: 'govt' }).length, 21);
  assert.equal(filterHospitals(HOSPITALS, { category: 'specialized' }).length, 8);
  assert.equal(filterHospitals(HOSPITALS, { emergencyOnly: true }).length, 18);
  assert.equal(filterHospitals(HOSPITALS, { type: 'private', emergencyOnly: true }).length, 3);
});

test('filter: search English + Bengali + service + district', () => {
  assert.equal(filterHospitals(HOSPITALS, { q: 'shishu' }).length, 1);
  assert.equal(filterHospitals(HOSPITALS, { q: 'shishu' })[0].id, 'dsh');
  assert.equal(filterHospitals(HOSPITALS, { q: '\u09b6\u09bf\u09b6\u09c1' }).length, 1);
  assert.equal(filterHospitals(HOSPITALS, { q: 'cardio' }).length, 4);
  assert.equal(filterHospitals(HOSPITALS, { q: 'sylhet' }).length, 1);
  assert.equal(filterHospitals(HOSPITALS, { q: 'SHISHU' }).length, 1);
  assert.equal(filterHospitals(HOSPITALS, { q: 'zzz-no-match' }).length, 0);
  assert.equal(filterHospitals(HOSPITALS, { q: '  ' }).length, 24);
});

test('filter: favourites only', () => {
  assert.equal(filterHospitals(HOSPITALS, { favOnly: true, favs: ['dmch', 'dsh'] }).length, 2);
  assert.equal(filterHospitals(HOSPITALS, { favOnly: true, favs: [] }).length, 0);
});

test('sort: by name and by division', () => {
  const byName = sortHospitals(HOSPITALS, 'name');
  assert.equal(byName[0].id, 'bmu');
  assert.equal(byName[byName.length - 1].id, 'united');
  const byDiv = sortHospitals(HOSPITALS, 'division');
  assert.equal(byDiv[0].division, 'barishal');
  assert.equal(byDiv[byDiv.length - 1].division, 'sylhet');
});

test('divisionName EN/BN', () => {
  assert.equal(divisionName('dhaka', 'en'), 'Dhaka');
  assert.equal(divisionName('dhaka', 'bn'), '\u09a2\u09be\u0995\u09be');
  assert.equal(divisionName('nope', 'en'), 'nope');
});

test('telHref', () => {
  assert.equal(telHref('02-55165001'), 'tel:+880255165001');
  assert.equal(telHref('999'), 'tel:+880999');
  assert.equal(telHref('10616'), 'tel:+88010616');
  assert.equal(telHref(null), null);
  assert.equal(telHref(''), null);
});

test('validateHospital', () => {
  const good = { name: 'Test Hospital', district: 'Dhaka', address: 'Some Road', division: 'dhaka', type: 'govt', category: 'general', phone: '02-55165001', services: ['emergency'] };
  assert.deepEqual(validateHospital(good), []);
  assert.deepEqual(validateHospital({ ...good, phone: '' }), []);
  assert.deepEqual(validateHospital({ ...good, phone: null }), []);
  assert.deepEqual(validateHospital({ ...good, name: 'ab' }), ['name']);
  assert.deepEqual(validateHospital({ ...good, district: '' }), ['district']);
  assert.deepEqual(validateHospital({ ...good, address: 'x' }), ['address']);
  assert.deepEqual(validateHospital({ ...good, division: 'nowhere' }), ['division']);
  assert.deepEqual(validateHospital({ ...good, type: 'military' }), ['type']);
  assert.deepEqual(validateHospital({ ...good, category: 'clinic' }), ['category']);
  assert.deepEqual(validateHospital({ ...good, phone: 'abc' }), ['phone']);
  assert.deepEqual(validateHospital(null), ['invalid']);
});

test('makeCustomHospital', () => {
  const res = makeCustomHospital(
    { name: 'My Clinic', district: 'Gazipur', address: 'Road 1', division: 'dhaka', type: 'private', category: 'general', phone: '', emergency24: true, services: ['medicine'] },
    new Set(HOSPITALS.map((h) => h.id)));
  assert.equal(res.ok, true);
  assert.ok(res.hospital.id.startsWith('custom-'));
  assert.equal(res.hospital.custom, true);
  const bad = makeCustomHospital(
    { name: 'x', district: '', address: '', division: 'dhaka', type: 'govt', category: 'general' },
    new Set());
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.includes('name'));
});

test('toggleFavourite', () => {
  assert.deepEqual(toggleFavourite([], 'dmch'), ['dmch']);
  assert.deepEqual(toggleFavourite(['dmch'], 'dmch'), []);
  assert.deepEqual(toggleFavourite(['dmch'], 'dsh').sort(), ['dmch', 'dsh']);
});

test('export / import round-trip + strict rejection', () => {
  const custom = [{ id: 'custom-abc', name: 'My Clinic', district: 'Gazipur', address: 'Road 1', division: 'dhaka', type: 'private', category: 'general', phone: null, emergency24: false, services: [], custom: true }];
  const backup = exportBackup(custom, ['dmch']);
  assert.equal(backup.app, 'hospital-directory-bd');
  assert.equal(backup.version, 1);
  const ok = parseImportText(JSON.stringify(backup));
  assert.equal(ok.ok, true);
  assert.equal(ok.hospitals.length, 1);
  assert.deepEqual(ok.favourites, ['dmch']);
  assert.equal(parseImportText('not json').ok, false);
  assert.equal(parseImportText(JSON.stringify({ app: 'other', version: 1, hospitals: [], favourites: [] })).ok, false);
  assert.equal(parseImportText(JSON.stringify({ app: 'hospital-directory-bd', version: 99, hospitals: [], favourites: [] })).ok, false);
  assert.equal(parseImportText(JSON.stringify({ app: 'hospital-directory-bd', version: 1, hospitals: [{ name: 'x' }], favourites: [] })).ok, false);
  const dup = JSON.parse(JSON.stringify(backup));
  dup.hospitals.push({ ...custom[0] });
  assert.equal(parseImportText(JSON.stringify(dup)).ok, false);
  const many = JSON.parse(JSON.stringify(backup));
  many.hospitals = Array.from({ length: 201 }, (_, i) => ({ ...custom[0], id: 'custom-' + i }));
  assert.equal(parseImportText(JSON.stringify(many)).ok, false);
  // Empty backup is valid.
  const empty = parseImportText(JSON.stringify({ app: 'hospital-directory-bd', version: 1, hospitals: [], favourites: [] }));
  assert.equal(empty.ok, true);
});

test('Bengali digits', () => {
  assert.equal(toBnDigits(24), '\u09e8\u09ea');
  assert.equal(toBnDigits('999'), '\u09ef\u09ef\u09ef');
  assert.equal(formatCount(18, 'bn'), '\u09e7\u09ee');
  assert.equal(formatCount(18, 'en'), '18');
});

test('i18n: EN and BN key sets match, all non-empty, fallback works', () => {
  const enKeys = Object.keys(STRINGS.en).sort();
  const bnKeys = Object.keys(STRINGS.bn).sort();
  assert.deepEqual(bnKeys, enKeys);
  for (const k of enKeys) {
    assert.ok(STRINGS.en[k].length > 0, 'en.' + k + ' empty');
    assert.ok(STRINGS.bn[k].length > 0, 'bn.' + k + ' empty');
  }
  assert.equal(i18nKeys().length, enKeys.length);
  assert.equal(t('bn', 'app_title'), '\u09b9\u09be\u09b8\u09aa\u09be\u09a4\u09be\u09b2 \u09a1\u09bf\u09b0\u09c7\u0995\u09cd\u099f\u09b0\u09bf \u09ac\u09bf\u09a1\u09bf');
  assert.equal(t('xx', 'app_title'), 'Hospital Directory BD');
  assert.equal(t('en', 'results', { n: 5, s: 's' }), '5 hospitals found');
  assert.equal(t('en', 'results', { n: 1, s: '' }), '1 hospital found');
  assert.equal(serviceLabel('cardiology', 'bn'), '\u09b9\u09c3\u09a6\u09b0\u09cb\u0997');
  assert.equal(serviceLabel('cardiology', 'en'), 'Cardiology');
  assert.equal(serviceLabel('unknown-thing', 'en'), 'unknown-thing');
});
