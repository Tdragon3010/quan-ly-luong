// Trang Chấm công: form chấm công theo ngày + tổng hợp công theo tháng
import { get, put, qs } from '../api.js';
import { store, danhMuc } from '../app.js';
import { esc, icon, timeHM, chipCC, options, monthOptions, yearOptions, table, toast, errorBox, loading, TRANG_THAI_CC, dateVN, debounce } from '../ui.js';

const GIO_VAO = '08:00';
const GIO_RA = '17:00';
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export async function render(view) {
  const { phongBan } = await danhMuc();
  let ngay = isoLocal(new Date());
  let maPB = '';
  let rows = [];
  let tab = 'ngay';
  const locTh = { tenPB: '', viPham: '', q: '' }; // bộ lọc tab Tổng hợp tháng (giữ khi đổi tab)

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Chấm công</h1>
        <p>Đi làm sau ${GIO_VAO} tự ghi nhận là đi muộn (phạt 50.000 đ/lần khi tính lương). Nghỉ phép vẫn được tính công.</p>
      </div>
      <div class="tabs" role="tablist" aria-label="Chế độ xem">
        <button role="tab" id="tab-ngay" aria-selected="true" aria-controls="panel">Chấm công theo ngày</button>
        <button role="tab" id="tab-thang" aria-selected="false" aria-controls="panel">Tổng hợp tháng</button>
      </div>
    </div>
    <div id="panel" role="tabpanel"></div>`;
  const panel = view.querySelector('#panel');

  // ---------------- Chấm công theo ngày ----------------
  function renderNgay() {
    const d = new Date(ngay + 'T00:00:00');
    panel.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="toolbar">
            <div class="field">
              <label for="ngay">Ngày chấm công</label>
              <div class="actions" style="gap:4px">
                <button class="icon-btn" id="prev" aria-label="Ngày trước">${icon('chevron-left')}</button>
                <input class="input" type="date" id="ngay" value="${ngay}" style="width:170px">
                <button class="icon-btn" id="next" aria-label="Ngày sau">${icon('chevron-right')}</button>
              </div>
            </div>
            <div class="field">
              <label for="pb">Phòng ban</label>
              <select class="input" id="pb">${options(phongBan, 'MaPB', 'TenPB', maPB, 'Tất cả phòng ban')}</select>
            </div>
          </div>
          <div class="actions">
            <button class="btn" id="fillAll">${icon('check')}Đánh dấu người chưa chấm là đi làm</button>
            <button class="btn primary" id="save" disabled>Lưu chấm công</button>
          </div>
        </div>
        <div class="card-body" style="padding-bottom:0">
          <div class="summary-bar" id="summary"></div>
          ${d.getDay() === 0 ? `<div class="notice warn" style="margin-top:12px">${icon('alert')}<span>${THU[0]} ${dateVN(ngay)} là ngày nghỉ, không tính vào ngày công chuẩn.</span></div>` : ''}
        </div>
        <div id="grid" style="margin-top:14px">${loading()}</div>
      </div>`;

    const grid = panel.querySelector('#grid');
    const saveBtn = panel.querySelector('#save');

    const summary = () => {
      const c = { chua: 0, DiLam: 0, DiMuon: 0, NghiPhep: 0, NghiKhongPhep: 0 };
      rows.forEach((r) => { c[r.TrangThai || 'chua']++; });
      panel.querySelector('#summary').innerHTML =
        `<span class="chip neutral">${THU[d.getDay()]} ${dateVN(ngay)} · ${rows.length} nhân viên</span>` +
        Object.entries(TRANG_THAI_CC).map(([k, v]) => `<span class="chip ${v.cls}">${v.text}: ${c[k]}</span>`).join('') +
        (c.chua ? `<span class="chip neutral">Chưa chấm: ${c.chua}</span>` : '');
      const dirty = rows.some((r) => r.dirty);
      saveBtn.disabled = !dirty;
      saveBtn.textContent = dirty ? `Lưu chấm công (${rows.filter((r) => r.dirty).length})` : 'Lưu chấm công';
    };

    const rowHtml = (r, i) => {
      const nghi = r.TrangThai === 'NghiPhep' || r.TrangThai === 'NghiKhongPhep';
      return `<tr data-i="${i}" class="${r.dirty ? 'dirty' : ''}">
        <td><span class="mono">${esc(r.MaNV)}</span></td>
        <td><span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.TenPB)}</span></td>
        <td><fieldset class="seg" style="border:0;padding:0;margin:0">
          <legend class="sr-only">Trạng thái của ${esc(r.HoTen)}</legend>
          ${Object.entries(TRANG_THAI_CC).map(([k, v]) => `<label><input type="radio" name="tt${i}" value="${k}" ${r.TrangThai === k ? 'checked' : ''}><span class="s-${k}">${v.text}</span></label>`).join('')}
        </fieldset></td>
        <td><label class="sr-only" for="vao${i}">Giờ vào</label><input class="input time-in" type="time" id="vao${i}" data-f="GioVao" value="${timeHM(r.GioVao)}" ${nghi ? 'disabled' : ''}></td>
        <td><label class="sr-only" for="ra${i}">Giờ ra</label><input class="input time-in" type="time" id="ra${i}" data-f="GioRa" value="${timeHM(r.GioRa)}" ${nghi ? 'disabled' : ''}></td>
      </tr>`;
    };

    const draw = () => {
      if (!rows.length) { grid.innerHTML = '<div class="empty">Không có nhân viên đang làm trong ngày này</div>'; summary(); return; }
      grid.innerHTML = `<div class="table-wrap"><table class="tbl">
        <thead><tr><th scope="col">Mã NV</th><th scope="col">Nhân viên</th><th scope="col">Trạng thái</th><th scope="col">Giờ vào</th><th scope="col">Giờ ra</th></tr></thead>
        <tbody>${rows.map(rowHtml).join('')}</tbody></table></div>`;
      summary();
    };

    const redrawRow = (i) => {
      const tr = grid.querySelector(`tr[data-i="${i}"]`);
      const focusedId = document.activeElement?.id;
      tr.outerHTML = rowHtml(rows[i], i);
      if (focusedId) document.getElementById(focusedId)?.focus();
      summary();
    };

    async function load() {
      grid.innerHTML = loading();
      try {
        rows = (await get(`/cham-cong/ngay/${ngay}` + qs({ maPB }))).map((r) => ({ ...r, dirty: false }));
        draw();
      } catch (e) { grid.innerHTML = errorBox(e); }
    }

    // Chọn trạng thái
    grid.addEventListener('change', (e) => {
      const tr = e.target.closest('tr[data-i]');
      if (!tr) return;
      const i = +tr.dataset.i;
      const r = rows[i];
      if (e.target.type === 'radio') {
        r.TrangThai = e.target.value;
        if (r.TrangThai.startsWith('Nghi')) { r.GioVao = null; r.GioRa = null; }
        else {
          if (!r.GioVao) r.GioVao = r.TrangThai === 'DiMuon' ? '08:30' : GIO_VAO;
          if (!r.GioRa) r.GioRa = GIO_RA;
        }
        r.dirty = true;
        redrawRow(i);
        grid.querySelector(`input[name="tt${i}"][value="${r.TrangThai}"]`)?.focus();
      } else if (e.target.dataset.f) {
        r[e.target.dataset.f] = e.target.value || null;
        // Giờ vào quyết định đi làm / đi muộn
        if (e.target.dataset.f === 'GioVao' && r.GioVao) r.TrangThai = r.GioVao > GIO_VAO ? 'DiMuon' : 'DiLam';
        r.dirty = true;
        redrawRow(i);
      }
    });

    panel.querySelector('#fillAll').addEventListener('click', () => {
      let n = 0;
      rows.forEach((r) => { if (!r.TrangThai) { Object.assign(r, { TrangThai: 'DiLam', GioVao: GIO_VAO, GioRa: GIO_RA, dirty: true }); n++; } });
      draw();
      toast(n ? `Đã đánh dấu ${n} người đi làm, nhớ bấm Lưu` : 'Mọi người đều đã được chấm');
    });

    saveBtn.addEventListener('click', async () => {
      const ds = rows.filter((r) => r.dirty);
      const loi = ds.find((r) => (r.TrangThai === 'DiLam' || r.TrangThai === 'DiMuon') && (!r.GioVao || (r.GioRa && r.GioRa <= r.GioVao)));
      if (loi) { toast(`${loi.MaNV} ${loi.HoTen}: giờ vào/ra không hợp lệ`, 'bad'); return; }
      saveBtn.disabled = true;
      try {
        const kq = await put(`/cham-cong/ngay/${ngay}`, ds.map((r) => ({ MaNV: r.MaNV, TrangThai: r.TrangThai, GioVao: r.GioVao, GioRa: r.GioRa })));
        toast(`${kq.message} (${kq.soBanGhi} người)`);
        await load();
      } catch (e) { toast(e.message, 'bad'); saveBtn.disabled = false; }
    });

    const doiNgay = (moi) => {
      if (rows.some((r) => r.dirty) && !confirm('Có thay đổi chưa lưu. Vẫn chuyển ngày?')) { panel.querySelector('#ngay').value = ngay; return; }
      ngay = moi;
      renderNgay();
    };
    panel.querySelector('#ngay').addEventListener('change', (e) => e.target.value && doiNgay(e.target.value));
    for (const [id, step] of [['prev', -1], ['next', 1]]) {
      panel.querySelector('#' + id).addEventListener('click', () => {
        const x = new Date(ngay + 'T00:00:00'); x.setDate(x.getDate() + step); doiNgay(isoLocal(x));
      });
    }
    panel.querySelector('#pb').addEventListener('change', (e) => { maPB = e.target.value; load(); });
    load();
  }

  // ---------------- Tổng hợp tháng ----------------
  function renderThang() {
    panel.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div><h2>Tổng hợp công tháng</h2><p>Số ngày công = đi làm + đi muộn + nghỉ phép.</p></div>
          <form class="toolbar" id="ky">
            <div class="field sm"><label for="thang">Tháng</label><select class="input" id="thang" name="thang">${monthOptions(store.thang)}</select></div>
            <div class="field sm"><label for="nam">Năm</label><select class="input" id="nam" name="nam">${yearOptions(store.nam)}</select></div>
          </form>
        </div>
        <div class="card-head" style="padding-top:0;border-bottom:0">
          <form class="toolbar" id="locThang" role="search" style="width:100%">
            <div class="field"><label for="thPB">Phòng ban</label><select class="input" id="thPB" name="tenPB">${options(phongBan, 'TenPB', 'TenPB', locTh.tenPB, 'Tất cả phòng ban')}</select></div>
            <div class="field"><label for="thVP">Hiển thị</label><select class="input" id="thVP" name="viPham">
              <option value="">Tất cả nhân viên</option>
              <option value="muon" ${locTh.viPham === 'muon' ? 'selected' : ''}>Có đi muộn</option>
              <option value="kp" ${locTh.viPham === 'kp' ? 'selected' : ''}>Có nghỉ không phép</option>
              <option value="thieu" ${locTh.viPham === 'thieu' ? 'selected' : ''}>Thiếu công (dưới 24 ngày)</option>
            </select></div>
            <div class="field search"><label for="thQ">Tìm nhân viên</label>${icon('search')}<input class="input" type="search" id="thQ" name="q" value="${esc(locTh.q)}" placeholder="Mã hoặc họ tên"></div>
          </form>
        </div>
        <div id="th">${loading()}</div>
      </div>`;
    const th = panel.querySelector('#th');
    async function load() {
      try {
        const q = locTh.q.trim().toLocaleLowerCase('vi');
        const data = (await get('/cham-cong/tong-hop' + qs({ thang: store.thang, nam: store.nam })))
          .filter((r) => !locTh.tenPB || r.TenPB === locTh.tenPB)
          .filter((r) => !q || `${r.MaNV} ${r.HoTen}`.toLocaleLowerCase('vi').includes(q))
          .filter((r) => !locTh.viPham
            || (locTh.viPham === 'muon' && r.DiMuon > 0)
            || (locTh.viPham === 'kp' && r.NghiKhongPhep > 0)
            || (locTh.viPham === 'thieu' && r.SoNgayCong < 24));
        const tong = data.reduce((a, r) => ({ DiLam: a.DiLam + r.DiLam, DiMuon: a.DiMuon + r.DiMuon, NghiPhep: a.NghiPhep + r.NghiPhep, NghiKhongPhep: a.NghiKhongPhep + r.NghiKhongPhep }), { DiLam: 0, DiMuon: 0, NghiPhep: 0, NghiKhongPhep: 0 });
        const n = (v, cls) => (v ? `<span class="chip ${cls}">${v}</span>` : '<span class="muted">0</span>');
        th.innerHTML = table([
          { label: 'Mã NV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
          { label: 'Họ tên', sortValue: (r) => r.HoTen, render: (r) => `<span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.TenPB)}</span>` },
          { label: 'Đi làm', cls: 'num', key: 'DiLam', render: (r) => r.DiLam },
          { label: 'Đi muộn', cls: 'num', key: 'DiMuon', render: (r) => n(r.DiMuon, 'warn') },
          { label: 'Nghỉ phép', cls: 'num', key: 'NghiPhep', render: (r) => n(r.NghiPhep, 'info') },
          { label: 'Nghỉ không phép', cls: 'num', key: 'NghiKhongPhep', render: (r) => n(r.NghiKhongPhep, 'bad') },
          { label: 'Ngày công', cls: 'num', key: 'SoNgayCong', render: (r) => `<b>${r.SoNgayCong}</b>` },
        ], data, {
          empty: `Chưa có dữ liệu chấm công tháng ${store.thang}/${store.nam}`,
          foot: `<td colspan="2">Tổng ${data.length} nhân viên</td><td class="num">${tong.DiLam}</td><td class="num">${tong.DiMuon}</td><td class="num">${tong.NghiPhep}</td><td class="num">${tong.NghiKhongPhep}</td><td></td>`,
        });
      } catch (e) { th.innerHTML = errorBox(e); }
    }
    panel.querySelector('#ky').addEventListener('change', (e) => { store[e.target.name] = +e.target.value; load(); });
    const fLoc = panel.querySelector('#locThang');
    fLoc.addEventListener('change', (e) => { locTh[e.target.name] = e.target.value; load(); });
    fLoc.addEventListener('input', debounce((e) => { if (e.target.name === 'q') { locTh.q = e.target.value; load(); } }, 250));
    fLoc.addEventListener('submit', (e) => e.preventDefault());
    load();
  }

  const show = () => {
    view.querySelector('#tab-ngay').setAttribute('aria-selected', tab === 'ngay');
    view.querySelector('#tab-thang').setAttribute('aria-selected', tab === 'thang');
    panel.setAttribute('aria-labelledby', 'tab-' + tab);
    (tab === 'ngay' ? renderNgay : renderThang)();
  };
  view.querySelector('#tab-ngay').addEventListener('click', () => { tab = 'ngay'; show(); });
  view.querySelector('#tab-thang').addEventListener('click', () => { tab = 'thang'; show(); });
  show();
}
