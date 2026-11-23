// Kết nối MySQL dùng connection pool
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');

// SSL: bật khi DB_SSL=true (bắt buộc với MySQL trên Aiven).
// Có DB_SSL_CA (đường dẫn file ca.pem tải từ Aiven) thì kiểm tra chứng chỉ máy chủ;
// không có thì vẫn mã hóa đường truyền nhưng không xác minh chứng chỉ.
function sslConfig() {
  if (String(process.env.DB_SSL).toLowerCase() !== 'true') return undefined;
  const ca = process.env.DB_SSL_CA;
  if (ca) return { ca: fs.readFileSync(path.resolve(__dirname, '..', '..', ca), 'utf8'), rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quan_ly_luong',
  charset: 'utf8mb4',
  ssl: sslConfig(),
  connectionLimit: 10,
  dateStrings: true,     // trả DATE/DATETIME dạng chuỗi, tránh lệch múi giờ
  decimalNumbers: true,  // trả DECIMAL dạng số
});

module.exports = pool;
