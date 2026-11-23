// Bảng lương
//   GET    /api/bang-luong/ky                          danh sách kỳ lương đã tính
//   GET    /api/bang-luong?thang=&nam=&maPB=&q=        bảng lương tháng
//   POST   /api/bang-luong/tinh   {Thang, Nam}         tính / tính lại lương (CALL sp_TinhLuong)
//   GET    /api/bang-luong/phieu/:maNV?thang=&nam=     phiếu lương chi tiết 1 nhân viên
//   DELETE /api/bang-luong?thang=&nam=                 hủy bảng lương 1 tháng
const express = require('express');
const db = require('../db');
const { parseKy, notFound } = require('../utils');

const router = express.Router();

router.get('/ky', async (req, res) => {
  const [rows] = await db.query(
    `SELECT Nam, Thang, COUNT(*) AS SoPhieu, SUM(ThucLinh) AS TongQuyLuong, MAX(NgayTinh) AS NgayTinh
     FROM BangLuong GROUP BY Nam, Thang ORDER BY Nam DESC, Thang DESC`);
  res.json(rows);
});

router.get('/', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const where = ['Thang = ?', 'Nam = ?'];
  const params = [thang, nam];
  if (req.query.maPB) { where.push('MaNV IN (SELECT MaNV FROM NhanVien WHERE MaPB = ?)'); params.push(req.query.maPB); }
  if (req.query.q) { where.push('(MaNV LIKE ? OR HoTen LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  const [rows] = await db.query(
    `SELECT * FROM v_PhieuLuong WHERE ${where.join(' AND ')} ORDER BY MaNV`, params);
  res.json(rows);
});

router.post('/tinh', async (req, res) => {
  const { thang, nam } = parseKy({ thang: req.body?.Thang, nam: req.body?.Nam });
  const batDau = Date.now();
  await db.query('CALL sp_TinhLuong(?, ?)', [thang, nam]);
  const [[tk]] = await db.query(
    'SELECT COUNT(*) AS SoPhieu, COALESCE(SUM(ThucLinh), 0) AS TongQuyLuong FROM BangLuong WHERE Thang = ? AND Nam = ?',
    [thang, nam]);
  res.json({ message: `Đã tính lương tháng ${thang}/${nam}`, ...tk, thoiGianMs: Date.now() - batDau });
});

router.get('/phieu/:maNV', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [phieu] = await db.query(
    'SELECT * FROM v_PhieuLuong WHERE MaNV = ? AND Thang = ? AND Nam = ?', [req.params.maNV, thang, nam]);
  if (!phieu.length) throw notFound(`Chưa có phiếu lương tháng ${thang}/${nam} của ${req.params.maNV}`);
  const [thuongPhat] = await db.query(
    'SELECT MaTP, Loai, SoTien, LyDo FROM ThuongPhat WHERE MaNV = ? AND Thang = ? AND Nam = ? ORDER BY Loai DESC, MaTP',
    [req.params.maNV, thang, nam]);
  const [[chamCong]] = await db.query(
    `SELECT SUM(TrangThai = 'DiLam') AS DiLam, SUM(TrangThai = 'DiMuon') AS DiMuon,
            SUM(TrangThai = 'NghiPhep') AS NghiPhep, SUM(TrangThai = 'NghiKhongPhep') AS NghiKhongPhep
     FROM ChamCong WHERE MaNV = ? AND YEAR(Ngay) = ? AND MONTH(Ngay) = ?`, [req.params.maNV, nam, thang]);
  const p = phieu[0];
  res.json({
    ...p,
    PhatDiMuon: p.SoLanDiMuon * 50000,
    chamCong: Object.fromEntries(Object.entries(chamCong).map(([k, v]) => [k, Number(v) || 0])),
    thuongPhat,
  });
});

router.delete('/', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [r] = await db.query('DELETE FROM BangLuong WHERE Thang = ? AND Nam = ?', [thang, nam]);
  if (!r.affectedRows) throw notFound(`Chưa có bảng lương tháng ${thang}/${nam}`);
  res.json({ message: `Đã hủy bảng lương tháng ${thang}/${nam}`, soPhieu: r.affectedRows });
});

module.exports = router;
