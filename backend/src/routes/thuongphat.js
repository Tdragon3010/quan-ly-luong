// CRUD Thưởng / Phạt
//   GET    /api/thuong-phat?thang=&nam=&maNV=&loai=
//   POST   /api/thuong-phat
//   PUT    /api/thuong-phat/:id
//   DELETE /api/thuong-phat/:id
const express = require('express');
const db = require('../db');
const { pick, requireFields, setClause, notFound, badRequest } = require('../utils');

const router = express.Router();
const FIELDS = ['MaNV', 'Thang', 'Nam', 'Loai', 'SoTien', 'LyDo'];

const SELECT_TP = `
  SELECT tp.*, nv.HoTen, pb.TenPB
  FROM ThuongPhat tp
  JOIN NhanVien nv ON nv.MaNV = tp.MaNV
  JOIN PhongBan pb ON pb.MaPB = nv.MaPB`;

function validate(d) {
  if (d.Loai !== undefined && !['Thuong', 'Phat'].includes(d.Loai)) throw badRequest('Loại phải là Thuong hoặc Phat');
  if (d.SoTien !== undefined && !(Number(d.SoTien) > 0)) throw badRequest('Số tiền phải lớn hơn 0');
  if (d.Thang !== undefined && !(Number(d.Thang) >= 1 && Number(d.Thang) <= 12)) throw badRequest('Tháng phải từ 1 đến 12');
}

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  for (const [q, col] of [['thang', 'tp.Thang'], ['nam', 'tp.Nam'], ['maNV', 'tp.MaNV'], ['loai', 'tp.Loai']]) {
    if (req.query[q]) { where.push(`${col} = ?`); params.push(req.query[q]); }
  }
  const [rows] = await db.query(
    `${SELECT_TP} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY tp.Nam DESC, tp.Thang DESC, tp.MaTP DESC`, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const data = pick(req.body, FIELDS);
  requireFields(data, FIELDS);
  validate(data);
  const [r] = await db.query('INSERT INTO ThuongPhat SET ?', [data]);
  const [rows] = await db.query(`${SELECT_TP} WHERE tp.MaTP = ?`, [r.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const data = pick(req.body, FIELDS);
  validate(data);
  const { sql, values } = setClause(data);
  const [r] = await db.query(`UPDATE ThuongPhat SET ${sql} WHERE MaTP = ?`, [...values, req.params.id]);
  if (!r.affectedRows) throw notFound();
  const [rows] = await db.query(`${SELECT_TP} WHERE tp.MaTP = ?`, [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const [r] = await db.query('DELETE FROM ThuongPhat WHERE MaTP = ?', [req.params.id]);
  if (!r.affectedRows) throw notFound();
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
