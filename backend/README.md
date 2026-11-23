# backend/ (Thành viên 2: Backend API)

Node.js + Express 5 + mysql2. Server vừa cung cấp REST API ở `/api/...`, vừa phục vụ giao diện trong `frontend/`.

```
backend/
├── API.md          tài liệu toàn bộ API (đường dẫn, tham số, kỹ thuật SQL của từng báo cáo)
├── src/
│   ├── index.js    khởi động server, gắn route, xử lý lỗi tập trung
│   ├── db.js       kết nối MySQL (đọc .env ở thư mục gốc)
│   ├── utils.js    kiểm tra dữ liệu, đổi lỗi MySQL sang tiếng Việt
│   └── routes/     mỗi file một nhóm API: danhmuc, nhanvien, chamcong, thuongphat, bangluong, baocao
└── tests/
    └── test-api.js 37 ca kiểm thử tự động, tự dọn dữ liệu thử
```

## Lệnh thường dùng (chạy ở thư mục gốc)

| Lệnh | Tác dụng |
|---|---|
| `npm start` | Bật server ở http://localhost:3000 |
| `npm run dev` | Bật server, tự khởi động lại khi sửa code |
| `npm run test-api` | Chạy 37 ca kiểm thử; phải đạt hết trước khi bàn giao |

## Nhận từ database, bàn giao cho frontend

- **Nhận:** tên bảng/cột, view `v_PhieuLuong`, thủ tục `sp_TinhLuong` (xem `database/docs/THIET_KE_CSDL.md`).
- **Bàn giao:** các API trong `API.md`. Đổi đường dẫn, tham số hay tên trường JSON thì **báo Thành viên 3** và cập nhật `API.md`.

## Nội dung báo cáo phụ trách

Chương 4, phần backend: công nghệ, cấu trúc mã nguồn, danh sách API, cách gọi thủ tục tính lương, kết quả kiểm thử (37/37) và thời gian phản hồi. Lấy từ `API.md`.
