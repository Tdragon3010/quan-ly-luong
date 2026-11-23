// CRUD Nhân viên
//   GET    /api/nhan-vien?q=&maPB=&maCV=&trangThai=   tìm kiếm / lọc
//   GET    /api/nhan-vien/:ma                         chi tiết + thống kê
//   POST   /api/nhan-vien                             thêm (tự sinh MaNV nếu bỏ trống)
//   PUT    /api/nhan-vien/:ma                         sửa
//   DELETE /api/nhan-vien/:ma                         xóa (xóa kèm chấm công, thưởng phạt, bảng lương)
const express = require('express');
const db = require('../db');
const { pick, requireFields, setClause, notFound, badRequest, isDate } = require('../utils');

const router = express.Router();
const FIELDS = ['HoTen', 'NgaySinh', 'GioiTinh', 'SoDienThoai', 'Email', 'NgayVaoLam', 'MaPB', 'MaCV', 'LuongCoBan', 'TrangThai'];

const SELECT_NV = `
  SELECT nv.*, pb.TenPB, cv.TenCV, cv.PhuCap
  FROM NhanVien nv
  JOIN PhongBan pb ON pb.MaPB = nv.MaPB
  JOIN ChucVu   cv ON cv.MaCV = nv.MaCV`;

function validate(d) {
  for (const f of ['NgaySinh', 'NgayVaoLam']) {
    if (d[f] !== undefined && !isDate(d[f])) throw badRequest(`${f} phải có dạng YYYY-MM-DD`);
  }
  if (d.GioiTinh !== undefined && !['Nam', 'Nu'].includes(d.GioiTinh)) throw badRequest('Giới tính phải là Nam hoặc Nu');
  if (d.TrangThai !== undefined && !['DangLam', 'DaNghi'].includes(d.TrangThai)) throw badRequest('Trạng thái phải là DangLam hoặc DaNghi');
  if (d.LuongCoBan !== undefined && !(Number(d.LuongCoBan) > 0)) throw badRequest('Lương cơ bản phải lớn hơn 0');
  if (d.Email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.Email)) throw badRequest('Email không hợp lệ');
  if (d.SoDienThoai !== undefined && !/^0\d{9,10}$/.test(d.SoDienThoai)) throw badRequest('Số điện thoại phải gồm 10–11 chữ số, bắt đầu bằng 0');
}

async function getNhanVien(ma) {
  const [rows] = await db.query(`${SELECT_NV} WHERE nv.MaNV = ?`, [ma]);
  return rows[0];
}

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.q) {
    where.push('(nv.MaNV LIKE ? OR nv.HoTen LIKE ? OR nv.Email LIKE ? OR nv.SoDienThoai LIKE ?)');
    const like = `%${req.query.q}%`;
    params.push(like, like, like, like);
  }
  if (req.query.maPB) { where.push('nv.MaPB = ?'); params.push(req.query.maPB); }
  if (req.query.maCV) { where.push('nv.MaCV = ?'); params.push(req.query.maCV); }
  if (req.query.trangThai) { where.push('nv.TrangThai = ?'); params.push(req.query.trangThai); }
  const [rows] = await db.query(
    `${SELECT_NV} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nv.MaNV`, params);
  res.json(rows);
});

router.get('/:ma', async (req, res) => {
  const nv = await getNhanVien(req.params.ma);
  if (!nv) throw notFound('Không tìm thấy nhân viên');
  const [[thongKe]] = await db.query(
    `SELECT COUNT(*) AS SoPhieuLuong, COALESCE(SUM(ThucLinh), 0) AS TongDaNhan,
            COALESCE(ROUND(AVG(ThucLinh)), 0) AS BinhQuanThang
     FROM BangLuong WHERE MaNV = ?`, [req.params.ma]);
  res.json({ ...nv, thongKe });
});

router.post('/', async (req, res) => {
  const data = pick(req.body, ['MaNV', ...FIELDS]);
  requireFields(data, ['HoTen', 'NgaySinh', 'GioiTinh', 'SoDienThoai', 'Email', 'NgayVaoLam', 'MaPB', 'MaCV', 'LuongCoBan']);
  validate(data);
  if (!data.MaNV) {
    // Sinh mã kế tiếp: NV001, NV002, ...
    const [[{ soMax }]] = await db.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(MaNV, 3) AS UNSIGNED)), 0) AS soMax FROM NhanVien WHERE MaNV REGEXP '^NV[0-9]+$'");
    data.MaNV = 'NV' + String(soMax + 1).padStart(3, '0');
  }
  await db.query('INSERT INTO NhanVien SET ?', [data]);
  res.status(201).json(await getNhanVien(data.MaNV));
});

router.put('/:ma', async (req, res) => {
  const data = pick(req.body, FIELDS);
  validate(data);
  const { sql, values } = setClause(data);
  const [r] = await db.query(`UPDATE NhanVien SET ${sql} WHERE MaNV = ?`, [...values, req.params.ma]);
  if (!r.affectedRows) throw notFound('Không tìm thấy nhân viên');
  res.json(await getNhanVien(req.params.ma));
});

router.delete('/:ma', async (req, res) => {
  const [r] = await db.query('DELETE FROM NhanVien WHERE MaNV = ?', [req.params.ma]);
  if (!r.affectedRows) throw notFound('Không tìm thấy nhân viên');
  res.json({ message: 'Đã xóa nhân viên' });
});

module.exports = router;
