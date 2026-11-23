// Trang Báo cáo: các truy vấn thống kê phức tạp (JOIN, GROUP BY, HAVING, subquery)
import { get, qs } from '../api.js';
import { store } from '../app.js';
import { esc, icon, money, millions, monthOptions, yearOptions, table, errorBox, loading, CHART_COLORS } from '../ui.js';

export async function render(view) {
  const charts = [];
  const tham = { soLanMuon: 3, tuThang: 1, denThang: 12 };

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Báo cáo thống kê</h1>
        <p>Mỗi bảng ứng với một truy vấn SQL trên CSDL; nhãn bên phải ghi kỹ thuật được dùng.</p>
      </div>
      <div class="actions">
        <form class="toolbar" id="ky">
          <div class="field sm"><label for="thang">Tháng</label><select class="input" id="thang" name="thang">${monthOptions(store.thang)}</select></div>
          <div class="field sm"><label for="nam">Năm</label><select class="input" id="nam" name="nam">${yearOptions(store.nam)}</select></div>
        </form>
      </div>
    </div>

    <section class="card" aria-labelledby="r1">
      <div class="card-head"><div><h2 id="r1">Quỹ lương theo phòng ban</h2><p>Số nhân viên, tổng, bình quân, cao nhất và thấp nhất trong tháng</p></div>
        <span class="sql-tag">JOIN 3 bảng · GROUP BY · SUM AVG MAX MIN</span></div>
      <div id="b1">${loading()}</div>
      <div class="card-body" style="border-top:1px solid var(--line-soft)"><div class="chart-box" style="height:280px"><canvas id="c1" role="img" aria-label="Biểu đồ lương bình quân, cao nhất, thấp nhất theo phòng ban"></canvas></div></div>
    </section>

    <section class="card" aria-labelledby="r2">
      <div class="card-head"><div><h2 id="r2">Vi phạm chấm công</h2><p>Nhân viên đi muộn từ ngưỡng trở lên hoặc có nghỉ không phép</p></div>
        <div class="actions">
          <div class="field sm" style="grid-auto-flow:column;align-items:center;gap:8px"><label for="soLanMuon">Ngưỡng đi muộn</label>
            <input class="input" type="number" id="soLanMuon" min="0" value="${tham.soLanMuon}" style="width:80px"></div>
          <span class="sql-tag">GROUP BY · HAVING</span>
        </div></div>
      <div id="b2">${loading()}</div>
    </section>

    <section class="card" aria-labelledby="r3">
      <div class="card-head"><div><h2 id="r3">Thực lĩnh cao hơn bình quân phòng</h2><p>So sánh từng người với mức bình quân của chính phòng ban mình</p></div>
        <span class="sql-tag">Subquery tương quan · bảng dẫn xuất</span></div>
      <div id="b3">${loading()}</div>
    </section>

    <div class="grid two">
      <section class="card" aria-labelledby="r4">
        <div class="card-head"><div><h2 id="r4">Top 5 nhận thưởng</h2><p>Trong khoảng tháng của năm đang chọn</p></div>
          <div class="actions">
            <label class="sr-only" for="tuThang">Từ tháng</label><select class="input" id="tuThang" style="width:auto">${monthOptions(tham.tuThang)}</select>
            <span class="muted">đến</span>
            <label class="sr-only" for="denThang">Đến tháng</label><select class="input" id="denThang" style="width:auto">${monthOptions(tham.denThang)}</select>
          </div></div>
        <div id="b4">${loading()}</div>
        <div class="table-meta"><span class="sql-tag">JOIN · GROUP BY · ORDER BY · LIMIT</span></div>
      </section>
      <section class="card" aria-labelledby="r5">
        <div class="card-head"><div><h2 id="r5">Quỹ lương các tháng theo phòng ban</h2><p>Bảng xoay: hàng là phòng ban, cột là tháng</p></div></div>
        <div id="b5">${loading()}</div>
        <div class="table-meta"><span class="sql-tag">JOIN · GROUP BY 2 cột</span></div>
      </section>
    </div>`;

  const $ = (s) => view.querySelector(s);

  async function r1() {
    const canvas = $('#c1');
    const rows = await get('/bao-cao/quy-luong-phong-ban' + qs(store));
    if (!canvas.isConnected) return; // người dùng đã chuyển sang trang khác trong lúc chờ dữ liệu
    const tong = rows.reduce((a, r) => a + r.TongQuyLuong, 0);
    $('#b1').innerHTML = table([
      { label: 'Phòng ban', render: (r) => `<span class="name">${esc(r.TenPB)}</span>` },
      { label: 'Số NV', cls: 'num', render: (r) => r.SoNhanVien },
      { label: 'Tổng quỹ lương', cls: 'num', render: (r) => `<b>${money(r.TongQuyLuong)}</b>` },
      { label: 'Tỷ trọng', cls: 'num', render: (r) => `${((r.TongQuyLuong / tong) * 100).toFixed(1)}%` },
      { label: 'Bình quân', cls: 'num', render: (r) => money(r.LuongBinhQuan) },
      { label: 'Cao nhất', cls: 'num', render: (r) => money(r.CaoNhat) },
      { label: 'Thấp nhất', cls: 'num', render: (r) => money(r.ThapNhat) },
    ], rows, {
      empty: `Chưa có bảng lương tháng ${store.thang}/${store.nam}`,
      foot: rows.length ? `<td>Toàn công ty</td><td class="num">${rows.reduce((a, r) => a + r.SoNhanVien, 0)}</td><td class="num">${money(tong)}</td><td class="num">100%</td><td colspan="3"></td>` : '',
    });
    charts.push(new Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.TenPB),
        datasets: [
          { label: 'Thấp nhất', data: rows.map((r) => r.ThapNhat), backgroundColor: '#a9c9cd', borderRadius: 3 },
          { label: 'Bình quân', data: rows.map((r) => r.LuongBinhQuan), backgroundColor: CHART_COLORS[0], borderRadius: 3 },
          { label: 'Cao nhất', data: rows.map((r) => r.CaoNhat), backgroundColor: CHART_COLORS[1], borderRadius: 3 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: { y: { ticks: { callback: (v) => millions(v) } }, x: { grid: { display: false } } },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(c.raw)}` } } },
      },
    }));
  }

  async function r2() {
    const rows = await get('/bao-cao/vi-pham' + qs({ ...store, soLanMuon: tham.soLanMuon }));
    $('#b2').innerHTML = table([
      { label: 'Mã NV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
      { label: 'Họ tên', render: (r) => `<span class="name">${esc(r.HoTen)}</span>` },
      { label: 'Phòng ban', render: (r) => esc(r.TenPB) },
      { label: 'Số lần đi muộn', cls: 'num', render: (r) => (r.DiMuon ? `<span class="chip warn">${r.DiMuon}</span>` : '0') },
      { label: 'Nghỉ không phép', cls: 'num', render: (r) => (r.NghiKhongPhep ? `<span class="chip bad">${r.NghiKhongPhep}</span>` : '0') },
      { label: 'Tiền phạt đi muộn', cls: 'num', render: (r) => money(r.TienPhatDiMuon) },
    ], rows, { empty: 'Không có nhân viên nào vượt ngưỡng' }) + (rows.length ? `<div class="table-meta">${rows.length} nhân viên</div>` : '');
  }

  async function r3() {
    const rows = await get('/bao-cao/tren-binh-quan' + qs(store));
    $('#b3').innerHTML = table([
      { label: 'Mã NV', key: 'MaNV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
      { label: 'Nhân viên', render: (r) => `<span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.TenCV)}</span>` },
      { label: 'Phòng ban', render: (r) => esc(r.TenPB) },
      { label: 'Thực lĩnh', cls: 'num', render: (r) => `<b>${money(r.ThucLinh)}</b>` },
      { label: 'Bình quân phòng', cls: 'num', render: (r) => money(r.BinhQuanPhong) },
      { label: 'Chênh lệch', cls: 'num', render: (r) => `<span style="color:var(--ok)">+${money(r.ChenhLech)}</span>` },
    ], rows, { empty: `Chưa có bảng lương tháng ${store.thang}/${store.nam}` }) + (rows.length ? `<div class="table-meta">${rows.length} nhân viên</div>` : '');
  }

  async function r4() {
    if (tham.tuThang > tham.denThang) { $('#b4').innerHTML = '<div class="empty">Tháng bắt đầu phải trước tháng kết thúc</div>'; return; }
    const rows = await get('/bao-cao/top-thuong' + qs({ nam: store.nam, tuThang: tham.tuThang, denThang: tham.denThang, top: 5 }));
    $('#b4').innerHTML = table([
      { label: '#', render: (r) => `<span class="rank">${rows.indexOf(r) + 1}</span>` },
      { label: 'Mã NV', key: 'MaNV', render: (r) => `<span class="mono">${esc(r.MaNV)}</span>` },
      { label: 'Nhân viên', render: (r) => `<span class="name">${esc(r.HoTen)}</span><span class="sub">${esc(r.TenPB)}</span>` },
      { label: 'Số lần', cls: 'num', render: (r) => r.SoLanThuong },
      { label: 'Tổng thưởng', cls: 'num', render: (r) => `<b>${money(r.TongTienThuong)}</b>` },
    ], rows, { empty: 'Không có khoản thưởng nào trong khoảng này', sortBy: null }); // bảng xếp hạng: giữ thứ tự theo tiền thưởng
  }

  async function r5() {
    const rows = await get('/bao-cao/xu-huong' + qs({ nam: store.nam }));
    const thangs = [...new Set(rows.map((r) => r.Thang))];
    const phongs = [...new Set(rows.map((r) => r.TenPB))];
    const pivot = phongs.map((p) => ({ TenPB: p, ...Object.fromEntries(thangs.map((t) => [t, rows.find((r) => r.TenPB === p && r.Thang === t)?.TongQuyLuong || 0])) }));
    const cols = [{ label: 'Phòng ban', render: (r) => esc(r.TenPB) }, ...thangs.map((t) => ({ label: `Tháng ${t}`, cls: 'num', render: (r) => millions(r[t]) }))];
    if (thangs.length >= 2) {
      const [a, b] = thangs.slice(-2);
      cols.push({ label: 'Thay đổi', cls: 'num', render: (r) => { const d = r[b] - r[a]; return `<span class="${d >= 0 ? 'delta-up' : 'delta-down'}">${d >= 0 ? '+' : '−'}${millions(Math.abs(d))}</span>`; } });
    }
    $('#b5').innerHTML = table(cols, pivot, { empty: `Chưa có bảng lương năm ${store.nam}` });
  }

  async function loadAll() {
    charts.splice(0).forEach((c) => c.destroy());
    await Promise.all([r1, r2, r3, r4, r5].map((f, i) => f().catch((e) => {
      const el = $(`#b${i + 1}`);
      if (el) el.innerHTML = errorBox(e); // không còn ô này nghĩa là người dùng đã sang trang khác: bỏ qua
    })));
  }

  $('#ky').addEventListener('change', (e) => { store[e.target.name] = +e.target.value; loadAll(); });
  $('#soLanMuon').addEventListener('change', (e) => { tham.soLanMuon = Math.max(0, +e.target.value || 0); r2().catch((er) => { $('#b2').innerHTML = errorBox(er); }); });
  for (const id of ['tuThang', 'denThang']) {
    $('#' + id).addEventListener('change', (e) => { tham[id] = +e.target.value; r4().catch((er) => { $('#b4').innerHTML = errorBox(er); }); });
  }
  await loadAll();
  return () => charts.forEach((c) => c.destroy());
}
