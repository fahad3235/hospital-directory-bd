// hospital-directory-bd \u2014 pure logic (no DOM). Testable with node --test.

const DIVISION_IDS = DIVISIONS.map((d) => d.id);
const TYPES = ['govt', 'private'];
const CATEGORIES = ['general', 'specialized'];

// Bangladeshi landline / short-code pattern: digits, optional leading 02-,
// spaces or dashes allowed. Short codes (999, 10616) are digits only.
const PHONE_RE = /^(0\d[-\s]?\d{7,8}|\d{3,5})$/;

function normaliseQuery(q) {
  return (q || '').trim().toLowerCase();
}

// Search matches name, Bengali name, district, address and service keys.
function matchesQuery(h, q) {
  const needle = normaliseQuery(q);
  if (!needle) return true;
  const hay = [
    h.name, h.nameBn, h.district, h.address, h.division,
    ...(h.services || []),
  ].join(' ').toLowerCase();
  return hay.includes(needle);
}

function filterHospitals(list, f = {}) {
  const { q = '', division = 'all', type = 'all', category = 'all',
    emergencyOnly = false, favOnly = false, favs = [] } = f;
  const favSet = new Set(favs);
  return list.filter((h) => {
    if (!matchesQuery(h, q)) return false;
    if (division !== 'all' && h.division !== division) return false;
    if (type !== 'all' && h.type !== type) return false;
    if (category !== 'all' && h.category !== category) return false;
    if (emergencyOnly && !h.emergency24) return false;
    if (favOnly && !favSet.has(h.id)) return false;
    return true;
  });
}

function sortHospitals(list, key = 'name') {
  const copy = [...list];
  if (key === 'division') {
    copy.sort((a, b) =>
      a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  return copy;
}

function countByDivision(list) {
  const counts = {};
  for (const d of DIVISION_IDS) counts[d] = 0;
  for (const h of list) {
    if (h.division in counts) counts[h.division] += 1;
    else counts[h.division] = 1;
  }
  return counts;
}

function divisionName(divisionId, lang = 'en') {
  const d = DIVISIONS.find((x) => x.id === divisionId);
  if (!d) return divisionId;
  return lang === 'bn' ? d.bn : d.en;
}

function telHref(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return 'tel:+880' + digits.replace(/^0/, '');
}

function validateHospital(h) {
  const errors = [];
  if (!h || typeof h !== 'object') return ['invalid'];
  if (!h.name || typeof h.name !== 'string' || h.name.trim().length < 3) errors.push('name');
  if (!h.district || typeof h.district !== 'string' || h.district.trim().length < 2) errors.push('district');
  if (!h.address || typeof h.address !== 'string' || h.address.trim().length < 3) errors.push('address');
  if (!DIVISION_IDS.includes(h.division)) errors.push('division');
  if (!TYPES.includes(h.type)) errors.push('type');
  if (!CATEGORIES.includes(h.category)) errors.push('category');
  if (h.phone != null && h.phone !== '' && !PHONE_RE.test(String(h.phone).trim())) errors.push('phone');
  if (h.services != null && (!Array.isArray(h.services) || h.services.some((s) => typeof s !== 'string'))) errors.push('services');
  return errors;
}

function makeCustomHospital(input, existingIds) {
  const errors = validateHospital(input);
  if (errors.length) return { ok: false, errors };
  let id = 'custom-' + Date.now().toString(36);
  if (existingIds.has(id)) id += '-' + Math.floor(Math.random() * 1000);
  const h = {
    id,
    name: input.name.trim(),
    nameBn: (input.nameBn || '').trim(),
    type: input.type,
    category: input.category,
    division: input.division,
    district: input.district.trim(),
    address: input.address.trim(),
    phone: input.phone ? String(input.phone).trim() : null,
    emergency24: !!input.emergency24,
    services: (input.services || []).map((s) => s.trim()).filter(Boolean),
    custom: true,
  };
  return { ok: true, hospital: h };
}

function toggleFavourite(favs, id) {
  const set = new Set(favs);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}

function exportBackup(custom, favs) {
  return {
    app: APP_ID,
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    hospitals: custom,
    favourites: favs,
  };
}

// Strict import: only user-added hospitals and favourites; built-ins are
// never overwritten. Returns {ok, hospitals, favourites} or {ok:false, error}.
function validateImport(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'not-object' };
  if (parsed.app !== APP_ID) return { ok: false, error: 'wrong-app' };
  if (parsed.version !== DATA_VERSION) return { ok: false, error: 'wrong-version' };
  if (!Array.isArray(parsed.hospitals)) return { ok: false, error: 'bad-hospitals' };
  if (parsed.hospitals.length > 200) return { ok: false, error: 'too-many' };
  if (!Array.isArray(parsed.favourites)) return { ok: false, error: 'bad-favourites' };
  for (const h of parsed.hospitals) {
    if (validateHospital(h).length) return { ok: false, error: 'bad-hospital' };
  }
  const ids = new Set(parsed.hospitals.map((h) => h.id));
  if (ids.size !== parsed.hospitals.length) return { ok: false, error: 'dup-id' };
  return {
    ok: true,
    hospitals: parsed.hospitals.map((h) => ({ ...h, custom: true })),
    favourites: parsed.favourites.filter((f) => typeof f === 'string'),
  };
}

function parseImportText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'bad-json' };
  }
  return validateImport(parsed);
}

// Built-in data integrity checks (used by unit tests and the app's self-check).
function checkBuiltinData() {
  const problems = [];
  const ids = new Set();
  for (const h of HOSPITALS) {
    if (ids.has(h.id)) problems.push('dup-id:' + h.id);
    ids.add(h.id);
    const errs = validateHospital(h);
    if (errs.length) problems.push(h.id + ':' + errs.join(','));
    if (!h.nameBn) problems.push(h.id + ':missing-nameBn');
    if (!Array.isArray(h.services) || h.services.length === 0) problems.push(h.id + ':no-services');
  }
  for (const d of DIVISION_IDS) {
    if (!HOSPITALS.some((h) => h.division === d)) problems.push('empty-division:' + d);
  }
  return problems;
}

// Bengali digits for display when lang === 'bn'.
const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
function toBnDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

function formatCount(n, lang) {
  return lang === 'bn' ? toBnDigits(n) : String(n);
}
