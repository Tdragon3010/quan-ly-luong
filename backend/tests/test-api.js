// Kiểm thử tự động toàn bộ API (chạy server trên cổng ngẫu nhiên, tự dọn dữ liệu thử)
// Chạy: npm run test-api
const app = require('../src/index');
const db = require('../src/db');

let base;
const ketQua = [];

async function api(method, url, body) {
  const t = Date.now();
  const res = await fetch(base + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data, ct, ms: Date.now() - t };
}

async function kiemTra(ten, fn) {
  try {
    const ghiChu = await fn();
    ketQua.push({ ok: true, ten, ghiChu: ghiChu || '' });
  } catch (e) {
    ketQua.push({ ok: false, ten, ghiChu: e.message });
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg); }
function expectStatus(r, s) { expect(r.status === s, `mong đợi HTTP ${s}, nhận ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`); }

async function main() {
  const server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
  let maNV;
  let maCC;

  try {
    await kiemTra('GET /health – kết nối CSDL', async () => {
      const r = await api('GET', '/health'); expectStatus(r, 200);
      return `${r.data.db}, MySQL ${r.data.version}`;
    });

    // ---- Danh mục ----
    await kiemTra('GET /phong-ban – danh sách kèm số NV', async () => {
      const r = await api('GET', '/phong-ban'); expectStatus(r, 200);
      expect(r.data.length >= 6, 'thiếu phòng ban');
      return `${r.data.length} phòng ban`;
    });
    await kiemTra('POST /phong-ban – thêm phòng ban', async () => {
      const r = await api('POST', '/phong-ban', { MaPB: 'PBTEST', TenPB: 'Phòng Thử nghiệm' }); expectStatus(r, 201);
    });
    await kiemTra('PUT /phong-ban/:ma – sửa mô tả', async () => {
      const r = await api('PUT', '/phong-ban/PBTEST', { MoTa: 'Dùng cho kiểm thử' }); expectStatus(r, 200);
      expect(r.data.MoTa === 'Dùng cho kiểm thử', 'chưa cập nhật');
    });
    await kiemTra('POST /phong-ban – trùng tên bị từ chối (409)', async () => {
      const r = await api('POST', '/phong-ban', { MaPB: 'PBX', TenPB: 'Phòng Kế toán' }); expectStatus(r, 409);
    });
    await kiemTra('POST /chuc-vu – phụ cấp âm bị từ chối (400)', async () => {
      const r = await api('POST', '/chuc-vu', { MaCV: 'CVX', TenCV: 'Thử', PhuCap: -1 }); expectStatus(r, 400);
    });

    // ---- Nhân viên ----
    const nvMoi = {
      HoTen: 'Nguyễn Văn Kiểm Thử', NgaySinh: '2000-01-15', GioiTinh: 'Nam', SoDienThoai: '0900000001',
      Email: 'kiemthu@congty.vn', NgayVaoLam: '2026-09-01', MaPB: 'PBTEST', MaCV: 'CV05', LuongCoBan: 10000000,
    };
    await kiemTra('POST /nhan-vien – thêm, tự sinh mã', async () => {
      const r = await api('POST', '/nhan-vien', nvMoi); expectStatus(r, 201);
      maNV = r.data.MaNV;
      expect(/^NV\d{3}$/.test(maNV), 'mã NV sai định dạng');
      return `mã mới ${maNV}, phòng ${r.data.TenPB}`;
    });
    await kiemTra('POST /nhan-vien – trùng email (409)', async () => {
      const r = await api('POST', '/nhan-vien', { ...nvMoi, SoDienThoai: '0900000002' }); expectStatus(r, 409);
    });
    await kiemTra('POST /nhan-vien – phòng ban không tồn tại (400)', async () => {
      const r = await api('POST', '/nhan-vien', { ...nvMoi, Email: 'x@congty.vn', SoDienThoai: '0900000003', MaPB: 'KHONGCO' });
      expectStatus(r, 400);
    });
    await kiemTra('POST /nhan-vien – thiếu trường bắt buộc (400)', async () => {
      const r = await api('POST', '/nhan-vien', { HoTen: 'Thiếu' }); expectStatus(r, 400);
    });
    await kiemTra('GET /nhan-vien?q= – tìm kiếm theo tên', async () => {
      const r = await api('GET', '/nhan-vien?q=' + encodeURIComponent('Kiểm Thử')); expectStatus(r, 200);
      expect(r.data.length === 1 && r.data[0].MaNV === maNV, 'không tìm thấy');
    });
    await kiemTra('GET /nhan-vien?maPB=PB05 – lọc theo phòng', async () => {
      const r = await api('GET', '/nhan-vien?maPB=PB05'); expectStatus(r, 200);
      expect(r.data.every((n) => n.MaPB === 'PB05'), 'lọc sai');
      return `${r.data.length} nhân viên Phòng Kỹ thuật`;
    });
    await kiemTra('PUT /nhan-vien/:ma – sửa lương', async () => {
      const r = await api('PUT', `/nhan-vien/${maNV}`, { LuongCoBan: 12000000 }); expectStatus(r, 200);
      expect(r.data.LuongCoBan === 12000000, 'chưa cập nhật lương');
    });
    await kiemTra('DELETE /phong-ban – còn nhân viên nên bị chặn (409)', async () => {
      const r = await api('DELETE', '/phong-ban/PBTEST'); expectStatus(r, 409);
    });

    // ---- Chấm công ----
    await kiemTra('PUT /cham-cong/ngay/:ngay – chấm cả ngày, tự nhận đi muộn', async () => {
      const r = await api('PUT', '/cham-cong/ngay/2026-10-05', [{ MaNV: maNV, GioVao: '08:20', GioRa: '17:30' }]);
      expectStatus(r, 200);
      const g = await api('GET', '/cham-cong/ngay/2026-10-05');
      const dong = g.data.find((x) => x.MaNV === maNV);
      expect(dong && dong.TrangThai === 'DiMuon', 'không nhận ra đi muộn');
      return `${g.data.length} nhân viên trong bảng chấm công ngày`;
    });
    await kiemTra('POST /cham-cong – chấm trùng ngày (409)', async () => {
      const r = await api('POST', '/cham-cong', { MaNV: maNV, Ngay: '2026-10-05', GioVao: '07:50' }); expectStatus(r, 409);
    });
    await kiemTra('POST /cham-cong – đi làm đúng giờ', async () => {
      const r = await api('POST', '/cham-cong', { MaNV: maNV, Ngay: '2026-10-06', GioVao: '07:55', GioRa: '17:05' });
      expectStatus(r, 201);
      expect(r.data.TrangThai === 'DiLam', 'phải là DiLam');
      maCC = r.data.MaCC;
    });
    await kiemTra('PUT /cham-cong/:id – đổi sang nghỉ phép, xóa giờ', async () => {
      const r = await api('PUT', `/cham-cong/${maCC}`, { TrangThai: 'NghiPhep' }); expectStatus(r, 200);
      expect(r.data.GioVao === null && r.data.GioRa === null, 'giờ chưa bị xóa');
    });
    await kiemTra('POST /cham-cong – giờ ra trước giờ vào (400)', async () => {
      const r = await api('POST', '/cham-cong', { MaNV: maNV, Ngay: '2026-10-07', GioVao: '17:00', GioRa: '08:00' });
      expectStatus(r, 400);
    });
    await kiemTra('GET /cham-cong/tong-hop – tổng hợp công tháng 10', async () => {
      const r = await api('GET', '/cham-cong/tong-hop?thang=10&nam=2026'); expectStatus(r, 200);
      const d = r.data.find((x) => x.MaNV === maNV);
      expect(d && d.SoNgayCong === 2 && d.DiMuon === 1, 'tổng hợp sai');
      return `${r.data.length} nhân viên`;
    });

    // ---- Thưởng phạt ----
    await kiemTra('POST /thuong-phat – thêm thưởng và phạt', async () => {
      const a = await api('POST', '/thuong-phat', { MaNV: maNV, Thang: 10, Nam: 2026, Loai: 'Thuong', SoTien: 1000000, LyDo: 'Thưởng thử' });
      const b = await api('POST', '/thuong-phat', { MaNV: maNV, Thang: 10, Nam: 2026, Loai: 'Phat', SoTien: 200000, LyDo: 'Phạt thử' });
      expectStatus(a, 201); expectStatus(b, 201);
    });
    await kiemTra('POST /thuong-phat – số tiền 0 (400)', async () => {
      const r = await api('POST', '/thuong-phat', { MaNV: maNV, Thang: 10, Nam: 2026, Loai: 'Phat', SoTien: 0, LyDo: 'x' });
      expectStatus(r, 400);
    });

    // ---- Tính lương ----
    await kiemTra('POST /bang-luong/tinh – tính lại lương tháng 10/2026', async () => {
      const r = await api('POST', '/bang-luong/tinh', { Thang: 10, Nam: 2026 }); expectStatus(r, 200);
      expect(r.data.SoPhieu === 41, `mong đợi 41 phiếu, có ${r.data.SoPhieu}`);
      return `${r.data.SoPhieu} phiếu, ${r.data.thoiGianMs}ms`;
    });
    await kiemTra('GET /bang-luong/phieu/:ma – công thức lương đúng', async () => {
      const r = await api('GET', `/bang-luong/phieu/${maNV}?thang=10&nam=2026`); expectStatus(r, 200);
      const p = r.data;
      // 12.000.000 / 27 × 2 công + phụ cấp 500.000 + thưởng 1.000.000 − (phạt 200.000 + 1 lần muộn × 50.000)
      const mongDoi = Math.round(12000000 / 27 * 2) + 500000 + 1000000 - 250000;
      expect(p.NgayCongChuan === 27 && p.SoNgayCong === 2 && p.SoLanDiMuon === 1, 'số công sai');
      expect(p.TongPhat === 250000, `tổng phạt ${p.TongPhat}`);
      expect(p.ThucLinh === mongDoi, `thực lĩnh ${p.ThucLinh} ≠ ${mongDoi}`);
      expect(p.thuongPhat.length === 2, 'thiếu chi tiết thưởng phạt');
      return `thực lĩnh ${p.ThucLinh.toLocaleString('vi-VN')}đ`;
    });
    await kiemTra('GET /bang-luong?thang=&nam=&maPB= – bảng lương lọc theo phòng', async () => {
      const r = await api('GET', '/bang-luong?thang=10&nam=2026&maPB=PB04'); expectStatus(r, 200);
      expect(r.data.length > 0 && r.data.every((x) => x.TenPB === 'Phòng Kinh doanh'), 'lọc sai');
      return `${r.data.length} phiếu`;
    });
    await kiemTra('GET /bang-luong/ky – các kỳ lương', async () => {
      const r = await api('GET', '/bang-luong/ky'); expectStatus(r, 200);
      return r.data.map((k) => `T${k.Thang}/${k.Nam}`).join(', ');
    });
    await kiemTra('POST /bang-luong/tinh – tháng 13 bị từ chối (400)', async () => {
      const r = await api('POST', '/bang-luong/tinh', { Thang: 13, Nam: 2026 }); expectStatus(r, 400);
    });

    // ---- Báo cáo ----
    for (const [ten, url, kiem] of [
      ['tổng quan dashboard', '/bao-cao/tong-quan?thang=10&nam=2026', (d) => d.luong.SoPhieu > 0],
      ['quỹ lương theo phòng ban', '/bao-cao/quy-luong-phong-ban?thang=10&nam=2026', (d) => d.length >= 6],
      ['vi phạm chấm công (HAVING)', '/bao-cao/vi-pham?thang=10&nam=2026', (d) => d.length > 0],
      ['lương trên bình quân phòng (subquery)', '/bao-cao/tren-binh-quan?thang=10&nam=2026', (d) => d.length > 0],
      ['top thưởng', '/bao-cao/top-thuong?nam=2026&tuThang=9&denThang=11', (d) => d.length === 5],
      ['xu hướng quỹ lương', '/bao-cao/xu-huong?nam=2026', (d) => d.length > 0],
    ]) {
      await kiemTra(`GET ${url.split('?')[0]} – ${ten}`, async () => {
        const r = await api('GET', url); expectStatus(r, 200);
        expect(kiem(r.data), 'kết quả rỗng / sai');
        return `${Array.isArray(r.data) ? r.data.length + ' dòng, ' : ''}${r.ms}ms`;
      });
    }
    await kiemTra('GET /bao-cao/xuat-excel – tải file Excel', async () => {
      const r = await api('GET', '/bao-cao/xuat-excel?thang=10&nam=2026'); expectStatus(r, 200);
      expect(r.ct.includes('spreadsheetml'), 'sai định dạng');
      return `${(r.data.byteLength / 1024).toFixed(1)} KB`;
    });
    await kiemTra('GET /api/khong-co – API không tồn tại (404)', async () => {
      const r = await api('GET', '/khong-co'); expectStatus(r, 404);
    });

    // ---- Xóa ----
    await kiemTra('DELETE /nhan-vien/:ma – xóa kèm dữ liệu liên quan', async () => {
      const r = await api('DELETE', `/nhan-vien/${maNV}`); expectStatus(r, 200);
      const [[c]] = await db.query(
        `SELECT (SELECT COUNT(*) FROM ChamCong WHERE MaNV = ?) + (SELECT COUNT(*) FROM ThuongPhat WHERE MaNV = ?)
              + (SELECT COUNT(*) FROM BangLuong WHERE MaNV = ?) AS n`, [maNV, maNV, maNV]);
      expect(c.n === 0, 'còn dữ liệu mồ côi');
      maNV = null;
    });
    await kiemTra('DELETE /phong-ban/:ma – xóa khi không còn NV', async () => {
      const r = await api('DELETE', '/phong-ban/PBTEST'); expectStatus(r, 200);
    });
  } finally {
    // Dọn dẹp phòng khi có bước lỗi giữa chừng
    if (maNV) await db.query('DELETE FROM NhanVien WHERE MaNV = ?', [maNV]);
    await db.query("DELETE FROM PhongBan WHERE MaPB IN ('PBTEST','PBX')");
    await db.query("DELETE FROM ChucVu WHERE MaCV = 'CVX'");
    await db.query('CALL sp_TinhLuong(10, 2026)'); // đưa bảng lương tháng 10 về như cũ
    server.close();
    await db.end();
  }

  const dat = ketQua.filter((k) => k.ok).length;
  ketQua.forEach((k, i) => console.log(`${k.ok ? 'PASS' : 'FAIL'} ${String(i + 1).padStart(2)}. ${k.ten}${k.ghiChu ? '  — ' + k.ghiChu : ''}`));
  console.log(`\nKết quả: ${dat}/${ketQua.length} ca kiểm thử đạt`);
  process.exitCode = dat === ketQua.length ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
