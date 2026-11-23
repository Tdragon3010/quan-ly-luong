// Sinh file database/seed.sql với dữ liệu mẫu cố định (seed ngẫu nhiên cố định
// nên chạy lại luôn ra cùng một kết quả).
// Chạy: npm run seed   (hoặc node database/scripts/gen-seed.js)
const fs = require('fs');
const path = require('path');

// ---- PRNG có seed (mulberry32) ----
let seed = 20261123;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const q = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const pad = (n, w = 2) => String(n).padStart(w, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00`;

// ---- Danh mục ----
const phongBan = [
  ['PB01', 'Ban Giám đốc', 'Điều hành chung toàn công ty'],
  ['PB02', 'Phòng Nhân sự', 'Tuyển dụng, đào tạo, chấm công'],
  ['PB03', 'Phòng Kế toán', 'Tài chính, kế toán, tính lương'],
  ['PB04', 'Phòng Kinh doanh', 'Bán hàng và chăm sóc khách hàng'],
  ['PB05', 'Phòng Kỹ thuật', 'Phát triển và vận hành sản phẩm'],
  ['PB06', 'Phòng Marketing', 'Truyền thông, quảng cáo'],
];
const chucVu = [
  ['CV01', 'Giám đốc', 5000000],
  ['CV02', 'Trưởng phòng', 3000000],
  ['CV03', 'Phó phòng', 2000000],
  ['CV04', 'Trưởng nhóm', 1000000],
  ['CV05', 'Nhân viên', 500000],
  ['CV06', 'Thực tập sinh', 0],
];
const luongTheoCV = {
  CV01: [40000000, 45000000], CV02: [22000000, 28000000], CV03: [17000000, 21000000],
  CV04: [14000000, 17000000], CV05: [9000000, 13500000], CV06: [5000000, 6000000],
};

const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const demNam = ['Văn', 'Đức', 'Minh', 'Quang', 'Hữu', 'Thành', 'Công', 'Xuân'];
const demNu = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Phương', 'Mai', 'Hồng', 'Khánh'];
const tenNam = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hiếu', 'Hùng', 'Khoa', 'Long', 'Nam', 'Phong', 'Quân', 'Sơn', 'Thắng', 'Tuấn', 'Việt'];
const tenNu = ['Anh', 'Chi', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Hoa', 'Hương', 'Lan', 'Linh', 'Ly', 'Nga', 'Ngân', 'Nhung', 'Trang', 'Yến'];

// Cơ cấu: [MaPB, MaCV]
const coCau = [['PB01', 'CV01']];
for (const pb of ['PB02', 'PB03', 'PB04', 'PB05', 'PB06']) coCau.push([pb, 'CV02'], [pb, 'CV03']);
const conLai = { PB02: 4, PB03: 4, PB04: 8, PB05: 9, PB06: 4 }; // tổng 29 -> 40 NV
for (const [pb, n] of Object.entries(conLai)) {
  for (let i = 0; i < n; i++) coCau.push([pb, i === 0 ? 'CV04' : i === n - 1 ? 'CV06' : 'CV05']);
}

const usedNames = new Set();
const usedPhones = new Set();
const nhanVien = coCau.map(([maPB, maCV], i) => {
  const maNV = `NV${pad(i + 1, 3)}`;
  const nam = rand() < 0.5;
  let hoTen;
  do {
    hoTen = `${pick(ho)} ${pick(nam ? demNam : demNu)} ${pick(nam ? tenNam : tenNu)}`;
  } while (usedNames.has(hoTen));
  usedNames.add(hoTen);
  let sdt;
  do { sdt = `09${randInt(10000000, 99999999)}`; } while (usedPhones.has(sdt));
  usedPhones.add(sdt);
  const tuoiMin = maCV === 'CV06' ? 21 : maCV === 'CV05' ? 23 : 28;
  const namSinh = 2026 - randInt(tuoiMin, tuoiMin + (maCV === 'CV06' ? 2 : 18));
  const ngaySinh = `${namSinh}-${pad(randInt(1, 12))}-${pad(randInt(1, 28))}`;
  const namVao = maCV === 'CV06' ? 2026 : randInt(Math.max(namSinh + 22, 2012), 2025);
  const thangVao = maCV === 'CV06' ? randInt(5, 8) : randInt(1, 12);
  const ngayVaoLam = `${namVao}-${pad(thangVao)}-${pad(randInt(1, 28))}`;
  const [lo, hi] = luongTheoCV[maCV];
  const luong = Math.round(randInt(lo, hi) / 100000) * 100000;
  return { maNV, hoTen, ngaySinh, gioiTinh: nam ? 'Nam' : 'Nu', sdt, email: `${maNV.toLowerCase()}@congty.vn`,
           ngayVaoLam, maPB, maCV, luong, trangThai: 'DangLam' };
});
// Hai nhân viên đã nghỉ việc từ 01/11/2026
for (const id of ['NV033', 'NV024']) nhanVien.find((n) => n.maNV === id).trangThai = 'DaNghi';

// Mức độ hay đi muộn / nghỉ của từng người, để thống kê có khác biệt
const hoSo = Object.fromEntries(nhanVien.map((n) => [n.maNV, {
  muon: n.maCV <= 'CV02' ? 0.01 : pick([0.02, 0.04, 0.06, 0.08, 0.15, 0.22]),
  nghiKP: pick([0, 0, 0.005, 0.01, 0.03]),
}]));

// ---- Chấm công: 01/09/2026 -> 21/11/2026, thứ Hai -> thứ Bảy ----
const chamCong = [];
const ketThuc = new Date(2026, 10, 21);
for (let d = new Date(2026, 8, 1); d <= ketThuc; d.setDate(d.getDate() + 1)) {
  if (d.getDay() === 0) continue; // Chủ nhật nghỉ
  const ngay = fmtDate(d);
  for (const nv of nhanVien) {
    if (nv.trangThai === 'DaNghi' && d >= new Date(2026, 10, 1)) continue;
    if (ngay < nv.ngayVaoLam) continue;
    const hs = hoSo[nv.maNV];
    const r = rand();
    let tt, vao = null, ra = null;
    if (r < hs.nghiKP) tt = 'NghiKhongPhep';
    else if (r < hs.nghiKP + 0.035) tt = 'NghiPhep';
    else if (r < hs.nghiKP + 0.035 + hs.muon) { tt = 'DiMuon'; vao = randInt(8 * 60 + 5, 9 * 60 + 30); ra = randInt(17 * 60, 18 * 60); }
    else { tt = 'DiLam'; vao = randInt(7 * 60 + 40, 8 * 60); ra = randInt(17 * 60, 17 * 60 + 50); }
    chamCong.push([nv.maNV, ngay, vao === null ? null : fmtTime(vao), ra === null ? null : fmtTime(ra), tt]);
  }
}

// ---- Thưởng / phạt ----
const lyDoThuong = [['Hoàn thành vượt KPI tháng', 1000000, 3000000], ['Thưởng dự án', 2000000, 5000000],
  ['Nhân viên xuất sắc tháng', 1500000, 2500000], ['Thưởng doanh số', 1000000, 6000000], ['Thưởng sáng kiến cải tiến', 500000, 2000000]];
const lyDoPhat = [['Vi phạm nội quy', 200000, 500000], ['Không hoàn thành KPI', 300000, 1000000],
  ['Làm mất tài sản công ty', 500000, 1500000], ['Không mặc đồng phục', 100000, 200000]];
const thuongPhat = [];
for (const [thang, soThuong, soPhat] of [[9, 14, 6], [10, 16, 7], [11, 8, 4]]) {
  const dangLam = nhanVien.filter((n) => thang < 11 || n.trangThai === 'DangLam');
  for (let i = 0; i < soThuong; i++) {
    const nv = pick(dangLam);
    const [lyDo, lo, hi] = nv.maPB === 'PB04' && rand() < 0.6 ? lyDoThuong[3] : pick(lyDoThuong);
    thuongPhat.push([nv.maNV, thang, 2026, 'Thuong', Math.round(randInt(lo, hi) / 100000) * 100000, lyDo]);
  }
  for (let i = 0; i < soPhat; i++) {
    const nv = pick(dangLam);
    const [lyDo, lo, hi] = pick(lyDoPhat);
    thuongPhat.push([nv.maNV, thang, 2026, 'Phat', Math.round(randInt(lo, hi) / 50000) * 50000, lyDo]);
  }
}
// Thưởng Quốc khánh 2/9 cho mọi người
for (const nv of nhanVien) thuongPhat.push([nv.maNV, 9, 2026, 'Thuong', nv.maCV === 'CV06' ? 300000 : 1000000, 'Thưởng lễ Quốc khánh 2/9']);

// ---- Xuất SQL ----
function insert(table, cols, rows, batch = 500) {
  const out = [];
  for (let i = 0; i < rows.length; i += batch) {
    const vals = rows.slice(i, i + batch).map((r) => `(${r.map(q).join(', ')})`).join(',\n  ');
    out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n  ${vals};`);
  }
  return out.join('\n');
}

