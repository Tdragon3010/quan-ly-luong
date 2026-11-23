// Chấm công
//   GET    /api/cham-cong?maNV=&tu=&den=&trangThai=   tra cứu lịch sử
//   GET    /api/cham-cong/ngay/:ngay                  bảng chấm công 1 ngày (mọi NV đang làm)
//   PUT    /api/cham-cong/ngay/:ngay                  lưu cả bảng chấm công 1 ngày (thêm hoặc cập nhật)
//   GET    /api/cham-cong/tong-hop?thang=&nam=        tổng hợp công theo tháng
//   POST   /api/cham-cong                             thêm 1 bản ghi
//   PUT    /api/cham-cong/:id                         sửa 1 bản ghi
//   DELETE /api/cham-cong/:id                         xóa 1 bản ghi
const express = require('express');
const db = require('../db');
const { pick, requireFields, setClause, notFound, badRequest, isDate, isTime, parseKy } = require('../utils');

const router = express.Router();
const TRANG_THAI = ['DiLam', 'DiMuon', 'NghiPhep', 'NghiKhongPhep'];
const GIO_BAT_DAU = '08:00';

// Chuẩn hóa 1 bản ghi chấm công:
//  - nghỉ thì không có giờ vào/ra
//  - nếu không gửi TrangThai thì tự suy ra từ giờ vào (sau 08:00 là đi muộn)
function chuanHoa(d) {
  for (const f of ['GioVao', 'GioRa']) {
    if (d[f] === '') d[f] = null;
    if (d[f] != null && !isTime(d[f])) throw badRequest(`${f} phải có dạng HH:MM`);
  }
  if (d.TrangThai === undefined && d.GioVao) d.TrangThai = d.GioVao.slice(0, 5) > GIO_BAT_DAU ? 'DiMuon' : 'DiLam';
  if (d.TrangThai !== undefined && !TRANG_THAI.includes(d.TrangThai)) {
    throw badRequest(`Trạng thái phải là một trong: ${TRANG_THAI.join(', ')}`);
  }
  if (d.TrangThai === 'NghiPhep' || d.TrangThai === 'NghiKhongPhep') { d.GioVao = null; d.GioRa = null; }
  if ((d.TrangThai === 'DiLam' || d.TrangThai === 'DiMuon') && d.GioVao === null) {
    throw badRequest('Đi làm / đi muộn phải có giờ vào');
  }
  if (d.GioVao && d.GioRa && d.GioRa <= d.GioVao) throw badRequest('Giờ ra phải sau giờ vào');
  return d;
}

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.maNV) { where.push('cc.MaNV = ?'); params.push(req.query.maNV); }
  if (req.query.tu) { where.push('cc.Ngay >= ?'); params.push(req.query.tu); }
  if (req.query.den) { where.push('cc.Ngay <= ?'); params.push(req.query.den); }
  if (req.query.trangThai) { where.push('cc.TrangThai = ?'); params.push(req.query.trangThai); }
  const limit = Math.min(Number(req.query.limit) || 500, 5000);
  const [rows] = await db.query(
    `SELECT cc.*, nv.HoTen, pb.TenPB
     FROM ChamCong cc
     JOIN NhanVien nv ON nv.MaNV = cc.MaNV
     JOIN PhongBan pb ON pb.MaPB = nv.MaPB
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY cc.Ngay DESC, cc.MaNV
     LIMIT ?`, [...params, limit]);
  res.json(rows);
});

// Bảng chấm công của 1 ngày: liệt kê mọi nhân viên đang làm, kèm bản ghi nếu đã chấm
router.get('/ngay/:ngay', async (req, res) => {
  const { ngay } = req.params;
  if (!isDate(ngay)) throw badRequest('Ngày phải có dạng YYYY-MM-DD');
  const params = [ngay, ngay];
  let locPB = '';
  if (req.query.maPB) { locPB = 'AND nv.MaPB = ?'; params.push(req.query.maPB); }
  const [rows] = await db.query(
    `SELECT nv.MaNV, nv.HoTen, pb.TenPB, cc.MaCC, cc.GioVao, cc.GioRa, cc.TrangThai
     FROM NhanVien nv
     JOIN PhongBan pb ON pb.MaPB = nv.MaPB
     LEFT JOIN ChamCong cc ON cc.MaNV = nv.MaNV AND cc.Ngay = ?
     WHERE nv.TrangThai = 'DangLam' AND nv.NgayVaoLam <= ? ${locPB}
     ORDER BY nv.MaNV`, params);
  res.json(rows);
});

