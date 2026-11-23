// Báo cáo – thống kê (các truy vấn phức tạp: JOIN, GROUP BY, HAVING, aggregate, subquery)
//   GET /api/bao-cao/tong-quan?thang=&nam=             số liệu tổng quan cho dashboard
//   GET /api/bao-cao/quy-luong-phong-ban?thang=&nam=   quỹ lương theo phòng ban
//   GET /api/bao-cao/vi-pham?thang=&nam=&soLanMuon=3   NV đi muộn nhiều / nghỉ không phép
//   GET /api/bao-cao/tren-binh-quan?thang=&nam=        NV lương cao hơn bình quân phòng
//   GET /api/bao-cao/top-thuong?nam=&tuThang=&denThang=&top=5
//   GET /api/bao-cao/xu-huong?nam=                     quỹ lương từng tháng theo phòng ban
//   GET /api/bao-cao/xuat-excel?thang=&nam=            tải file Excel bảng lương
const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../db');
const { parseKy, badRequest, notFound } = require('../utils');

const router = express.Router();

router.get('/tong-quan', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [[nv]] = await db.query(
    `SELECT COUNT(*) AS TongNhanVien, SUM(TrangThai = 'DangLam') AS DangLam,
            (SELECT COUNT(*) FROM PhongBan) AS SoPhongBan
     FROM NhanVien`);
  const [[luong]] = await db.query(
    `SELECT COUNT(*) AS SoPhieu, COALESCE(SUM(ThucLinh), 0) AS TongQuyLuong,
            COALESCE(ROUND(AVG(ThucLinh)), 0) AS LuongBinhQuan,
            COALESCE(SUM(TongThuong), 0) AS TongThuong, COALESCE(SUM(TongPhat), 0) AS TongPhat
     FROM BangLuong WHERE Thang = ? AND Nam = ?`, [thang, nam]);
  const [[cc]] = await db.query(
    `SELECT COUNT(*) AS SoLuot, SUM(TrangThai = 'DiMuon') AS DiMuon,
            SUM(TrangThai = 'NghiPhep') AS NghiPhep, SUM(TrangThai = 'NghiKhongPhep') AS NghiKhongPhep
     FROM ChamCong WHERE YEAR(Ngay) = ? AND MONTH(Ngay) = ?`, [nam, thang]);
  const so = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v) || 0]));
  res.json({ thang, nam, nhanVien: so(nv), luong: so(luong), chamCong: so(cc) });
});

// Truy vấn 1: JOIN 3 bảng + GROUP BY + SUM/AVG/MAX/MIN
router.get('/quy-luong-phong-ban', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [rows] = await db.query(
    `SELECT pb.MaPB, pb.TenPB,
            COUNT(bl.MaNV)          AS SoNhanVien,
            SUM(bl.ThucLinh)        AS TongQuyLuong,
            ROUND(AVG(bl.ThucLinh)) AS LuongBinhQuan,
            MAX(bl.ThucLinh)        AS CaoNhat,
            MIN(bl.ThucLinh)        AS ThapNhat,
            SUM(bl.TongThuong)      AS TongThuong,
            SUM(bl.TongPhat)        AS TongPhat
     FROM PhongBan pb
     JOIN NhanVien nv  ON nv.MaPB = pb.MaPB
     JOIN BangLuong bl ON bl.MaNV = nv.MaNV AND bl.Thang = ? AND bl.Nam = ?
     GROUP BY pb.MaPB, pb.TenPB
     ORDER BY TongQuyLuong DESC`, [thang, nam]);
  res.json(rows);
});

// Truy vấn 2: GROUP BY + HAVING
router.get('/vi-pham', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const soLanMuon = Number(req.query.soLanMuon ?? 3);
  if (!(soLanMuon >= 0)) throw badRequest('soLanMuon không hợp lệ');
  const [rows] = await db.query(
    `SELECT nv.MaNV, nv.HoTen, pb.TenPB,
            SUM(cc.TrangThai = 'DiMuon')        AS DiMuon,
            SUM(cc.TrangThai = 'NghiKhongPhep') AS NghiKhongPhep,
            SUM(cc.TrangThai = 'DiMuon') * 50000 AS TienPhatDiMuon
     FROM NhanVien nv
     JOIN PhongBan pb ON pb.MaPB = nv.MaPB
     JOIN ChamCong cc ON cc.MaNV = nv.MaNV
     WHERE YEAR(cc.Ngay) = ? AND MONTH(cc.Ngay) = ?
     GROUP BY nv.MaNV, nv.HoTen, pb.TenPB
     HAVING DiMuon >= ? OR NghiKhongPhep > 0
     ORDER BY DiMuon DESC, NghiKhongPhep DESC`, [nam, thang, soLanMuon]);
  res.json(rows.map((r) => ({ ...r, DiMuon: +r.DiMuon, NghiKhongPhep: +r.NghiKhongPhep, TienPhatDiMuon: +r.TienPhatDiMuon })));
});

