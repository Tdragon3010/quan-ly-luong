-- =============================================================
--  Các truy vấn phức tạp (JOIN, GROUP BY, aggregate, subquery)
--  Đề tài 13: Quản lý lương nhân viên
-- =============================================================
USE quan_ly_luong;

-- Q1. Bảng lương chi tiết tháng 10/2026: lương theo công + thưởng − phạt
--     (JOIN 4 bảng qua view v_PhieuLuong)
SELECT MaNV, HoTen, TenPB, TenCV, SoNgayCong, SoLanDiMuon,
       LuongCoBan, LuongTheoCong, PhuCap, TongThuong, TongPhat, ThucLinh
FROM v_PhieuLuong
WHERE Thang = 10 AND Nam = 2026
ORDER BY ThucLinh DESC;

-- Q2. Tổng quỹ lương, lương bình quân, cao nhất, thấp nhất theo phòng ban – tháng 10/2026
--     (JOIN + GROUP BY + SUM/AVG/MAX/MIN)
SELECT pb.MaPB, pb.TenPB,
       COUNT(bl.MaNV)          AS SoNhanVien,
       SUM(bl.ThucLinh)        AS TongQuyLuong,
       ROUND(AVG(bl.ThucLinh)) AS LuongBinhQuan,
       MAX(bl.ThucLinh)        AS CaoNhat,
       MIN(bl.ThucLinh)        AS ThapNhat
FROM PhongBan pb
JOIN NhanVien nv ON nv.MaPB = pb.MaPB
JOIN BangLuong bl ON bl.MaNV = nv.MaNV AND bl.Thang = 10 AND bl.Nam = 2026
GROUP BY pb.MaPB, pb.TenPB
ORDER BY TongQuyLuong DESC;

-- Q3. Thống kê chấm công tháng 10/2026 từng nhân viên; lọc những người
--     đi muộn từ 3 lần trở lên hoặc có nghỉ không phép (GROUP BY + HAVING)
SELECT nv.MaNV, nv.HoTen, pb.TenPB,
       SUM(cc.TrangThai = 'DiLam')         AS DiLam,
       SUM(cc.TrangThai = 'DiMuon')        AS DiMuon,
       SUM(cc.TrangThai = 'NghiPhep')      AS NghiPhep,
       SUM(cc.TrangThai = 'NghiKhongPhep') AS NghiKhongPhep
FROM NhanVien nv
JOIN PhongBan pb ON pb.MaPB = nv.MaPB
JOIN ChamCong cc ON cc.MaNV = nv.MaNV
WHERE cc.Ngay BETWEEN '2026-10-01' AND '2026-10-31'
GROUP BY nv.MaNV, nv.HoTen, pb.TenPB
HAVING DiMuon >= 3 OR NghiKhongPhep > 0
ORDER BY DiMuon DESC, NghiKhongPhep DESC;

-- Q4. Nhân viên có thực lĩnh tháng 10/2026 cao hơn mức bình quân của chính phòng ban mình
--     (subquery tương quan)
SELECT p.MaNV, p.HoTen, p.TenPB, p.ThucLinh,
       (SELECT ROUND(AVG(p2.ThucLinh)) FROM v_PhieuLuong p2
        WHERE p2.TenPB = p.TenPB AND p2.Thang = p.Thang AND p2.Nam = p.Nam) AS BinhQuanPhong
FROM v_PhieuLuong p
WHERE p.Thang = 10 AND p.Nam = 2026
  AND p.ThucLinh > (SELECT AVG(p2.ThucLinh) FROM v_PhieuLuong p2
                    WHERE p2.TenPB = p.TenPB AND p2.Thang = p.Thang AND p2.Nam = p.Nam)
ORDER BY p.TenPB, p.ThucLinh DESC;

-- Q5. Top 5 nhân viên nhận thưởng nhiều nhất quý III–IV/2026 (tháng 9–11)
SELECT nv.MaNV, nv.HoTen, pb.TenPB,
       COUNT(*)       AS SoLanThuong,
       SUM(tp.SoTien) AS TongTienThuong
FROM ThuongPhat tp
JOIN NhanVien nv ON nv.MaNV = tp.MaNV
JOIN PhongBan pb ON pb.MaPB = nv.MaPB
WHERE tp.Loai = 'Thuong' AND tp.Nam = 2026 AND tp.Thang BETWEEN 9 AND 11
GROUP BY nv.MaNV, nv.HoTen, pb.TenPB
ORDER BY TongTienThuong DESC
LIMIT 5;

-- Q6. So sánh tổng quỹ lương tháng 9 và tháng 10/2026 theo phòng ban (pivot bằng CASE)
SELECT pb.TenPB,
       SUM(CASE WHEN bl.Thang = 9  THEN bl.ThucLinh ELSE 0 END) AS Thang9,
       SUM(CASE WHEN bl.Thang = 10 THEN bl.ThucLinh ELSE 0 END) AS Thang10,
       SUM(CASE WHEN bl.Thang = 10 THEN bl.ThucLinh ELSE 0 END)
     - SUM(CASE WHEN bl.Thang = 9  THEN bl.ThucLinh ELSE 0 END) AS ChenhLech
FROM BangLuong bl
JOIN NhanVien nv ON nv.MaNV = bl.MaNV
JOIN PhongBan pb ON pb.MaPB = nv.MaPB
WHERE bl.Nam = 2026 AND bl.Thang IN (9, 10)
GROUP BY pb.TenPB
ORDER BY Thang10 DESC;

-- Q7. Tính lương tạm tính tháng 11/2026 (thủ tục lưu trữ)
-- CALL sp_TinhLuong(11, 2026);
