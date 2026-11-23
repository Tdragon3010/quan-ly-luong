// Tiện ích giao diện dùng chung: định dạng, icon, thông báo, hộp thoại, form
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat('vi-VN');
export const num = (n) => nf.format(Number(n) || 0);
export const money = (n) => `${nf.format(Math.round(Number(n) || 0))} đ`;
export const millions = (n) => `${(Number(n) / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
export const dateVN = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');
export const timeHM = (s) => (s ? s.slice(0, 5) : '');

export const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="img/icons.svg#${name}"/></svg>`;

export const TRANG_THAI_CC = {
  DiLam: { text: 'Đi làm', cls: 'ok' },
  DiMuon: { text: 'Đi muộn', cls: 'warn' },
  NghiPhep: { text: 'Nghỉ phép', cls: 'info' },
  NghiKhongPhep: { text: 'Nghỉ không phép', cls: 'bad' },
};
export const chipCC = (tt) => (tt ? `<span class="chip ${TRANG_THAI_CC[tt].cls}">${TRANG_THAI_CC[tt].text}</span>` : '<span class="chip neutral">Chưa chấm</span>');
export const chipNV = (tt) => (tt === 'DangLam' ? '<span class="chip ok">Đang làm</span>' : '<span class="chip neutral">Đã nghỉ</span>');
export const chipTP = (loai) => (loai === 'Thuong' ? '<span class="chip ok">Thưởng</span>' : '<span class="chip bad">Phạt</span>');

