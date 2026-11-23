// Điểm vào cho Vercel: Vercel chỉ tự nhận server.js / index.js / app.js ở thư mục gốc (hoặc trong src/),
// nên file này chỉ xuất lại ứng dụng Express trong backend/. Chạy trên máy vẫn dùng: npm start
module.exports = require('./backend/src/index');