const sql = [
  '-- =============================================================',
  '--  Dữ liệu mẫu – Quản lý lương nhân viên (sinh bởi database/scripts/gen-seed.js)',
  `--  ${phongBan.length} phòng ban, ${chucVu.length} chức vụ, ${nhanVien.length} nhân viên,`,
  `--  ${chamCong.length} bản ghi chấm công, ${thuongPhat.length} khoản thưởng/phạt`,
  '-- =============================================================',
  'USE quan_ly_luong;',
  'SET NAMES utf8mb4;',
  '',
  insert('PhongBan', ['MaPB', 'TenPB', 'MoTa'], phongBan),
  '',
  insert('ChucVu', ['MaCV', 'TenCV', 'PhuCap'], chucVu),
  '',
  insert('NhanVien', ['MaNV', 'HoTen', 'NgaySinh', 'GioiTinh', 'SoDienThoai', 'Email', 'NgayVaoLam', 'MaPB', 'MaCV', 'LuongCoBan', 'TrangThai'],
    nhanVien.map((n) => [n.maNV, n.hoTen, n.ngaySinh, n.gioiTinh, n.sdt, n.email, n.ngayVaoLam, n.maPB, n.maCV, n.luong, n.trangThai])),
  '',
  insert('ChamCong', ['MaNV', 'Ngay', 'GioVao', 'GioRa', 'TrangThai'], chamCong),
  '',
  insert('ThuongPhat', ['MaNV', 'Thang', 'Nam', 'Loai', 'SoTien', 'LyDo'], thuongPhat),
  '',
  '-- Tính lương tháng 9 và tháng 10/2026 (đã chốt). Tháng 11 chưa hết tháng nên chưa tính.',
  'CALL sp_TinhLuong(9, 2026);',
  'CALL sp_TinhLuong(10, 2026);',
  '',
].join('\n');

const outFile = path.join(__dirname, '..', 'seed.sql');
fs.writeFileSync(outFile, sql, 'utf8');
console.log(`Đã ghi ${outFile}`);
console.log(`NhanVien=${nhanVien.length} ChamCong=${chamCong.length} ThuongPhat=${thuongPhat.length}`);
