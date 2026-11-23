# Đề tài 13: Hệ thống quản lý lương nhân viên

Node.js + Express 5 · MySQL 8.0 · HTML/CSS/JavaScript thuần + Chart.js

## Cấu trúc và phân công

```
btl quân/
├── database/        Thành viên 1: Thiết kế & quản trị CSDL
├── backend/         Thành viên 2: Backend API
├── frontend/        Thành viên 3: Giao diện
├── .env             cấu hình kết nối MySQL (KHÔNG nộp, KHÔNG đưa lên GitHub)
├── package.json     lệnh chạy chung cho cả nhóm
└── README.md        file này
```

| Thư mục | Người phụ trách | Nội dung | Phần báo cáo phụ trách |
|---|---|---|---|
| [database/](database/README.md) | Thành viên 1 | ERD, chuẩn hóa 3NF, tạo bảng, dữ liệu mẫu, thủ tục tính lương, truy vấn phức tạp | Chương 3: Thiết kế CSDL |
| [backend/](backend/README.md) | Thành viên 2 | REST API CRUD, gọi thủ tục, báo cáo, xuất Excel, kiểm thử API | Chương 4: Triển khai hệ thống (phần backend) |
| [frontend/](frontend/README.md) | Thành viên 3 | 7 trang giao diện, form, bảng, sắp xếp/lọc, biểu đồ, demo | Chương 4 (phần giao diện), Chương 5: Demo |

## Các phần nối với nhau ở đâu

```
frontend/  ──gọi HTTP /api/...──▶  backend/  ──truy vấn SQL──▶  database/ (MySQL)
   (trình duyệt)                  (Node.js, cổng 3000)           (bảng, view, thủ tục)
```

| Ranh giới | "Hợp đồng" giữa hai bên | Khi đổi thì báo cho ai |
|---|---|---|
| database ↔ backend | Tên bảng, tên cột, view `v_PhieuLuong`, thủ tục `sp_TinhLuong` (xem [database/docs/THIET_KE_CSDL.md](database/docs/THIET_KE_CSDL.md)) | Thành viên 1 báo Thành viên 2 |
| backend ↔ frontend | Đường dẫn API, tham số, dạng JSON trả về (xem [backend/API.md](backend/API.md)) | Thành viên 2 báo Thành viên 3 |

Quy ước: mỗi người chỉ sửa file trong thư mục của mình. Cần thay đổi bên kia thì nhắn người phụ trách.

## Chạy dự án (cả nhóm dùng chung)

```powershell
npm install          # lần đầu: cài thư viện
npm run init-db      # tạo lại CSDL + dữ liệu mẫu (XÓA dữ liệu cũ)
npm start            # bật server, mở http://localhost:3000
npm run test-api     # chạy 37 ca kiểm thử API
npm run seed         # sinh lại file database/seed.sql
```

Trước khi chạy lần đầu: tạo file `.env` ở thư mục gốc và điền mật khẩu MySQL:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_NAME=quan_ly_luong
PORT=3000
```