// Lưu cả bảng chấm công 1 ngày trong 1 transaction
router.put('/ngay/:ngay', async (req, res) => {
  const { ngay } = req.params;
  if (!isDate(ngay)) throw badRequest('Ngày phải có dạng YYYY-MM-DD');
  if (!Array.isArray(req.body) || !req.body.length) throw badRequest('Body phải là mảng các bản ghi chấm công');
  const banGhi = req.body.map((r) => {
    const d = pick(r, ['MaNV', 'GioVao', 'GioRa', 'TrangThai']);
    requireFields(d, ['MaNV']);
    try { return chuanHoa(d); } catch (e) { e.message = `${d.MaNV}: ${e.message}`; throw e; }
  });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const d of banGhi) {
      await conn.query(
        `INSERT INTO ChamCong (MaNV, Ngay, GioVao, GioRa, TrangThai) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE GioVao = VALUES(GioVao), GioRa = VALUES(GioRa), TrangThai = VALUES(TrangThai)`,
        [d.MaNV, ngay, d.GioVao ?? null, d.GioRa ?? null, d.TrangThai ?? 'DiLam']);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ message: `Đã lưu chấm công ngày ${ngay}`, soBanGhi: banGhi.length });
});

// Tổng hợp công theo tháng cho từng nhân viên (JOIN + GROUP BY)
router.get('/tong-hop', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [rows] = await db.query(
    `SELECT nv.MaNV, nv.HoTen, pb.TenPB,
            SUM(cc.TrangThai = 'DiLam')         AS DiLam,
            SUM(cc.TrangThai = 'DiMuon')        AS DiMuon,
            SUM(cc.TrangThai = 'NghiPhep')      AS NghiPhep,
            SUM(cc.TrangThai = 'NghiKhongPhep') AS NghiKhongPhep,
            SUM(cc.TrangThai IN ('DiLam','DiMuon','NghiPhep')) AS SoNgayCong
     FROM NhanVien nv
     JOIN PhongBan pb ON pb.MaPB = nv.MaPB
     JOIN ChamCong cc ON cc.MaNV = nv.MaNV
     WHERE YEAR(cc.Ngay) = ? AND MONTH(cc.Ngay) = ?
     GROUP BY nv.MaNV, nv.HoTen, pb.TenPB
     ORDER BY nv.MaNV`, [nam, thang]);
  res.json(rows.map((r) => ({ ...r, DiLam: +r.DiLam, DiMuon: +r.DiMuon, NghiPhep: +r.NghiPhep,
    NghiKhongPhep: +r.NghiKhongPhep, SoNgayCong: +r.SoNgayCong })));
});

router.post('/', async (req, res) => {
  const data = chuanHoa(pick(req.body, ['MaNV', 'Ngay', 'GioVao', 'GioRa', 'TrangThai']));
  requireFields(data, ['MaNV', 'Ngay']);
  if (!isDate(data.Ngay)) throw badRequest('Ngày phải có dạng YYYY-MM-DD');
  const [r] = await db.query('INSERT INTO ChamCong SET ?', [data]);
  const [rows] = await db.query('SELECT * FROM ChamCong WHERE MaCC = ?', [r.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const [cu] = await db.query('SELECT * FROM ChamCong WHERE MaCC = ?', [req.params.id]);
  if (!cu.length) throw notFound();
  const moi = pick(req.body, ['GioVao', 'GioRa', 'TrangThai']);
  // Kiểm tra trên bản ghi sau khi gộp để đảm bảo nhất quán
  const gop = chuanHoa({ GioVao: cu[0].GioVao, GioRa: cu[0].GioRa, TrangThai: cu[0].TrangThai, ...moi });
  const { sql, values } = setClause({ GioVao: gop.GioVao, GioRa: gop.GioRa, TrangThai: gop.TrangThai });
  await db.query(`UPDATE ChamCong SET ${sql} WHERE MaCC = ?`, [...values, req.params.id]);
  const [rows] = await db.query('SELECT * FROM ChamCong WHERE MaCC = ?', [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const [r] = await db.query('DELETE FROM ChamCong WHERE MaCC = ?', [req.params.id]);
  if (!r.affectedRows) throw notFound();
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
