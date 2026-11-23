// Chuẩn bị giao diện để deploy:
//  1. Chép Chart.js và font từ node_modules vào frontend/vendor/ (thư mục này được commit cùng code,
//     nên trên Vercel nó được phục vụ y như các file giao diện khác, không phụ thuộc node_modules).
//  2. Chép toàn bộ frontend/ sang public/ ở gốc dự án (Vercel phục vụ file tĩnh trong public/).
// Chạy: npm run build  (Vercel tự chạy khi deploy). Chạy lại trên máy khi nâng cấp Chart.js hoặc font.
// File có đuôi .cjs vì frontend/package.json khai báo "type": "module" (xem file đó).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'public');

// 1. Thư viện dùng trên trình duyệt -> frontend/vendor/
fs.rmSync(VENDOR, { recursive: true, force: true });
fs.mkdirSync(path.join(VENDOR, 'chart'), { recursive: true });
// Lưu dưới đuôi .txt: khi đóng gói, Vercel xử lý riêng các file .js và file này bị mất (404).
// Backend có route trả nó về đúng địa chỉ /vendor/chart/chart.umd.min.js với kiểu JavaScript.
fs.copyFileSync(path.join(NM, 'chart.js', 'dist', 'chart.umd.min.js'), path.join(VENDOR, 'chart', 'chart.umd.min.js.txt'));

// Font: các file .css index.html dùng + đúng những file font chúng trỏ tới
function copyFont(pkgDir, outName, cssFiles) {
  const dest = path.join(VENDOR, outName);
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

// 2. frontend/ -> public/ (bỏ file build và README)
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(__dirname, OUT, {
  recursive: true,
  filter: (src) => !['build.cjs', 'README.md'].includes(path.basename(src)),
});

// Thống kê
const stat = (dir) => {
  let files = 0; let bytes = 0;
  (function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p); else { files++; bytes += fs.statSync(p).size; }
    }
  })(dir);
  return `${files} file, ${(bytes / 1024).toFixed(0)} KB`;
};
console.log(`frontend/vendor/: ${stat(VENDOR)}`);
console.log(`public/: ${stat(OUT)}`);
