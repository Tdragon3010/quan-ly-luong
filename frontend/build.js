// Đóng gói giao diện cho Vercel: chép frontend/ + Chart.js + font vào thư mục public/ ở gốc dự án.
// Vercel bỏ qua express.static() và chỉ phục vụ file tĩnh trong public/.
// Chạy: npm run build  (Vercel tự chạy khi deploy). Trên máy không cần chạy lệnh này.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public');
const NM = path.join(ROOT, 'node_modules');

fs.rmSync(OUT, { recursive: true, force: true });

// 1. Giao diện (bỏ file build và README)
fs.cpSync(__dirname, OUT, {
  recursive: true,
  filter: (src) => !['build.js', 'README.md'].includes(path.basename(src)),
});

// Đánh dấu các file .js trong public/ là ES module (import/export chạy trên trình duyệt).
// Thiếu file này, Vercel coi chúng là CommonJS theo package.json gốc và tự chuyển sang
// require/exports, làm trình duyệt báo lỗi "exports is not defined" và trang trống.
fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2) + '\n');

// 2. Chart.js: chỉ bản thu gọn mà index.html dùng
fs.mkdirSync(path.join(OUT, 'vendor', 'chart'), { recursive: true });
fs.copyFileSync(path.join(NM, 'chart.js', 'dist', 'chart.umd.min.js'), path.join(OUT, 'vendor', 'chart', 'chart.umd.min.js'));

// 3. Font: các file .css index.html dùng + đúng những file font chúng trỏ tới
function copyFont(pkgDir, outName, cssFiles) {
  const dest = path.join(OUT, 'vendor', outName);
  fs.mkdirSync(path.join(dest, 'files'), { recursive: true });
  for (const css of cssFiles) {
    const text = fs.readFileSync(path.join(NM, pkgDir, css), 'utf8');
    fs.writeFileSync(path.join(dest, css), text);
    for (const [, rel] of text.matchAll(/url\(\.\/([^)]+)\)/g)) {
      fs.copyFileSync(path.join(NM, pkgDir, rel), path.join(dest, rel));
    }
  }
}
copyFont('@fontsource-variable/manrope', 'manrope', ['index.css']);
copyFont('@fontsource/jetbrains-mono', 'jbmono', ['400.css', '500.css']);

// Thống kê
let files = 0;
let bytes = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else { files++; bytes += fs.statSync(p).size; }
  }
})(OUT);
console.log(`Đã tạo public/: ${files} file, ${(bytes / 1024).toFixed(0)} KB`);
