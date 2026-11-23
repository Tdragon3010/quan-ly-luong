-- =============================================================
--  Đề tài 13: QUẢN LÝ LƯƠNG NHÂN VIÊN
--  Script tạo CSDL (MySQL 8.0)
-- =============================================================
DROP DATABASE IF EXISTS quan_ly_luong;
CREATE DATABASE quan_ly_luong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quan_ly_luong;

-- -------------------------------------------------------------
-- 1. Phòng ban
-- -------------------------------------------------------------
CREATE TABLE PhongBan (
    MaPB   VARCHAR(10)  NOT NULL,
    TenPB  VARCHAR(100) NOT NULL,
    MoTa   VARCHAR(255) NULL,
    CONSTRAINT PK_PhongBan PRIMARY KEY (MaPB),
    CONSTRAINT UQ_PhongBan_Ten UNIQUE (TenPB)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- 2. Chức vụ (quy định phụ cấp chức vụ)
-- -------------------------------------------------------------
CREATE TABLE ChucVu (
    MaCV    VARCHAR(10)   NOT NULL,
    TenCV   VARCHAR(100)  NOT NULL,
    PhuCap  DECIMAL(15,0) NOT NULL DEFAULT 0,
    CONSTRAINT PK_ChucVu PRIMARY KEY (MaCV),
    CONSTRAINT UQ_ChucVu_Ten UNIQUE (TenCV),
    CONSTRAINT CK_ChucVu_PhuCap CHECK (PhuCap >= 0)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- 3. Nhân viên
-- -------------------------------------------------------------
CREATE TABLE NhanVien (
    MaNV         VARCHAR(10)   NOT NULL,
    HoTen        VARCHAR(100)  NOT NULL,
    NgaySinh     DATE          NOT NULL,
    GioiTinh     ENUM('Nam','Nu') NOT NULL,
    SoDienThoai  VARCHAR(15)   NOT NULL,
    Email        VARCHAR(100)  NOT NULL,
    NgayVaoLam   DATE          NOT NULL,
    MaPB         VARCHAR(10)   NOT NULL,
    MaCV         VARCHAR(10)   NOT NULL,
    LuongCoBan   DECIMAL(15,0) NOT NULL,
    TrangThai    ENUM('DangLam','DaNghi') NOT NULL DEFAULT 'DangLam',
    CONSTRAINT PK_NhanVien PRIMARY KEY (MaNV),
    CONSTRAINT UQ_NhanVien_Email UNIQUE (Email),
    CONSTRAINT UQ_NhanVien_SDT UNIQUE (SoDienThoai),
    CONSTRAINT FK_NhanVien_PhongBan FOREIGN KEY (MaPB) REFERENCES PhongBan (MaPB)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT FK_NhanVien_ChucVu FOREIGN KEY (MaCV) REFERENCES ChucVu (MaCV)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT CK_NhanVien_Luong CHECK (LuongCoBan > 0),
    CONSTRAINT CK_NhanVien_NgayVaoLam CHECK (NgayVaoLam > NgaySinh)
) ENGINE = InnoDB;

CREATE INDEX IX_NhanVien_HoTen ON NhanVien (HoTen);

-- -------------------------------------------------------------
-- 4. Chấm công (mỗi nhân viên tối đa 1 bản ghi / ngày)
-- -------------------------------------------------------------
CREATE TABLE ChamCong (
    MaCC       INT          NOT NULL AUTO_INCREMENT,
    MaNV       VARCHAR(10)  NOT NULL,
    Ngay       DATE         NOT NULL,
    GioVao     TIME         NULL,
    GioRa      TIME         NULL,
    TrangThai  ENUM('DiLam','DiMuon','NghiPhep','NghiKhongPhep') NOT NULL DEFAULT 'DiLam',
    CONSTRAINT PK_ChamCong PRIMARY KEY (MaCC),
    CONSTRAINT UQ_ChamCong_NV_Ngay UNIQUE (MaNV, Ngay),
    CONSTRAINT FK_ChamCong_NhanVien FOREIGN KEY (MaNV) REFERENCES NhanVien (MaNV)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT CK_ChamCong_Gio CHECK (GioRa IS NULL OR GioVao IS NULL OR GioRa > GioVao)
) ENGINE = InnoDB;

CREATE INDEX IX_ChamCong_Ngay ON ChamCong (Ngay);

-- -------------------------------------------------------------
-- 5. Thưởng / phạt
-- -------------------------------------------------------------
CREATE TABLE ThuongPhat (
    MaTP     INT           NOT NULL AUTO_INCREMENT,
    MaNV     VARCHAR(10)   NOT NULL,
    Thang    TINYINT       NOT NULL,
    Nam      SMALLINT      NOT NULL,
    Loai     ENUM('Thuong','Phat') NOT NULL,
    SoTien   DECIMAL(15,0) NOT NULL,
    LyDo     VARCHAR(255)  NOT NULL,
    NgayTao  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_ThuongPhat PRIMARY KEY (MaTP),
    CONSTRAINT FK_ThuongPhat_NhanVien FOREIGN KEY (MaNV) REFERENCES NhanVien (MaNV)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT CK_ThuongPhat_Thang CHECK (Thang BETWEEN 1 AND 12),
    CONSTRAINT CK_ThuongPhat_Nam CHECK (Nam BETWEEN 2000 AND 2100),
    CONSTRAINT CK_ThuongPhat_SoTien CHECK (SoTien > 0)
) ENGINE = InnoDB;

CREATE INDEX IX_ThuongPhat_KyLuong ON ThuongPhat (Nam, Thang);

-- -------------------------------------------------------------
-- 6. Bảng lương (1 phiếu lương / nhân viên / tháng)
--    LuongTheoCong và ThucLinh là cột sinh tự động.
-- -------------------------------------------------------------
CREATE TABLE BangLuong (
    MaBL           INT           NOT NULL AUTO_INCREMENT,
    MaNV           VARCHAR(10)   NOT NULL,
    Thang          TINYINT       NOT NULL,
    Nam            SMALLINT      NOT NULL,
    NgayCongChuan  TINYINT       NOT NULL DEFAULT 26,
    SoNgayCong     DECIMAL(4,1)  NOT NULL DEFAULT 0,
    SoLanDiMuon    SMALLINT      NOT NULL DEFAULT 0,
    LuongCoBan     DECIMAL(15,0) NOT NULL,
    PhuCap         DECIMAL(15,0) NOT NULL DEFAULT 0,
    TongThuong     DECIMAL(15,0) NOT NULL DEFAULT 0,
    TongPhat       DECIMAL(15,0) NOT NULL DEFAULT 0,
    LuongTheoCong  DECIMAL(15,0) AS (ROUND(LuongCoBan / NgayCongChuan * SoNgayCong, 0)) STORED,
    ThucLinh       DECIMAL(15,0) AS (ROUND(LuongCoBan / NgayCongChuan * SoNgayCong, 0)
                                     + PhuCap + TongThuong - TongPhat) STORED,
    NgayTinh       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_BangLuong PRIMARY KEY (MaBL),
    CONSTRAINT UQ_BangLuong_Ky UNIQUE (MaNV, Thang, Nam),
    CONSTRAINT FK_BangLuong_NhanVien FOREIGN KEY (MaNV) REFERENCES NhanVien (MaNV)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT CK_BangLuong_Thang CHECK (Thang BETWEEN 1 AND 12),
    CONSTRAINT CK_BangLuong_NgayCong CHECK (SoNgayCong >= 0 AND NgayCongChuan > 0),
    CONSTRAINT CK_BangLuong_Tien CHECK (LuongCoBan > 0 AND PhuCap >= 0 AND TongThuong >= 0 AND TongPhat >= 0)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- 7. View: phiếu lương đầy đủ thông tin (dùng cho báo cáo)
-- -------------------------------------------------------------
CREATE VIEW v_PhieuLuong AS
SELECT bl.MaBL, bl.Thang, bl.Nam,
       nv.MaNV, nv.HoTen, pb.TenPB, cv.TenCV,
       bl.NgayCongChuan, bl.SoNgayCong, bl.SoLanDiMuon,
       bl.LuongCoBan, bl.LuongTheoCong, bl.PhuCap,
       bl.TongThuong, bl.TongPhat, bl.ThucLinh, bl.NgayTinh
FROM BangLuong bl
JOIN NhanVien nv ON nv.MaNV = bl.MaNV
JOIN PhongBan pb ON pb.MaPB = nv.MaPB
JOIN ChucVu   cv ON cv.MaCV = nv.MaCV;

-- -------------------------------------------------------------
-- 8. Thủ tục tính lương tháng cho nhân viên đang làm (và người đã nghỉ
--    nhưng còn chấm công trong tháng đó)
--    Công  = DiLam + DiMuon + NghiPhep
--    Phạt  = tổng khoản phạt + 50.000đ x số lần đi muộn
--    Chạy lại sẽ cập nhật (ghi đè) phiếu lương của tháng đó.
-- -------------------------------------------------------------
DELIMITER $$
CREATE PROCEDURE sp_TinhLuong (IN p_thang TINYINT, IN p_nam SMALLINT)
BEGIN
    DECLARE v_ngay_cong_chuan TINYINT DEFAULT 0;
    DECLARE v_phat_di_muon    DECIMAL(15,0) DEFAULT 50000;
    DECLARE v_ngay            DATE;

    IF p_thang NOT BETWEEN 1 AND 12 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tháng không hợp lệ';
    END IF;

    -- Ngày công chuẩn = số ngày từ thứ Hai đến thứ Bảy trong tháng
    SET v_ngay = MAKEDATE(p_nam, 1) + INTERVAL (p_thang - 1) MONTH;
    WHILE MONTH(v_ngay) = p_thang DO
        IF DAYOFWEEK(v_ngay) <> 1 THEN          -- 1 = Chủ nhật
            SET v_ngay_cong_chuan = v_ngay_cong_chuan + 1;
        END IF;
        SET v_ngay = v_ngay + INTERVAL 1 DAY;
    END WHILE;

    INSERT INTO BangLuong (MaNV, Thang, Nam, NgayCongChuan, SoNgayCong, SoLanDiMuon,
                           LuongCoBan, PhuCap, TongThuong, TongPhat)
    SELECT * FROM (
        SELECT nv.MaNV, p_thang AS Thang, p_nam AS Nam, v_ngay_cong_chuan AS NgayCongChuan,
               COALESCE(cc.SoNgayCong, 0)  AS SoNgayCong,
               COALESCE(cc.SoLanDiMuon, 0) AS SoLanDiMuon,
               nv.LuongCoBan, cv.PhuCap,
               COALESCE(tp.TongThuong, 0) AS TongThuong,
               COALESCE(tp.TongPhat, 0) + v_phat_di_muon * COALESCE(cc.SoLanDiMuon, 0) AS TongPhat
        FROM NhanVien nv
        JOIN ChucVu cv ON cv.MaCV = nv.MaCV
        LEFT JOIN (
            SELECT MaNV,
                   SUM(TrangThai IN ('DiLam','DiMuon','NghiPhep')) AS SoNgayCong,
                   SUM(TrangThai = 'DiMuon')                     AS SoLanDiMuon
            FROM ChamCong
            WHERE Ngay >= MAKEDATE(p_nam, 1) + INTERVAL (p_thang - 1) MONTH
              AND Ngay <  MAKEDATE(p_nam, 1) + INTERVAL p_thang MONTH
            GROUP BY MaNV
        ) cc ON cc.MaNV = nv.MaNV
        LEFT JOIN (
            SELECT MaNV,
                   SUM(CASE WHEN Loai = 'Thuong' THEN SoTien ELSE 0 END) AS TongThuong,
                   SUM(CASE WHEN Loai = 'Phat'   THEN SoTien ELSE 0 END) AS TongPhat
            FROM ThuongPhat
            WHERE Thang = p_thang AND Nam = p_nam
            GROUP BY MaNV
        ) tp ON tp.MaNV = nv.MaNV
        -- Người đang làm, hoặc đã nghỉ nhưng vẫn có chấm công trong tháng đó
        WHERE nv.TrangThai = 'DangLam' OR cc.MaNV IS NOT NULL
    ) AS src
    ON DUPLICATE KEY UPDATE
        NgayCongChuan = src.NgayCongChuan,
        SoNgayCong    = src.SoNgayCong,
        SoLanDiMuon   = src.SoLanDiMuon,
        LuongCoBan    = src.LuongCoBan,
        PhuCap        = src.PhuCap,
        TongThuong    = src.TongThuong,
        TongPhat      = src.TongPhat,
        NgayTinh      = CURRENT_TIMESTAMP;

    SELECT ROW_COUNT() AS SoDongAnhHuong;
END$$
DELIMITER ;