// Truy vấn 3: subquery tương quan
router.get('/tren-binh-quan', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [rows] = await db.query(
    `SELECT p.MaNV, p.HoTen, p.TenPB, p.TenCV, p.ThucLinh, bq.BinhQuanPhong,
            p.ThucLinh - bq.BinhQuanPhong AS ChenhLech
     FROM v_PhieuLuong p
     JOIN (SELECT TenPB, ROUND(AVG(ThucLinh)) AS BinhQuanPhong
           FROM v_PhieuLuong WHERE Thang = ? AND Nam = ? GROUP BY TenPB) bq ON bq.TenPB = p.TenPB
     WHERE p.Thang = ? AND p.Nam = ?
       AND p.ThucLinh > (SELECT AVG(p2.ThucLinh) FROM v_PhieuLuong p2
                         WHERE p2.TenPB = p.TenPB AND p2.Thang = p.Thang AND p2.Nam = p.Nam)
     ORDER BY p.TenPB, p.ThucLinh DESC`, [thang, nam, thang, nam]);
  res.json(rows);
});

// Truy vấn 4: top nhân viên nhận thưởng nhiều nhất trong khoảng tháng
router.get('/top-thuong', async (req, res) => {
  const nam = Number(req.query.nam);
  const tuThang = Number(req.query.tuThang ?? 1);
  const denThang = Number(req.query.denThang ?? 12);
  const top = Math.min(Number(req.query.top) || 5, 50);
  if (!nam || tuThang < 1 || denThang > 12 || tuThang > denThang) throw badRequest('Khoảng thời gian không hợp lệ');
  const [rows] = await db.query(
    `SELECT nv.MaNV, nv.HoTen, pb.TenPB, COUNT(*) AS SoLanThuong, SUM(tp.SoTien) AS TongTienThuong
     FROM ThuongPhat tp
     JOIN NhanVien nv ON nv.MaNV = tp.MaNV
     JOIN PhongBan pb ON pb.MaPB = nv.MaPB
     WHERE tp.Loai = 'Thuong' AND tp.Nam = ? AND tp.Thang BETWEEN ? AND ?
     GROUP BY nv.MaNV, nv.HoTen, pb.TenPB
     ORDER BY TongTienThuong DESC
     LIMIT ?`, [nam, tuThang, denThang, top]);
  res.json(rows);
});

// Truy vấn 5: xu hướng quỹ lương theo tháng, theo phòng ban (dùng cho biểu đồ)
router.get('/xu-huong', async (req, res) => {
  const nam = Number(req.query.nam);
  if (!nam) throw badRequest('Thiếu năm');
  const [rows] = await db.query(
    `SELECT bl.Thang, pb.TenPB, SUM(bl.ThucLinh) AS TongQuyLuong, COUNT(*) AS SoNhanVien
     FROM BangLuong bl
     JOIN NhanVien nv ON nv.MaNV = bl.MaNV
     JOIN PhongBan pb ON pb.MaPB = nv.MaPB
     WHERE bl.Nam = ?
     GROUP BY bl.Thang, pb.TenPB
     ORDER BY bl.Thang, pb.TenPB`, [nam]);
  res.json(rows);
});

// Xuất bảng lương tháng ra file Excel
router.get('/xuat-excel', async (req, res) => {
  const { thang, nam } = parseKy(req.query);
  const [rows] = await db.query(
    'SELECT * FROM v_PhieuLuong WHERE Thang = ? AND Nam = ? ORDER BY TenPB, MaNV', [thang, nam]);
  if (!rows.length) throw notFound(`Chưa có bảng lương tháng ${thang}/${nam}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ thống quản lý lương';
  const ws = wb.addWorksheet(`Luong T${thang}-${nam}`, { views: [{ state: 'frozen', ySplit: 3 }] });
  const cols = [
    ['STT', 6], ['Mã NV', 9], ['Họ tên', 24], ['Phòng ban', 20], ['Chức vụ', 15],
    ['Công chuẩn', 11], ['Ngày công', 11], ['Đi muộn', 9], ['Lương cơ bản', 15], ['Lương theo công', 16],
    ['Phụ cấp', 13], ['Thưởng', 13], ['Phạt', 12], ['Thực lĩnh', 16],
  ];
  ws.columns = cols.map(([, width]) => ({ width }));
  ws.mergeCells(1, 1, 1, cols.length);
  ws.getCell(1, 1).value = `BẢNG LƯƠNG THÁNG ${thang}/${nam}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.getCell(1, 1).alignment = { horizontal: 'center' };
  const header = ws.getRow(3);
  header.values = cols.map(([t]) => t);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  rows.forEach((r, i) => {
    ws.addRow([i + 1, r.MaNV, r.HoTen, r.TenPB, r.TenCV, r.NgayCongChuan, r.SoNgayCong, r.SoLanDiMuon,
      r.LuongCoBan, r.LuongTheoCong, r.PhuCap, r.TongThuong, r.TongPhat, r.ThucLinh]);
  });
  const dau = 4;
  const cuoi = dau + rows.length - 1;
  const tong = ws.addRow(['', '', 'TỔNG CỘNG']);
  for (const c of [9, 10, 11, 12, 13, 14]) {
    const L = ws.getColumn(c).letter;
    tong.getCell(c).value = { formula: `SUM(${L}${dau}:${L}${cuoi})` };
  }
  tong.font = { bold: true };
  for (let c = 9; c <= 14; c++) ws.getColumn(c).numFmt = '#,##0';
  ws.eachRow((row, n) => {
    if (n < 3) return;
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="bang-luong-${nam}-${String(thang).padStart(2, '0')}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
