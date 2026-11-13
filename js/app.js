// hospital-directory-bd \u2014 UI wiring (browser only).

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  lang: 'en',
  q: '',
  division: 'all',
  type: 'all',
  category: 'all',
  emergencyOnly: false,
  favOnly: false,
  sort: 'name',
  custom: [],
  favs: [],
  editingId: null,
};

function loadState() {
  try {
    state.lang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
    if (!['en', 'bn'].includes(state.lang)) state.lang = 'en';
    state.custom = JSON.parse(localStorage.getItem(STORAGE_KEYS.custom) || '[]');
    state.favs = JSON.parse(localStorage.getItem(STORAGE_KEYS.favs) || '[]');
    if (!Array.isArray(state.custom)) state.custom = [];
    if (!Array.isArray(state.favs)) state.favs = [];
    // Drop any custom entry that fails validation (e.g. hand-edited storage).
    state.custom = state.custom.filter((h) => validateHospital(h).length === 0);
  } catch {
    state.custom = [];
    state.favs = [];
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.lang, state.lang);
  localStorage.setItem(STORAGE_KEYS.custom, JSON.stringify(state.custom));
  localStorage.setItem(STORAGE_KEYS.favs, JSON.stringify(state.favs));
}

function allHospitals() {
  return [...HOSPITALS, ...state.custom];
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function applyI18n() {
  document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
  $$('[data-i18n]').forEach((el) => {
    el.textContent = t(state.lang, el.dataset.i18n);
  });
  $$('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(state.lang, el.dataset.i18nPh);
  });
  $('#langToggle').textContent = state.lang === 'bn' ? 'English' : '\u09ac\u09be\u0982\u09b2\u09be';
  // Rebuild division <select> options (labels are localised).
  const sel = $('#fDivision');
  const cur = sel.value;
  sel.innerHTML = `<option value="all">${esc(t(state.lang, 'all_divisions'))}</option>` +
    DIVISIONS.map((d) => `<option value="${d.id}">${esc(state.lang === 'bn' ? d.bn : d.en)}</option>`).join('');
  sel.value = cur;
  const fsel = $('#fDivisionForm');
  if (fsel) {
    const fcur = fsel.value || 'dhaka';
    fsel.innerHTML = DIVISIONS.map((d) => `<option value="${d.id}">${esc(state.lang === 'bn' ? d.bn : d.en)}</option>`).join('');
    fsel.value = fcur;
  }
}

function renderStats() {
  const list = allHospitals();
  const counts = countByDivision(list);
  $('#statTotal').textContent = formatCount(list.length, state.lang);
  $('#statDivisions').textContent = formatCount(
    DIVISIONS.filter((d) => counts[d.id] > 0).length, state.lang);
  $('#statEmergency').textContent = formatCount(
    list.filter((h) => h.emergency24).length, state.lang);
  // Per-division chips.
  $('#divChips').innerHTML = DIVISIONS.map((d) =>
    `<button class="chip${state.division === d.id ? ' active' : ''}" data-div="${d.id}">${esc(state.lang === 'bn' ? d.bn : d.en)} \u00b7 ${formatCount(counts[d.id], state.lang)}</button>`
  ).join('');
  $$('#divChips .chip').forEach((chip) => chip.addEventListener('click', () => {
    state.division = state.division === chip.dataset.div ? 'all' : chip.dataset.div;
    $('#fDivision').value = state.division;
    render();
  }));
}

