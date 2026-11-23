// Trang Phòng ban & Chức vụ: CRUD hai danh mục
import { post, put, del } from '../api.js';
import { danhMuc } from '../app.js';
import { esc, icon, money, table, formDialog, confirmDialog, toast } from '../ui.js';

export async function render(view) {
  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Phòng ban &amp; chức vụ</h1>
        <p>Danh mục dùng khi thêm nhân viên. Phụ cấp chức vụ được cộng vào lương hằng tháng.</p>
      </div>
    </div>
    <div class="grid two">
      <section class="card" aria-labelledby="hPB">
        <div class="card-head"><div><h2 id="hPB">Phòng ban</h2></div>
          <button class="btn" data-add="pb">${icon('plus')}Thêm phòng ban</button></div>
        <div id="pb"></div>
      </section>
      <section class="card" aria-labelledby="hCV">
        <div class="card-head"><div><h2 id="hCV">Chức vụ</h2></div>
          <button class="btn" data-add="cv">${icon('plus')}Thêm chức vụ</button></div>
        <div id="cv"></div>
      </section>
    </div>`;

  const cfg = {
    pb: {
      url: '/phong-ban', key: 'MaPB', name: 'TenPB', ten: 'phòng ban',
      cols: [
        { label: 'Mã', render: (r) => `<span class="mono">${esc(r.MaPB)}</span>` },
        { label: 'Tên phòng ban', render: (r) => `<span class="name">${esc(r.TenPB)}</span><span class="sub">${esc(r.MoTa || '')}</span>` },
        { label: 'Nhân viên', cls: 'num', render: (r) => r.SoNhanVien },
      ],
      fields: (edit) => [
        { name: 'MaPB', label: 'Mã phòng ban', required: true, readonly: edit, placeholder: 'VD: PB07' },
        { name: 'TenPB', label: 'Tên phòng ban', required: true },
        { name: 'MoTa', label: 'Mô tả', type: 'textarea', full: true, emptyNull: true },
      ],
    },
    cv: {
      url: '/chuc-vu', key: 'MaCV', name: 'TenCV', ten: 'chức vụ',
      cols: [
        { label: 'Mã', render: (r) => `<span class="mono">${esc(r.MaCV)}</span>` },
        { label: 'Tên chức vụ', render: (r) => `<span class="name">${esc(r.TenCV)}</span>` },
        { label: 'Phụ cấp', cls: 'num', render: (r) => money(r.PhuCap) },
        { label: 'Nhân viên', cls: 'num', render: (r) => r.SoNhanVien },
      ],
      fields: (edit) => [
        { name: 'MaCV', label: 'Mã chức vụ', required: true, readonly: edit, placeholder: 'VD: CV07' },
        { name: 'TenCV', label: 'Tên chức vụ', required: true },
        { name: 'PhuCap', label: 'Phụ cấp (đ/tháng)', type: 'number', min: 0, step: 100000, value: 0, full: true },
      ],
    },
  };
  let data = {};

  async function load(force = false) {
    const dm = await danhMuc(force);
    data = { pb: dm.phongBan, cv: dm.chucVu };
    for (const k of ['pb', 'cv']) {
      const c = cfg[k];
      view.querySelector('#' + k).innerHTML = table([...c.cols, {
        label: '<span class="sr-only">Thao tác</span>',
        render: (r) => `<div class="row-actions">
          <button class="icon-btn" data-edit="${k}:${esc(r[c.key])}" aria-label="Sửa ${esc(r[c.name])}" title="Sửa">${icon('edit')}</button>
          <button class="icon-btn danger" data-del="${k}:${esc(r[c.key])}" aria-label="Xóa ${esc(r[c.name])}" title="Xóa">${icon('trash')}</button></div>`,
      }], data[k]);
    }
  }

  view.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    const edit = e.target.closest('[data-edit]');
    const rm = e.target.closest('[data-del]');
    if (add) {
      const c = cfg[add.dataset.add];
      formDialog({
        title: `Thêm ${c.ten}`, fields: c.fields(false),
        onSubmit: async (d) => { await post(c.url, d); toast(`Đã thêm ${c.ten}`); await load(true); },
      });
    } else if (edit) {
      const [k, ma] = edit.dataset.edit.split(':');
      const c = cfg[k];
      const row = data[k].find((r) => r[c.key] === ma);
      formDialog({
        title: `Sửa ${c.ten} ${ma}`, fields: c.fields(true), values: row,
        onSubmit: async (d) => { delete d[c.key]; await put(`${c.url}/${ma}`, d); toast('Đã lưu thay đổi'); await load(true); },
      });
    } else if (rm) {
      const [k, ma] = rm.dataset.del.split(':');
      const c = cfg[k];
      const row = data[k].find((r) => r[c.key] === ma);
      if (!(await confirmDialog(`Xóa ${c.ten} <b>${esc(row[c.name])}</b>?`))) return;
      try { await del(`${c.url}/${ma}`); toast(`Đã xóa ${c.ten}`); await load(true); } catch (err) { toast(err.message, 'bad'); }
    }
  });

  await load(true);
}
