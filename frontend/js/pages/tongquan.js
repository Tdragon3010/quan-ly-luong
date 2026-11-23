// Trang Tổng quan (dashboard): số liệu chính + biểu đồ
import { get, qs } from '../api.js';
import { store } from '../app.js';
import { esc, icon, money, millions, num, monthOptions, yearOptions, errorBox, CHART_COLORS } from '../ui.js';

export async function render(view) {
  const charts = [];

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Tổng quan tháng ${store.thang}/${store.nam}</h1>
        <p>Quỹ lương, chấm công và các khoản thưởng phạt của toàn công ty.</p>
      </div>
      <form class="toolbar" id="ky">
        <div class="field sm"><label for="thang">Tháng</label><select class="input" id="thang" name="thang">${monthOptions(store.thang)}</select></div>
        <div class="field sm"><label for="nam">Năm</label><select class="input" id="nam" name="nam">${yearOptions(store.nam)}</select></div>
      </form>
    </div>
    <div id="body"></div>`;

  const body = view.querySelector('#body');

  async function load() {
    charts.splice(0).forEach((c) => c.destroy());
    view.querySelector('h1').textContent = `Tổng quan tháng ${store.thang}/${store.nam}`;
    const truoc = store.thang === 1 ? { thang: 12, nam: store.nam - 1 } : { thang: store.thang - 1, nam: store.nam };
    try {
      const [tq, tqTruoc, pb, xh, top, vp] = await Promise.all([
        get('/bao-cao/tong-quan' + qs(store)),
        get('/bao-cao/tong-quan' + qs(truoc)),
        get('/bao-cao/quy-luong-phong-ban' + qs(store)),
        get('/bao-cao/xu-huong' + qs({ nam: store.nam })),
        get('/bao-cao/top-thuong' + qs({ nam: store.nam, tuThang: 1, denThang: 12, top: 5 })),
        get('/bao-cao/vi-pham' + qs({ ...store, soLanMuon: 4 })),
      ]);
      if (!body.isConnected) return; // người dùng đã chuyển sang trang khác trong lúc chờ dữ liệu

      const delta = (now, before) => {
        if (!before) return '';
        const p = ((now - before) / before) * 100;
        const up = p >= 0;
        return `<span class="${up ? 'delta-up' : 'delta-down'}">${up ? '▲' : '▼'} ${Math.abs(p).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</span> so với tháng ${truoc.thang}`;
      };
      const chuaTinh = !tq.luong.SoPhieu;

      body.innerHTML = `
        ${chuaTinh ? `<div class="notice warn">${icon('alert')}<span>Tháng ${store.thang}/${store.nam} chưa tính lương. Vào <a href="#/bang-luong">Bảng lương</a> để tính.</span></div>` : ''}
        <div class="kpis" style="margin-top:${chuaTinh ? 16 : 0}px">
          <div class="card kpi"><span class="label">${icon('wallet')}Tổng quỹ lương</span><span class="value">${money(tq.luong.TongQuyLuong)}</span><span class="sub">${delta(tq.luong.TongQuyLuong, tqTruoc.luong.TongQuyLuong) || `${tq.luong.SoPhieu} phiếu lương`}</span></div>
          <div class="card kpi"><span class="label">${icon('users')}Nhân viên đang làm</span><span class="value">${tq.nhanVien.DangLam}</span><span class="sub">${tq.nhanVien.SoPhongBan} phòng ban · ${tq.nhanVien.TongNhanVien - tq.nhanVien.DangLam} đã nghỉ</span></div>
          <div class="card kpi"><span class="label">${icon('chart')}Lương bình quân</span><span class="value">${money(tq.luong.LuongBinhQuan)}</span><span class="sub">${delta(tq.luong.LuongBinhQuan, tqTruoc.luong.LuongBinhQuan) || 'trên mỗi phiếu lương'}</span></div>
          <div class="card kpi"><span class="label">${icon('clock')}Lượt đi muộn</span><span class="value">${num(tq.chamCong.DiMuon)}</span><span class="sub">${tq.chamCong.NghiPhep} nghỉ phép · ${tq.chamCong.NghiKhongPhep} nghỉ không phép</span></div>
        </div>
        <div class="grid wide-left" style="margin-top:20px">
          <section class="card" aria-labelledby="h1c">
            <div class="card-head"><div><h2 id="h1c">Quỹ lương theo tháng năm ${store.nam}</h2><p>Tổng thực lĩnh, chia theo phòng ban</p></div></div>
            <div class="card-body"><div class="chart-box tall"><canvas id="cXuHuong" role="img" aria-label="Biểu đồ cột chồng quỹ lương từng tháng theo phòng ban"></canvas></div></div>
          </section>
          <section class="card" aria-labelledby="h2c">
            <div class="card-head"><div><h2 id="h2c">Cơ cấu quỹ lương tháng ${store.thang}</h2><p>Tỷ trọng theo phòng ban</p></div></div>
            <div class="card-body"><div class="chart-box tall"><canvas id="cPhong" role="img" aria-label="Biểu đồ tròn tỷ trọng quỹ lương theo phòng ban"></canvas></div></div>
          </section>
        </div>
        <div class="grid two" style="margin-top:20px">
          <section class="card" aria-labelledby="h3c">
            <div class="card-head"><div><h2 id="h3c">Thưởng nhiều nhất năm ${store.nam}</h2><p>Tổng các khoản thưởng đã nhận</p></div></div>
            <ul class="list">${top.map((r, i) => `<li><span class="who"><span class="rank">${i + 1}</span><span><span class="name" style="font-weight:600"><span class="mono code-tag">${esc(r.MaNV)}</span>${esc(r.HoTen)}</span><span class="sub muted" style="display:block;font-size:12.5px">${esc(r.TenPB)} · ${r.SoLanThuong} lần</span></span></span><b class="num">${money(r.TongTienThuong)}</b></li>`).join('') || '<li class="muted">Chưa có dữ liệu</li>'}</ul>
          </section>
          <section class="card" aria-labelledby="h4c">
            <div class="card-head"><div><h2 id="h4c">Cần nhắc nhở tháng ${store.thang}</h2><p>Đi muộn từ 4 lần hoặc nghỉ không phép</p></div><a class="btn" href="#/bao-cao">Xem báo cáo</a></div>
            <ul class="list">${vp.slice(0, 5).map((r) => `<li><span><span style="font-weight:600"><span class="mono code-tag">${esc(r.MaNV)}</span>${esc(r.HoTen)}</span><span class="muted" style="display:block;font-size:12.5px">${esc(r.TenPB)}</span></span>
              <span class="actions">${r.DiMuon ? `<span class="chip warn">${r.DiMuon} lần muộn</span>` : ''}${r.NghiKhongPhep ? `<span class="chip bad">${r.NghiKhongPhep} ngày nghỉ KP</span>` : ''}</span></li>`).join('') || '<li class="muted">Không có ai vi phạm</li>'}</ul>
          </section>
        </div>`;

      // Biểu đồ cột chồng: tháng × phòng ban
      const thangs = [...new Set(xh.map((r) => r.Thang))];
      const phongs = [...new Set(xh.map((r) => r.TenPB))];
      charts.push(new Chart(view.querySelector('#cXuHuong'), {
        type: 'bar',
        data: {
          labels: thangs.map((t) => `Tháng ${t}`),
          datasets: phongs.map((p, i) => ({
            label: p, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4, maxBarThickness: 64,
            data: thangs.map((t) => xh.find((r) => r.Thang === t && r.TenPB === p)?.TongQuyLuong || 0),
          })),
        },
        options: {
          maintainAspectRatio: false,
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: (v) => millions(v) } } },
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(c.raw)}` } } },
        },
      }));

      // Biểu đồ tròn: cơ cấu quỹ lương tháng
      charts.push(new Chart(view.querySelector('#cPhong'), {
        type: 'doughnut',
        data: { labels: pb.map((r) => r.TenPB), datasets: [{ data: pb.map((r) => r.TongQuyLuong), backgroundColor: pb.map((_, i) => CHART_COLORS[phongs.indexOf(pb[i].TenPB) % CHART_COLORS.length] || CHART_COLORS[i]), borderWidth: 2, borderColor: '#fff' }] },
        options: {
          maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${money(c.raw)}` } } },
        },
      }));
    } catch (e) { body.innerHTML = errorBox(e); }
  }

  view.querySelector('#ky').addEventListener('change', (e) => { store[e.target.name] = +e.target.value; load(); });
  await load();
  return () => charts.forEach((c) => c.destroy());
}
