// Trang Nhân viên: tìm kiếm, lọc, thêm / sửa / xóa
import { get, post, put, del, qs } from '../api.js';
import { danhMuc } from '../app.js';
import { esc, icon, money, dateVN, chipNV, options, table, formDialog, confirmDialog, toast, debounce, errorBox, loading } from '../ui.js';

export async function render(view) {
  const { phongBan, chucVu } = await danhMuc();
  const loc = { q: '', maPB: '', maCV: '', trangThai: '' };

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Nhân viên</h1>
        <p>Hồ sơ, phòng ban, chức vụ và mức lương cơ bản theo hợp đồng.</p>
      </div>
      <div class="actions"><button class="btn primary" id="btnAdd">${icon('plus')}Thêm nhân viên</button></div>
    </div>
    <div class="card">
      <div class="card-head">
        <form class="toolbar" id="filters" role="search" style="width:100%">
          <div class="field search">
            <label class="sr-only" for="q">Tìm nhân viên</label>
            ${icon('search')}
            <input class="input" id="q" name="q" type="search" placeholder="Tìm theo mã, họ tên, email, số điện thoại">
          </div>
          <div class="field">
            <label class="sr-only" for="maPB">Phòng ban</label>
            <select class="input" id="maPB" name="maPB">${options(phongBan, 'MaPB', 'TenPB', '', 'Tất cả phòng ban')}</select>
          </div>
          <div class="field">
            <label class="sr-only" for="maCV">Chức vụ</label>
            <select class="input" id="maCV" name="maCV">${options(chucVu, 'MaCV', 'TenCV', '', 'Tất cả chức vụ')}</select>
          </div>
          <div class="field">
            <label class="sr-only" for="trangThai">Trạng thái</label>
            <select class="input" id="trangThai" name="trangThai">
              <option value="">Mọi trạng thái</option><option value="DangLam">Đang làm</option><option value="DaNghi">Đã nghỉ</option>
            </select>
          </div>
        </form>
      </div>
      <div id="list">${loading()}</div>
    </div>`;

  const list = view.querySelector('#list');
  let rows = [];

  async function load() {
    try {
      rows = await get('/nhan-vien' + qs(loc));
      list.innerHTML = table([
        { label: 'Mã NV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
        { label: 'Họ tên', render: (r) => `<span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.Email)} · ${esc(r.SoDienThoai)}</span>` },
        { label: 'Giới tính', render: (r) => (r.GioiTinh === 'Nam' ? 'Nam' : 'Nữ') },
        { label: 'Phòng ban', render: (r) => esc(r.TenPB) },
        { label: 'Chức vụ', render: (r) => esc(r.TenCV) },
        { label: 'Ngày vào làm', render: (r) => dateVN(r.NgayVaoLam) },
        { label: 'Lương cơ bản', cls: 'num', render: (r) => money(r.LuongCoBan) },
        { label: 'Trạng thái', render: (r) => chipNV(r.TrangThai) },
        { label: '<span class="sr-only">Thao tác</span>', render: (r) => `<div class="row-actions">
            <button class="icon-btn" data-edit="${esc(r.MaNV)}" aria-label="Sửa ${esc(r.HoTen)}" title="Sửa">${icon('edit')}</button>
            <button class="icon-btn danger" data-del="${esc(r.MaNV)}" aria-label="Xóa ${esc(r.HoTen)}" title="Xóa">${icon('trash')}</button>
          </div>` },
      ], rows, { empty: 'Không tìm thấy nhân viên phù hợp' }) +
        (rows.length ? `<div class="table-meta">${rows.length} nhân viên</div>` : '');
    } catch (e) { list.innerHTML = errorBox(e); }
  }

  const fields = (isEdit) => [
    { name: 'MaNV', label: 'Mã nhân viên', readonly: isEdit, hint: isEdit ? '' : 'Bỏ trống để hệ thống tự sinh mã', placeholder: 'VD: NV041' },
    { name: 'HoTen', label: 'Họ và tên', required: true },
    { name: 'NgaySinh', label: 'Ngày sinh', type: 'date', required: true },
    { name: 'GioiTinh', label: 'Giới tính', type: 'select', required: true, options: [{ value: 'Nam', text: 'Nam' }, { value: 'Nu', text: 'Nữ' }] },
    { name: 'SoDienThoai', label: 'Số điện thoại', type: 'tel', required: true, pattern: '0\\d{9,10}', patternMsg: '10–11 chữ số, bắt đầu bằng 0' },
    { name: 'Email', label: 'Email', type: 'email', required: true },
    { name: 'MaPB', label: 'Phòng ban', type: 'select', required: true, placeholder: 'Chọn phòng ban', options: phongBan.map((p) => ({ value: p.MaPB, text: p.TenPB })) },
    { name: 'MaCV', label: 'Chức vụ', type: 'select', required: true, placeholder: 'Chọn chức vụ', options: chucVu.map((c) => ({ value: c.MaCV, text: `${c.TenCV} (phụ cấp ${money(c.PhuCap)})` })) },
    { name: 'NgayVaoLam', label: 'Ngày vào làm', type: 'date', required: true,
      validate: (v, f) => (v && f.elements.NgaySinh.value && v <= f.elements.NgaySinh.value ? 'Ngày vào làm phải sau ngày sinh' : '') },
    { name: 'LuongCoBan', label: 'Lương cơ bản (đ/tháng)', type: 'number', required: true, min: 1, step: 100000 },
    ...(isEdit ? [{ name: 'TrangThai', label: 'Trạng thái', type: 'select', options: [{ value: 'DangLam', text: 'Đang làm' }, { value: 'DaNghi', text: 'Đã nghỉ' }] }] : []),
  ];

  view.querySelector('#btnAdd').addEventListener('click', () => formDialog({
    title: 'Thêm nhân viên', fields: fields(false), submitText: 'Thêm nhân viên',
    onSubmit: async (d) => {
      const nv = await post('/nhan-vien', d);
      toast(`Đã thêm ${nv.HoTen} (${nv.MaNV})`);
      await load();
    },
  }));

  list.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    const rm = e.target.closest('[data-del]');
    if (edit) {
      const nv = rows.find((r) => r.MaNV === edit.dataset.edit);
      formDialog({
        title: `Sửa nhân viên ${nv.MaNV}`, fields: fields(true), values: nv,
        onSubmit: async (d) => {
          delete d.MaNV;
          await put(`/nhan-vien/${nv.MaNV}`, d);
          toast('Đã lưu thay đổi');
          await load();
        },
      });
    }
    if (rm) {
      const nv = rows.find((r) => r.MaNV === rm.dataset.del);
      const ok = await confirmDialog(`Xóa nhân viên <b>${esc(nv.HoTen)}</b> (${esc(nv.MaNV)})? Toàn bộ chấm công, thưởng/phạt và phiếu lương của người này cũng bị xóa. Nếu chỉ nghỉ việc, hãy sửa trạng thái thành <b>Đã nghỉ</b>.`);
      if (!ok) return;
      try { await del(`/nhan-vien/${nv.MaNV}`); toast('Đã xóa nhân viên'); await load(); } catch (err) { toast(err.message, 'bad'); }
    }
  });

  const form = view.querySelector('#filters');
  const apply = () => { Object.assign(loc, Object.fromEntries(new FormData(form))); load(); };
  form.addEventListener('input', debounce(apply, 250));
  form.addEventListener('change', apply);
  form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });

  await load();
}
