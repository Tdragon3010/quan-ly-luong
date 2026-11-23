// Bộ định tuyến theo hash (#/nhan-vien ...) và trạng thái dùng chung
import { get } from './api.js';
import { errorBox, loading } from './ui.js';

// Kỳ đang xem (dùng chung giữa các trang) – mặc định là kỳ lương mới nhất đã tính
export const store = { thang: 10, nam: 2026, phongBan: null, chucVu: null };

export async function danhMuc(force = false) {
  if (force || !store.phongBan) {
    [store.phongBan, store.chucVu] = await Promise.all([get('/phong-ban'), get('/chuc-vu')]);
  }
  return { phongBan: store.phongBan, chucVu: store.chucVu };
}

const routes = {
  '/': { title: 'Tổng quan', load: () => import('./pages/tongquan.js') },
  '/nhan-vien': { title: 'Nhân viên', load: () => import('./pages/nhanvien.js') },
  '/cham-cong': { title: 'Chấm công', load: () => import('./pages/chamcong.js') },
  '/thuong-phat': { title: 'Thưởng / phạt', load: () => import('./pages/thuongphat.js') },
  '/bang-luong': { title: 'Bảng lương', load: () => import('./pages/bangluong.js') },
  '/bao-cao': { title: 'Báo cáo', load: () => import('./pages/baocao.js') },
  '/danh-muc': { title: 'Phòng ban & chức vụ', load: () => import('./pages/danhmuc.js') },
};

const view = document.getElementById('view');
let cleanup = null;

async function render() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const route = routes[path] || routes['/'];
  document.title = `${route.title} · Quản lý lương nhân viên`;
  document.getElementById('topTitle').textContent = route.title;
  document.querySelectorAll('.nav a').forEach((a) => {
    if (a.dataset.route === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  closeMenu();
  if (cleanup) { cleanup(); cleanup = null; }
  view.innerHTML = loading();
  try {
    const mod = await route.load();
    cleanup = (await mod.render(view)) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = errorBox(e);
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// Menu trên điện thoại
const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');
const menuBtn = document.getElementById('menuBtn');
function openMenu() {
  sidebar.classList.add('open'); scrim.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Đóng menu');
  sidebar.querySelector('a')?.focus();
}
function closeMenu() {
  sidebar.classList.remove('open'); scrim.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Mở menu');
}
menuBtn.addEventListener('click', () => (sidebar.classList.contains('open') ? closeMenu() : openMenu()));
scrim.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { closeMenu(); menuBtn.focus(); } });

// Đặt font và màu mặc định cho Chart.js
if (window.Chart) {
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#5b6b73';
  Chart.defaults.borderColor = '#e8edf0';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.boxHeight = 12;
}

// Lấy kỳ lương mới nhất làm mặc định rồi hiển thị trang
get('/bang-luong/ky')
  .then((ky) => { if (ky.length) { store.thang = ky[0].Thang; store.nam = ky[0].Nam; } })
  .catch(() => {})
  .finally(() => { window.addEventListener('hashchange', render); render(); });