export const monthOptions = (sel) => Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${+sel === i + 1 ? 'selected' : ''}>Tháng ${i + 1}</option>`).join('');
export const yearOptions = (sel) => [2024, 2025, 2026, 2027].map((y) => `<option ${+sel === y ? 'selected' : ''}>${y}</option>`).join('');
export const options = (list, valueKey, textKey, sel, empty) =>
  (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '') +
  list.map((o) => `<option value="${esc(o[valueKey])}" ${String(o[valueKey]) === String(sel ?? '') ? 'selected' : ''}>${esc(o[textKey])}</option>`).join('');

// ---------------- Thông báo nổi ----------------
export function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'bad' ? 'bad' : ''}`;
  el.innerHTML = `${icon(type === 'bad' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), type === 'bad' ? 6000 : 3200);
}

// ---------------- Hộp thoại ----------------
const dlg = () => document.getElementById('dialog');

export function openDialog({ title, body, footer = '', wide = false }) {
  const d = dlg();
  d.className = `dialog ${wide ? 'wide' : ''}`;
  d.innerHTML = `
    <div class="dlg-head">
      <h2 id="dialogTitle">${esc(title)}</h2>
      <button class="icon-btn" data-close aria-label="Đóng">${icon('close')}</button>
    </div>
    <div class="dlg-body">${body}</div>
    ${footer ? `<div class="dlg-foot">${footer}</div>` : ''}`;
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
  if (!d.open) d.showModal();
  return d;
}
export const closeDialog = () => dlg().open && dlg().close();

export function confirmDialog(message, { title = 'Xác nhận', okText = 'Xóa', danger = true } = {}) {
  return new Promise((resolve) => {
    const d = openDialog({
      title,
      body: `<p>${message}</p>`,
      footer: `<button class="btn" data-close>Hủy</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(okText)}</button>`,
    });
    let ok = false;
    d.querySelector('[data-ok]').addEventListener('click', () => { ok = true; d.close(); });
    d.querySelector('[data-ok]').focus();
    d.addEventListener('close', () => resolve(ok), { once: true });
  });
}

// ---------------- Form trong hộp thoại ----------------
// fields: [{ name, label, type, options:[{value,text}], required, full, hint, value, min, step, readonly }]
export function formDialog({ title, fields, values = {}, submitText = 'Lưu', onSubmit, wide = false }) {
  const fieldHtml = (f) => {
    const v = values[f.name] ?? f.value ?? '';
    const id = `f_${f.name}`;
    const common = `id="${id}" name="${f.name}" class="input" ${f.required ? 'required aria-required="true"' : ''} ${f.readonly ? 'readonly' : ''} aria-describedby="${id}_err"`;
    let control;
    if (f.type === 'select') {
      control = `<select ${common}>${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ''}${f.options.map((o) =>
        `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.text)}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea') {
      control = `<textarea ${common} rows="3">${esc(v)}</textarea>`;
    } else {
      control = `<input ${common} type="${f.type || 'text'}" value="${esc(v)}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${f.pattern ? `pattern="${f.pattern}"` : ''} autocomplete="off">`;
    }
    return `<div class="field ${f.full ? 'full' : ''}">
      <label for="${id}">${esc(f.label)}${f.required ? ' <span aria-hidden="true" style="color:var(--bad)">*</span>' : ''}</label>
      ${control}
      ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
      <span class="err" id="${id}_err"></span>
    </div>`;
  };

  const d = openDialog({
    title, wide,
    body: `<form id="dlgForm" novalidate><div class="form-error" hidden></div><div class="form-grid">${fields.map(fieldHtml).join('')}</div></form>`,
    footer: `<button class="btn" type="button" data-close>Hủy</button><button class="btn primary" type="submit" form="dlgForm">${esc(submitText)}</button>`,
  });
  const form = d.querySelector('form');
  const errBox = form.querySelector('.form-error');
  setTimeout(() => form.querySelector('input:not([readonly]), select, textarea')?.focus(), 30);

  const setErr = (name, msg) => {
    const el = form.elements[name];
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    form.querySelector(`#f_${name}_err`).textContent = msg || '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    let ok = true;
    const data = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      let v = el.value.trim();
      let msg = '';
      if (f.required && v === '') msg = 'Vui lòng nhập trường này';
      else if (v !== '' && f.type === 'number' && Number.isNaN(Number(v))) msg = 'Phải là số';
      else if (v !== '' && f.type === 'number' && f.min !== undefined && Number(v) < f.min) msg = `Phải từ ${num(f.min)} trở lên`;
      else if (v !== '' && f.type === 'email' && !el.checkValidity()) msg = 'Email không hợp lệ';
      else if (v !== '' && f.pattern && !new RegExp(`^(?:${f.pattern})$`).test(v)) msg = f.patternMsg || 'Định dạng không hợp lệ';
      else if (f.validate) msg = f.validate(v, form) || '';
      setErr(f.name, msg);
      if (msg) ok = false;
      if (f.readonly) continue;
      data[f.name] = f.type === 'number' && v !== '' ? Number(v) : v === '' ? (f.emptyNull ? null : undefined) : v;
    }
    if (!ok) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const btn = d.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await onSubmit(JSON.parse(JSON.stringify(data)));
      d.close();
    } catch (err) {
      errBox.innerHTML = `${icon('alert')}<span>${esc(err.message)}</span>`;
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
  return d;
}

