// CRUD danh mục: Phòng ban và Chức vụ
//   GET    /api/phong-ban          danh sách (kèm số nhân viên đang làm)
//   GET    /api/phong-ban/:ma      chi tiết
//   POST   /api/phong-ban          thêm
//   PUT    /api/phong-ban/:ma      sửa
//   DELETE /api/phong-ban/:ma      xóa (bị chặn nếu còn nhân viên)
// Tương tự cho /api/chuc-vu
const express = require('express');
const db = require('../db');
const { pick, requireFields, setClause, notFound, badRequest } = require('../utils');

function crudDanhMuc({ table, key, fields, required, validate }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const [rows] = await db.query(
      `SELECT t.*, COUNT(nv.MaNV) AS SoNhanVien
       FROM ${table} t
       LEFT JOIN NhanVien nv ON nv.${key} = t.${key} AND nv.TrangThai = 'DangLam'
       GROUP BY t.${key}
       ORDER BY t.${key}`);
    res.json(rows);
  });

  router.get('/:ma', async (req, res) => {
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE ${key} = ?`, [req.params.ma]);
    if (!rows.length) throw notFound();
    res.json(rows[0]);
  });

  router.post('/', async (req, res) => {
    const data = pick(req.body, [key, ...fields]);
    requireFields(data, [key, ...required]);
    if (validate) validate(data);
    await db.query(`INSERT INTO ${table} SET ?`, [data]);
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE ${key} = ?`, [data[key]]);
    res.status(201).json(rows[0]);
  });

  router.put('/:ma', async (req, res) => {
    const data = pick(req.body, fields);
    if (validate) validate(data);
    const { sql, values } = setClause(data);
    const [r] = await db.query(`UPDATE ${table} SET ${sql} WHERE ${key} = ?`, [...values, req.params.ma]);
    if (!r.affectedRows) throw notFound();
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE ${key} = ?`, [req.params.ma]);
    res.json(rows[0]);
  });

  router.delete('/:ma', async (req, res) => {
    const [r] = await db.query(`DELETE FROM ${table} WHERE ${key} = ?`, [req.params.ma]);
    if (!r.affectedRows) throw notFound();
    res.json({ message: 'Đã xóa' });
  });

  return router;
}

const phongBan = crudDanhMuc({
  table: 'PhongBan', key: 'MaPB', fields: ['TenPB', 'MoTa'], required: ['TenPB'],
});

const chucVu = crudDanhMuc({
  table: 'ChucVu', key: 'MaCV', fields: ['TenCV', 'PhuCap'], required: ['TenCV'],
  validate: (d) => {
    if (d.PhuCap !== undefined && !(Number(d.PhuCap) >= 0)) throw badRequest('Phụ cấp phải là số không âm');
  },
});

module.exports = { phongBan, chucVu };
