// Điểm khởi động server: REST API + phục vụ giao diện tĩnh trong thư mục frontend/
const path = require('path');
const express = require('express');
const db = require('./db');
const { HttpError, mysqlErrorToHttp } = require('./utils');
const { phongBan, chucVu } = require('./routes/danhmuc');

const app = express();

// Bảo vệ bằng mật khẩu (Basic Auth): chỉ bật khi đặt BASIC_AUTH_USER và BASIC_AUTH_PASS
// (trên Vercel). Trình duyệt sẽ hiện hộp đăng nhập; trên máy không đặt thì không hỏi.
const AUTH_USER = process.env.BASIC_AUTH_USER;
const AUTH_PASS = process.env.BASIC_AUTH_PASS;
if (AUTH_USER && AUTH_PASS) {
  const crypto = require('crypto');
  const same = (a, b) => {
    const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  };
  app.use((req, res, next) => {
    const [type, token] = (req.headers.authorization || '').split(' ');
    if (type === 'Basic' && token) {
      const raw = Buffer.from(token, 'base64').toString('utf8');
      const i = raw.indexOf(':');
      if (i >= 0 && same(raw.slice(0, i), AUTH_USER) && same(raw.slice(i + 1), AUTH_PASS)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Quan ly luong", charset="UTF-8"');
    if (req.path === '/api/dang-nhap') {
      // Người dùng bấm Hủy ở hộp đăng nhập
      return res.status(401).type('html').send('<meta charset="utf-8"><p style="font-family:sans-serif;padding:24px">Cần đăng nhập để dùng ứng dụng. <a href="/api/dang-nhap">Thử lại</a></p>');
    }
    res.status(401).json({ error: 'Cần đăng nhập để xem dữ liệu' });
  });
}

// Trang đăng nhập: mở trực tiếp trang này thì trình duyệt hiện hộp nhập mật khẩu (Basic Auth),
// đăng nhập xong quay về trang đang xem. Không bật mật khẩu thì chỉ chuyển về trang chủ.
app.get('/api/dang-nhap', (req, res) => {
  const next = String(req.query.next || '');
  res.redirect('/' + (/^#\/[\w\-/?=&.]*$/.test(next) ? next : ''));
});

app.use(express.json());

// Ghi log mỗi request API kèm thời gian xử lý
app.use('/api', (req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t}ms)`));
  next();
});

app.get('/api/health', async (req, res) => {
  const [[r]] = await db.query('SELECT DATABASE() AS db, VERSION() AS version');
  res.json({ status: 'ok', ...r });
});

app.use('/api/phong-ban', phongBan);
app.use('/api/chuc-vu', chucVu);
app.use('/api/nhan-vien', require('./routes/nhanvien'));
app.use('/api/cham-cong', require('./routes/chamcong'));
app.use('/api/thuong-phat', require('./routes/thuongphat'));
app.use('/api/bang-luong', require('./routes/bangluong'));
app.use('/api/bao-cao', require('./routes/baocao'));

app.use('/api', (req, res) => res.status(404).json({ error: 'API không tồn tại' }));

// Giao diện, kể cả thư viện trình duyệt trong frontend/vendor/ (Chart.js, font: tạo bằng npm run build)
const ROOT = path.join(__dirname, '..', '..'); // thư mục gốc dự án
app.use(express.static(path.join(ROOT, 'frontend')));

// Xử lý lỗi tập trung (Express 5 tự bắt lỗi từ các handler async)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON gửi lên không hợp lệ' });
  const httpErr = err instanceof HttpError ? err : mysqlErrorToHttp(err);
  if (httpErr) return res.status(httpErr.status).json({ error: httpErr.message });
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ', detail: err.message });
});

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
}

module.exports = app;
