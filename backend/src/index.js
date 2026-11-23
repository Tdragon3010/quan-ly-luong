// Điểm khởi động server: REST API + phục vụ giao diện tĩnh trong thư mục frontend/
const path = require('path');
const express = require('express');
const db = require('./db');
const { HttpError, mysqlErrorToHttp } = require('./utils');
const { phongBan, chucVu } = require('./routes/danhmuc');

const app = express();
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

// Giao diện (frontend) + thư viện dùng offline (biểu đồ, font chữ)
const ROOT = path.join(__dirname, '..', '..'); // thư mục gốc dự án
const nm = (p) => path.join(ROOT, 'node_modules', p);
app.use('/vendor/chart', express.static(nm('chart.js/dist')));
app.use('/vendor/manrope', express.static(nm('@fontsource-variable/manrope')));
app.use('/vendor/jbmono', express.static(nm('@fontsource/jetbrains-mono')));
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
