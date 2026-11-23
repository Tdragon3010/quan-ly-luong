// Trang Thưởng / phạt theo tháng: lọc, thêm, sửa, xóa
import { get, post, put, del, qs } from '../api.js';
import { store } from '../app.js';
import { esc, icon, money, chipTP, monthOptions, yearOptions, table, formDialog, confirmDialog, toast, errorBox, loading, dateVN, debounce } from '../ui.js';

export async function render(view) {
  const nhanVien = await get('/nhan-vien?trangThai=DangLam');
  const phongBan = [...new Set(nhanVien.map((n) => n.TenPB))].sort((a, b) => a.localeCompare(b, 'vi'));
  let loai = '';
  const loc = { q: '', tenPB: '' };
  let rows = [];

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Thưởng / phạt</h1>
        <p>Các khoản được cộng hoặc trừ vào lương của tháng tương ứng. Tính lại lương sau khi thay đổi.</p>
      </div>
      <div class="actions"><button class="btn primary" id="btnAdd">${icon('plus')}Thêm khoản thưởng / phạt</button></div>
    </div>
    <div class="card">
      <div class="card-head">
        <form class="toolbar" id="loc">
          <div class="field sm"><label for="thang">Tháng</label><select class="input" id="thang" name="thang">${monthOptions(store.thang)}</select></div>
          <div class="field sm"><label for="nam">Năm</label><select class="input" id="nam" name="nam">${yearOptions(store.nam)}</select></div>
          <div class="field"><label for="loai">Loại</label>
            <select class="input" id="loai" name="loai"><option value="">Thưởng và phạt</option><option value="Thuong">Chỉ thưởng</option><option value="Phat">Chỉ phạt</option></select></div>
          <div class="field"><label for="tenPB">Phòng ban</label>
            <select class="input" id="tenPB" name="tenPB"><option value="">Tất cả phòng ban</option>${phongBan.map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
          <div class="field search"><label for="q">Tìm nhân viên hoặc lý do</label>${icon('search')}<input class="input" type="search" id="q" name="q" placeholder="Mã, họ tên, lý do"></div>
        </form>
        <div class="summary-bar" id="sum"></div>
      </div>
      <div id="list">${loading()}</div>
    </div>`;
  const list = view.querySelector('#list');

  async function load() {
    try {
      const q = loc.q.trim().toLocaleLowerCase('vi');
      rows = (await get('/thuong-phat' + qs({ thang: store.thang, nam: store.nam, loai })))
        .filter((r) => !loc.tenPB || r.TenPB === loc.tenPB)
        .filter((r) => !q || `${r.MaNV} ${r.HoTen} ${r.LyDo}`.toLocaleLowerCase('vi').includes(q));
      const t = rows.filter((r) => r.Loai === 'Thuong').reduce((a, r) => a + r.SoTien, 0);
      const p = rows.filter((r) => r.Loai === 'Phat').reduce((a, r) => a + r.SoTien, 0);
      view.querySelector('#sum').innerHTML = `<span class="chip ok">Tổng thưởng ${money(t)}</span><span class="chip bad">Tổng phạt ${money(p)}</span>`;
      list.innerHTML = table([
        { label: 'Mã NV', key: 'MaNV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
        { label: 'Nhân viên', sortValue: (r) => r.HoTen, render: (r) => `<span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.TenPB)}</span>` },
        { label: 'Loại', render: (r) => chipTP(r.Loai) },
        { label: 'Lý do', render: (r) => esc(r.LyDo) },
        { label: 'Số tiền', cls: 'num', sortValue: (r) => (r.Loai === 'Thuong' ? r.SoTien : -r.SoTien), render: (r) => `<b style="color:var(--${r.Loai === 'Thuong' ? 'ok' : 'bad'})">${r.Loai === 'Thuong' ? '+' : '−'}${money(r.SoTien)}</b>` },
        { label: 'Ngày ghi', sortValue: (r) => r.NgayTao, render: (r) => dateVN(r.NgayTao) },
        { label: '<span class="sr-only">Thao tác</span>', render: (r) => `<div class="row-actions">
          <button class="icon-btn" data-edit="${r.MaTP}" aria-label="Sửa khoản của ${esc(r.HoTen)}" title="Sửa">${icon('edit')}</button>
          <button class="icon-btn danger" data-del="${r.MaTP}" aria-label="Xóa khoản của ${esc(r.HoTen)}" title="Xóa">${icon('trash')}</button></div>` },
      ], rows, { empty: `Không có khoản thưởng / phạt nào trong tháng ${store.thang}/${store.nam}` }) +
        (rows.length ? `<div class="table-meta">${rows.length} khoản</div>` : '');
    } catch (e) { list.innerHTML = errorBox(e); }
  }

  const fields = () => [
    { name: 'MaNV', label: 'Nhân viên', type: 'select', required: true, full: true, placeholder: 'Chọn nhân viên',
      options: nhanVien.map((n) => ({ value: n.MaNV, text: `${n.MaNV} – ${n.HoTen} (${n.TenPB})` })) },
    { name: 'Loai', label: 'Loại', type: 'select', required: true, options: [{ value: 'Thuong', text: 'Thưởng' }, { value: 'Phat', text: 'Phạt' }] },
    { name: 'SoTien', label: 'Số tiền (đ)', type: 'number', required: true, min: 1000, step: 50000 },
    { name: 'Thang', label: 'Tháng', type: 'select', required: true, options: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, text: `Tháng ${i + 1}` })) },
    { name: 'Nam', label: 'Năm', type: 'number', required: true, min: 2000 },
    { name: 'LyDo', label: 'Lý do', required: true, full: true, placeholder: 'VD: Hoàn thành vượt KPI tháng' },
  ];
  const toNum = (d) => ({ ...d, Thang: Number(d.Thang) });

  view.querySelector('#btnAdd').addEventListener('click', () => formDialog({
    title: 'Thêm khoản thưởng / phạt', fields: fields(), values: { Thang: store.thang, Nam: store.nam, Loai: 'Thuong' },
    onSubmit: async (d) => { await post('/thuong-phat', toNum(d)); toast('Đã thêm. Hãy tính lại lương tháng này để cập nhật.'); await load(); },
  }));

  list.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    const rm = e.target.closest('[data-del]');
    if (edit) {
      const r = rows.find((x) => x.MaTP === +edit.dataset.edit);
      formDialog({
        title: 'Sửa khoản thưởng / phạt', fields: fields(), values: r,
        onSubmit: async (d) => { await put(`/thuong-phat/${r.MaTP}`, toNum(d)); toast('Đã lưu thay đổi'); await load(); },
      });
    }
    if (rm) {
      const r = rows.find((x) => x.MaTP === +rm.dataset.del);
      if (!(await confirmDialog(`Xóa khoản ${r.Loai === 'Thuong' ? 'thưởng' : 'phạt'} ${money(r.SoTien)} của <b>${esc(r.HoTen)}</b>?`))) return;
      try { await del(`/thuong-phat/${r.MaTP}`); toast('Đã xóa'); await load(); } catch (err) { toast(err.message, 'bad'); }
    }
  });

  const formLoc = view.querySelector('#loc');
  formLoc.addEventListener('change', (e) => {
    const { name, value } = e.target;
    if (name === 'loai') loai = value;
    else if (name in loc) loc[name] = value;
    else store[name] = +value;
    load();
  });
  formLoc.addEventListener('input', debounce((e) => { if (e.target.name === 'q') { loc.q = e.target.value; load(); } }, 250));
  formLoc.addEventListener('submit', (e) => e.preventDefault());
  await load();
}
