// Trang Bảng lương: tính lương tháng, xem bảng lương, phiếu lương chi tiết, xuất Excel, in
import { get, post, qs } from '../api.js';
import { store, danhMuc } from '../app.js';
import { esc, icon, money, num, options, monthOptions, yearOptions, table, openDialog, confirmDialog, toast, debounce, errorBox, loading } from '../ui.js';

export async function render(view) {
  const { phongBan, chucVu } = await danhMuc();
  const loc = { maPB: '', q: '', tenCV: '', nhanh: '' };
  // Lọc nhanh: lọc trên dữ liệu đã tải (không cần gọi lại API)
  const LOC_NHANH = {
    diMuon: { text: 'Có đi muộn', fn: (r) => r.SoLanDiMuon > 0 },
    thuong: { text: 'Có thưởng', fn: (r) => r.TongThuong > 0 },
    phat: { text: 'Có phạt', fn: (r) => r.TongPhat > 0 },
    thieuCong: { text: 'Thiếu công', fn: (r) => r.SoNgayCong < r.NgayCongChuan },
    duCong: { text: 'Đủ công', fn: (r) => r.SoNgayCong >= r.NgayCongChuan },
  };
  let rows = [];

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Bảng lương</h1>
        <p>Thực lĩnh = lương cơ bản ÷ ngày công chuẩn × ngày công + phụ cấp + thưởng − phạt.</p>
      </div>
      <div class="actions">
        <a class="btn" id="excel" href="#">${icon('download')}Xuất Excel</a>
        <button class="btn primary" id="tinh">${icon('calc')}Tính lương tháng</button>
      </div>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="card">
      <div class="card-head">
        <form class="toolbar" id="loc" role="search" style="width:100%">
          <div class="field sm"><label for="thang">Tháng</label><select class="input" id="thang" name="thang">${monthOptions(store.thang)}</select></div>
          <div class="field sm"><label for="nam">Năm</label><select class="input" id="nam" name="nam">${yearOptions(store.nam)}</select></div>
          <div class="field"><label for="maPB">Phòng ban</label><select class="input" id="maPB" name="maPB">${options(phongBan, 'MaPB', 'TenPB', '', 'Tất cả phòng ban')}</select></div>
          <div class="field"><label for="tenCV">Chức vụ</label><select class="input" id="tenCV" name="tenCV">${options(chucVu, 'TenCV', 'TenCV', '', 'Tất cả chức vụ')}</select></div>
          <div class="field"><label for="nhanh">Lọc nhanh</label><select class="input" id="nhanh" name="nhanh"><option value="">Tất cả phiếu</option>${Object.entries(LOC_NHANH).map(([k, v]) => `<option value="${k}">${v.text}</option>`).join('')}</select></div>
          <div class="field search"><label for="q">Tìm nhân viên</label>${icon('search')}<input class="input" type="search" id="q" name="q" placeholder="Mã hoặc họ tên"></div>
        </form>
      </div>
      <div id="list">${loading()}</div>
    </div>`;

  const list = view.querySelector('#list');
  const kpis = view.querySelector('#kpis');
  const excel = view.querySelector('#excel');

  async function load() {
    excel.href = '/api/bao-cao/xuat-excel' + qs({ thang: store.thang, nam: store.nam });
    view.querySelector('#tinh').innerHTML = `${icon('calc')}Tính lương tháng ${store.thang}/${store.nam}`;
    try {
      rows = (await get('/bang-luong' + qs({ thang: store.thang, nam: store.nam, maPB: loc.maPB, q: loc.q })))
        .filter((r) => !loc.tenCV || r.TenCV === loc.tenCV)
        .filter((r) => !loc.nhanh || LOC_NHANH[loc.nhanh].fn(r));
      const s = (k) => rows.reduce((a, r) => a + r[k], 0);
      excel.toggleAttribute('aria-disabled', !rows.length);
      excel.style.pointerEvents = rows.length ? '' : 'none';
      excel.style.opacity = rows.length ? '' : '.5';
      kpis.innerHTML = rows.length ? [
        ['wallet', 'Tổng thực lĩnh', money(s('ThucLinh')), `${rows.length} phiếu lương`],
        ['users', 'Lương bình quân', money(s('ThucLinh') / rows.length), `Công chuẩn ${rows[0].NgayCongChuan} ngày`],
        ['gift', 'Tổng thưởng', money(s('TongThuong')), `Phụ cấp ${money(s('PhuCap'))}`],
        ['alert', 'Tổng phạt', money(s('TongPhat')), `${num(s('SoLanDiMuon'))} lượt đi muộn`],
      ].map(([ic, l, v, sub]) => `<div class="card kpi"><span class="label">${icon(ic)}${l}</span><span class="value">${v}</span><span class="sub">${sub}</span></div>`).join('') : '';

      if (!rows.length && !loc.q && !loc.maPB && !loc.tenCV && !loc.nhanh) {
        list.innerHTML = `<div class="empty"><p style="margin-bottom:14px">Chưa tính lương tháng ${store.thang}/${store.nam}.</p>
          <button class="btn primary" data-tinh>${icon('calc')}Tính lương tháng ${store.thang}/${store.nam}</button></div>`;
        return;
      }
      list.innerHTML = table([
        { label: 'Mã NV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
        { label: 'Họ tên', render: (r) => `<span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.TenCV)} · ${esc(r.TenPB)}</span>` },
        { label: 'Ngày công', cls: 'num', render: (r) => `${r.SoNgayCong}/${r.NgayCongChuan}` },
        { label: 'Đi muộn', cls: 'num', render: (r) => (r.SoLanDiMuon ? `<span class="chip warn">${r.SoLanDiMuon}</span>` : '<span class="muted">0</span>') },
        { label: 'Lương cơ bản', cls: 'num', render: (r) => money(r.LuongCoBan) },
        { label: 'Lương theo công', cls: 'num', render: (r) => money(r.LuongTheoCong) },
        { label: 'Phụ cấp', cls: 'num', render: (r) => money(r.PhuCap) },
        { label: 'Thưởng', cls: 'num', render: (r) => (r.TongThuong ? `<span style="color:var(--ok)">+${money(r.TongThuong)}</span>` : '<span class="muted">0</span>') },
        { label: 'Phạt', cls: 'num', render: (r) => (r.TongPhat ? `<span style="color:var(--bad)">−${money(r.TongPhat)}</span>` : '<span class="muted">0</span>') },
        { label: 'Thực lĩnh', cls: 'num', render: (r) => `<b>${money(r.ThucLinh)}</b>` },
      ], rows, {
        empty: 'Không có phiếu lương phù hợp',
        rowAttr: (r) => `class="clickable" data-nv="${esc(r.MaNV)}" tabindex="0" aria-label="Xem phiếu lương ${esc(r.HoTen)}"`,
        foot: `<td colspan="4">Tổng cộng (${rows.length})</td><td class="num">${money(s('LuongCoBan'))}</td><td class="num">${money(s('LuongTheoCong'))}</td>
          <td class="num">${money(s('PhuCap'))}</td><td class="num">${money(s('TongThuong'))}</td><td class="num">${money(s('TongPhat'))}</td><td class="num">${money(s('ThucLinh'))}</td>`,
      }) + (rows.length ? '<div class="table-meta">Bấm vào một dòng để xem và in phiếu lương.</div>' : '');
    } catch (e) { list.innerHTML = errorBox(e); kpis.innerHTML = ''; }
  }

  async function tinhLuong() {
    const [daCo] = await Promise.all([get('/bang-luong/ky')]);
    const tonTai = daCo.some((k) => k.Thang === store.thang && k.Nam === store.nam);
    if (tonTai && !(await confirmDialog(`Bảng lương tháng ${store.thang}/${store.nam} đã có. Tính lại sẽ cập nhật theo chấm công và thưởng/phạt mới nhất.`, { title: 'Tính lại lương', okText: 'Tính lại', danger: false }))) return;
    try {
      const kq = await post('/bang-luong/tinh', { Thang: store.thang, Nam: store.nam });
      toast(`${kq.message}: ${kq.SoPhieu} phiếu, tổng ${money(kq.TongQuyLuong)} (${kq.thoiGianMs} ms)`);
      await load();
    } catch (e) { toast(e.message, 'bad'); }
  }

  async function xemPhieu(maNV) {
    try {
      const p = await get(`/bang-luong/phieu/${maNV}` + qs({ thang: store.thang, nam: store.nam }));
      const d = openDialog({
        title: `Phiếu lương tháng ${p.Thang}/${p.Nam}`, wide: true,
        body: `<div class="slip">
          <div class="slip-head">
            <div><h3 style="font-size:20px">${esc(p.HoTen)}</h3>
              <p class="muted"><span class="mono">${esc(p.MaNV)}</span> · ${esc(p.TenCV)} · ${esc(p.TenPB)}</p></div>
            <div style="text-align:right"><span class="muted" style="font-size:13px">Thực lĩnh</span><div class="big">${money(p.ThucLinh)}</div></div>
          </div>
          <div class="stat-row">
            <div class="stat"><b>${p.chamCong.DiLam}</b><span>Đi làm đúng giờ</span></div>
            <div class="stat"><b>${p.chamCong.DiMuon}</b><span>Đi muộn</span></div>
            <div class="stat"><b>${p.chamCong.NghiPhep}</b><span>Nghỉ phép</span></div>
            <div class="stat"><b>${p.chamCong.NghiKhongPhep}</b><span>Nghỉ không phép</span></div>
          </div>
          <dl>
            <dt>Lương cơ bản</dt><dd>${money(p.LuongCoBan)}</dd>
            <dt>Ngày công / công chuẩn</dt><dd>${p.SoNgayCong} / ${p.NgayCongChuan}</dd>
            <dt>Lương theo ngày công</dt><dd>${money(p.LuongTheoCong)}</dd>
            <dt>Phụ cấp chức vụ</dt><dd>+${money(p.PhuCap)}</dd>
            ${p.thuongPhat.filter((t) => t.Loai === 'Thuong').map((t) => `<dt>Thưởng: ${esc(t.LyDo)}</dt><dd style="color:var(--ok)">+${money(t.SoTien)}</dd>`).join('')}
            ${p.thuongPhat.filter((t) => t.Loai === 'Phat').map((t) => `<dt>Phạt: ${esc(t.LyDo)}</dt><dd style="color:var(--bad)">−${money(t.SoTien)}</dd>`).join('')}
            ${p.SoLanDiMuon ? `<dt>Phạt đi muộn (${p.SoLanDiMuon} × 50.000 đ)</dt><dd style="color:var(--bad)">−${money(p.PhatDiMuon)}</dd>` : ''}
            <dt class="total">Thực lĩnh</dt><dd class="total">${money(p.ThucLinh)}</dd>
          </dl>
          <p class="formula">${money(p.LuongCoBan)} ÷ ${p.NgayCongChuan} × ${p.SoNgayCong} + ${money(p.PhuCap)} + ${money(p.TongThuong)} − ${money(p.TongPhat)} = <b>${money(p.ThucLinh)}</b></p>
        </div>`,
        footer: `<button class="btn" data-close>Đóng</button><button class="btn primary" id="print">${icon('print')}In phiếu lương</button>`,
      });
      d.querySelector('#print').addEventListener('click', () => window.print());
    } catch (e) { toast(e.message, 'bad'); }
  }

  view.querySelector('#tinh').addEventListener('click', tinhLuong);
  list.addEventListener('click', (e) => {
    if (e.target.closest('[data-tinh]')) return tinhLuong();
    const tr = e.target.closest('tr[data-nv]');
    if (tr) xemPhieu(tr.dataset.nv);
  });
  list.addEventListener('keydown', (e) => {
    const tr = e.target.closest('tr[data-nv]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); xemPhieu(tr.dataset.nv); }
  });
  const form = view.querySelector('#loc');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'thang' || e.target.name === 'nam') store[e.target.name] = +e.target.value;
    else loc[e.target.name] = e.target.value;
    load();
  });
  form.addEventListener('input', debounce((e) => { if (e.target.name === 'q') { loc.q = e.target.value; load(); } }, 250));
  form.addEventListener('submit', (e) => e.preventDefault());
  await load();
}