// Bảng: cột [{ key, label, cls, render(row), sortValue(row), sort: false }]
// sortBy: nhãn cột sắp mặc định (mặc định là "Mã NV" nếu bảng có cột này), sortDir: 1 tăng / -1 giảm
export function table(cols, rows, { empty = 'Không có dữ liệu', rowAttr, foot, sortBy = 'Mã NV', sortDir = 1 } = {}) {
  if (!rows.length) return `<div class="empty">${esc(empty)}</div>`;
  const key = tableKey(cols);
  if (!sortState.has(key) && sortBy) {
    const i = cols.findIndex((c) => stripTags(c.label) === sortBy);
    if (i >= 0) sortState.set(key, { col: i, dir: sortDir });
  }
  const st = sortState.get(key);
  const sorted = rows.map((r) => ({
    r,
    keys: cols.map((c) => (c.sortValue ? c.sortValue(r) : c.key ? r[c.key] : c.render ? stripTags(c.render(r)) : '')),
  }));
  if (st) sorted.sort((a, b) => st.dir * compare(a.keys[st.col], b.keys[st.col]));
  return `<div class="table-wrap"><table class="tbl" data-sort-key="${esc(key)}">
    <thead><tr>${cols.map((c, i) => {
      if (!sortable(c)) return `<th class="${c.cls || ''}" scope="col">${c.label}</th>`;
      const on = st && st.col === i;
      return `<th class="${c.cls || ''}" scope="col" aria-sort="${on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">
        <button type="button" class="th-sort" data-sort-col="${i}" title="Sắp xếp theo ${esc(stripTags(c.label))}">${c.label}<span class="sort-ind" aria-hidden="true">${on ? (st.dir > 0 ? '▲' : '▼') : '↕'}</span></button></th>`;
    }).join('')}</tr></thead>
    <tbody>${sorted.map(({ r, keys }) => `<tr ${rowAttr ? rowAttr(r) : ''}>${cols.map((c, i) =>
      `<td class="${c.cls || ''}" data-sv="${esc(keys[i])}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>
    ${foot ? `<tfoot><tr>${foot}</tr></tfoot>` : ''}
  </table></div>`;
}

// ---------------- Sắp xếp theo cột ----------------
// Bấm tiêu đề cột: tăng dần, bấm lần nữa: giảm dần. Trạng thái được nhớ theo trang + bảng,
// nên lọc lại hoặc tải lại dữ liệu vẫn giữ thứ tự đang chọn.
const sortState = new Map();
const stripTags = (h) => String(h ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const sortable = (c) => c.sort !== false && !/sr-only/.test(c.label) && stripTags(c.label) !== '' && stripTags(c.label) !== '#';
const tableKey = (cols) => `${location.hash}|${cols.map((c) => stripTags(c.label)).join('|')}`;

// Chuẩn hóa giá trị để so sánh: số (kể cả "12.930.769 đ", "+500.000", "−250.000", "25,1%"),
// ngày dd/mm/yyyy, còn lại so chuỗi tiếng Việt
function sortKey(v) {
  if (typeof v === 'number') return v;
  const s = stripTags(v);
  const d = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (d) return Number(d[3] + d[2] + d[1]);
  const n = s.replace(/[−–]/g, '-').replace(/\s*(đ|tr|%)$/i, '').replace(/^\+/, '').replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
  if (/^-?\d+(\.\d+)?$/.test(n)) return Number(n);
  return s.toLocaleLowerCase('vi');
}
function compare(a, b) {
  const x = sortKey(a); const y = sortKey(b);
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y), 'vi', { numeric: true });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.th-sort');
  if (!btn) return;
  const tbl = btn.closest('table');
  const col = Number(btn.dataset.sortCol);
  const key = tbl.dataset.sortKey;
  const cur = sortState.get(key);
  const dir = cur && cur.col === col ? -cur.dir : 1;
  sortState.set(key, { col, dir });
  // sắp xếp ngay trên DOM (không cần gọi lại API)
  const tbody = tbl.tBodies[0];
  [...tbody.rows]
    .sort((ra, rb) => dir * compare(ra.cells[col].dataset.sv, rb.cells[col].dataset.sv))
    .forEach((tr) => tbody.append(tr));
  tbl.querySelectorAll('th[aria-sort]').forEach((th) => {
    const b = th.querySelector('.th-sort');
    const on = Number(b.dataset.sortCol) === col;
    th.setAttribute('aria-sort', on ? (dir > 0 ? 'ascending' : 'descending') : 'none');
    b.querySelector('.sort-ind').textContent = on ? (dir > 0 ? '▲' : '▼') : '↕';
  });
});

export const loading = () => '<div class="loading">Đang tải dữ liệu…</div>';
export const errorBox = (e) => `<div class="notice warn">${icon('alert')}<span>${esc(e.message)}</span></div>`;

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Màu biểu đồ (theo bảng màu giao diện)
export const CHART_COLORS = ['#0d7480', '#3d5a80', '#c47f17', '#5f9e6e', '#b4533c', '#7d8b93'];