function cardHtml(h) {
  const fav = state.favs.includes(h.id);
  const phone = h.phone
    ? `<a class="phone" href="${esc(telHref(h.phone))}">${esc(h.phone)} <span class="call-tag">${esc(t(state.lang, 'call'))} \u2197</span></a>`
    : `<span class="phone-missing">${esc(t(state.lang, 'phone_not_listed'))}</span>`;
  const services = (h.services || []).map((s) =>
    `<span class="tag">${esc(serviceLabel(s, state.lang))}</span>`).join('');
  const displayName = state.lang === 'bn' && h.nameBn ? h.nameBn : h.name;
  const subName = state.lang === 'bn' ? h.name : (h.nameBn || '');
  return `<article class="card" data-id="${esc(h.id)}">
    <div class="card-top">
      <div>
        <h3>${esc(displayName)}</h3>
        ${subName ? `<div class="sub-name">${esc(subName)}</div>` : ''}
      </div>
      <button class="fav-btn${fav ? ' active' : ''}" data-fav="${esc(h.id)}" aria-label="${esc(t(state.lang, 'favourite'))}" title="${esc(t(state.lang, 'favourite'))}">${fav ? '\u2605' : '\u2606'}</button>
    </div>
    <div class="badges">
      <span class="badge ${h.type}">${esc(t(state.lang, h.type === 'govt' ? 'type_govt' : 'type_private'))}</span>
      <span class="badge">${esc(t(state.lang, h.category === 'general' ? 'cat_general' : 'cat_specialized'))}</span>
      <span class="badge">${esc(divisionName(h.division, state.lang))} \u00b7 ${esc(h.district)}</span>
      ${h.emergency24 ? `<span class="badge emerg">${esc(t(state.lang, 'emergency_24h'))}</span>` : ''}
      ${h.custom ? `<span class="badge custom">${esc(t(state.lang, 'custom_badge'))}</span>` : ''}
    </div>
    <p class="addr">\ud83d\udccd ${esc(h.address)}</p>
    <p class="phone-row">\ud83d\udcde ${phone}</p>
    ${services ? `<div class="tags"><span class="tags-label">${esc(t(state.lang, 'services'))}:</span> ${services}</div>` : ''}
    ${h.custom ? `<div class="card-actions">
      <button class="btn small" data-edit="${esc(h.id)}">${esc(t(state.lang, 'edit'))}</button>
      <button class="btn small danger" data-del="${esc(h.id)}">${esc(t(state.lang, 'delete'))}</button>
    </div>` : ''}
  </article>`;
}

function render() {
  applyI18n();
  renderStats();
  const filtered = sortHospitals(filterHospitals(allHospitals(), {
    q: state.q, division: state.division, type: state.type,
    category: state.category, emergencyOnly: state.emergencyOnly,
    favOnly: state.favOnly, favs: state.favs,
  }), state.sort);
  const total = allHospitals().length;
  $('#resultCount').textContent = t(state.lang, 'results', {
    n: formatCount(filtered.length, state.lang),
    s: state.lang === 'bn' ? '' : (filtered.length === 1 ? '' : 's'),
  });
  $('#customNote').textContent = state.custom.length
    ? t(state.lang, 'showing_custom', { n: formatCount(state.custom.length, state.lang) })
    : '';
  const grid = $('#results');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">
      <p class="empty-title">${esc(t(state.lang, 'no_results'))}</p>
      <p>${esc(t(state.lang, 'no_results_hint'))}</p>
      <button class="btn" id="emptyAdd">${esc(t(state.lang, 'add_hospital'))}</button>
    </div>`;
    $('#emptyAdd').addEventListener('click', () => openForm());
  } else {
    grid.innerHTML = filtered.map(cardHtml).join('');
  }
  $$('[data-fav]').forEach((b) => b.addEventListener('click', () => {
    state.favs = toggleFavourite(state.favs, b.dataset.fav);
    saveState();
    render();
  }));
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openForm(b.dataset.edit)));
  $$('[data-del]').forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm(t(state.lang, 'confirm_delete'))) return;
    state.custom = state.custom.filter((h) => h.id !== b.dataset.del);
    state.favs = state.favs.filter((f) => f !== b.dataset.del);
    saveState();
    showToast(t(state.lang, 'deleted'));
    render();
  }));
}

function renderEmergency() {
  $('#emergencyList').innerHTML = EMERGENCY_NUMBERS.map((n) => `
    <a class="emg-card" href="tel:${esc(n.number)}">
      <span class="emg-num">${esc(n.number)}</span>
      <span class="emg-name">${esc(state.lang === 'bn' ? n.nameBn : n.nameEn)}</span>
      <span class="emg-note">${esc(state.lang === 'bn' ? n.noteBn : n.noteEn)}</span>
      <span class="emg-call">${esc(t(state.lang, 'call'))} \u2197</span>
    </a>`).join('');
}

let toastTimer = null;
function showToast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

function openForm(editId = null) {
  state.editingId = editId;
  const h = editId ? state.custom.find((x) => x.id === editId) : null;
  $('#formTitle').textContent = t(state.lang, editId ? 'edit_form_title' : 'add_form_title');
  $('#fName').value = h?.name || '';
  $('#fNameBn').value = h?.nameBn || '';
  $('#fDivisionForm').value = h?.division || 'dhaka';
  $('#fDistrict').value = h?.district || '';
  $('#fAddress').value = h?.address || '';
  $('#fPhone').value = h?.phone || '';
  $('#fTypeForm').value = h?.type || 'govt';
  $('#fCategoryForm').value = h?.category || 'general';
  $('#fServices').value = (h?.services || []).join(', ');
  $('#fEmergencyForm').checked = !!h?.emergency24;
  $$('.field-error').forEach((e) => { e.textContent = ''; });
  $('#formDialog').showModal();
}

function submitForm() {
  const input = {
    name: $('#fName').value,
    nameBn: $('#fNameBn').value,
    division: $('#fDivisionForm').value,
    district: $('#fDistrict').value,
    address: $('#fAddress').value,
    phone: $('#fPhone').value,
    type: $('#fTypeForm').value,
    category: $('#fCategoryForm').value,
    emergency24: $('#fEmergencyForm').checked,
    services: $('#fServices').value.split(',').map((s) => s.trim()).filter(Boolean),
  };
  const errors = validateHospital(input);
  $$('.field-error').forEach((e) => { e.textContent = ''; });
  if (errors.length) {
    for (const key of errors) {
      const el = document.querySelector(`[data-err="${key}"]`);
      if (el) el.textContent = t(state.lang, 'err_' + key);
    }
    return;
  }
  if (state.editingId) {
    const i = state.custom.findIndex((x) => x.id === state.editingId);
    if (i >= 0) {
      state.custom[i] = { ...state.custom[i], ...input, phone: input.phone || null };
    }
    showToast(t(state.lang, 'updated'));
  } else {
    const res = makeCustomHospital(input, new Set(allHospitals().map((h) => h.id)));
    if (!res.ok) return;
    state.custom.push(res.hospital);
    showToast(t(state.lang, 'added'));
  }
  saveState();
  $('#formDialog').close();
  render();
}

function bindEvents() {
  $('#langToggle').addEventListener('click', () => {
    state.lang = state.lang === 'bn' ? 'en' : 'bn';
    saveState();
    renderEmergency();
    render();
  });
  $('#fSearch').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('#fDivision').addEventListener('change', (e) => { state.division = e.target.value; render(); });
  $('#fType').addEventListener('change', (e) => { state.type = e.target.value; render(); });
  $('#fCategory').addEventListener('change', (e) => { state.category = e.target.value; render(); });
  $('#fSort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('#fEmergency').addEventListener('change', (e) => { state.emergencyOnly = e.target.checked; render(); });
  $('#fFavOnly').addEventListener('change', (e) => { state.favOnly = e.target.checked; render(); });
  $('#clearFilters').addEventListener('click', () => {
    state.q = ''; state.division = 'all'; state.type = 'all'; state.category = 'all';
    state.emergencyOnly = false; state.favOnly = false; state.sort = 'name';
    $('#fSearch').value = ''; $('#fDivision').value = 'all'; $('#fType').value = 'all';
    $('#fCategory').value = 'all'; $('#fSort').value = 'name';
    $('#fEmergency').checked = false; $('#fFavOnly').checked = false;
    render();
  });
  $('#addBtn').addEventListener('click', () => openForm());
  $('#saveForm').addEventListener('click', submitForm);
  $('#cancelForm').addEventListener('click', () => $('#formDialog').close());
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportBackup(state.custom, state.favs), null, 2)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = APP_ID + '-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(t(state.lang, 'exported'));
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const res = parseImportText(text);
    if (!res.ok) { showToast(t(state.lang, 'import_error')); e.target.value = ''; return; }
    state.custom = res.hospitals;
    state.favs = res.favourites;
    saveState();
    showToast(t(state.lang, 'imported_ok'));
    e.target.value = '';
    render();
  });
  $('#resetBtn').addEventListener('click', () => {
    if (!window.confirm(t(state.lang, 'reset_confirm'))) return;
    state.custom = [];
    state.favs = [];
    saveState();
    render();
  });
}

function init() {
  loadState();
  const problems = checkBuiltinData();
  if (problems.length) console.error('builtin data problems:', problems);
  // Populate the form's division select (localised labels).
  $('#fDivisionForm').innerHTML = DIVISIONS.map((d) =>
    `<option value="${d.id}">${esc(state.lang === 'bn' ? d.bn : d.en)}</option>`).join('');
  bindEvents();
  renderEmergency();
  render();
}

document.addEventListener('DOMContentLoaded', init);
