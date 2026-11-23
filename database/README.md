# database/ (Thành viên 1: Thiết kế & quản trị CSDL)

```
database/
├── docs/THIET_KE_CSDL.md   ERD, lược đồ quan hệ, ràng buộc, giải thích chuẩn hóa 3NF, quy tắc tính lương
├── schema.sql              tạo CSDL: 6 bảng, view v_PhieuLuong, thủ tục sp_TinhLuong
├── seed.sql                dữ liệu mẫu: 6 phòng ban, 6 chức vụ, 40 nhân viên, 2.804 lượt chấm công, 95 thưởng/phạt
├── queries.sql             6 truy vấn phức tạp (JOIN, GROUP BY, HAVING, subquery, pivot)
└── scripts/
    ├── gen-seed.js         sinh seed.sql (dữ liệu cố định, chạy lại ra cùng kết quả)
    └── init-db.ps1         chạy schema.sql rồi seed.sql vào MySQL
```

## Lệnh thường dùng (chạy ở thư mục gốc)

| Lệnh | Tác dụng |
|---|---|
| `npm run init-db` | Tạo lại toàn bộ CSDL và nạp dữ liệu mẫu (xóa dữ liệu cũ) |
| `npm run seed` | Sinh lại `seed.sql` sau khi sửa `scripts/gen-seed.js` |

Thử một truy vấn: mở `queries.sql` trong MySQL Workbench và chạy từng câu.

## Bàn giao cho backend

Backend phụ thuộc vào: tên bảng/cột, view `v_PhieuLuong` và thủ tục `sp_TinhLuong(thang, nam)`.
Đổi tên cột, thêm cột bắt buộc hay đổi công thức trong thủ tục thì **báo Thành viên 2** và cập nhật `docs/THIET_KE_CSDL.md`.

## Nội dung báo cáo phụ trách

Chương 3 (Thiết kế CSDL): ERD, lược đồ quan hệ, chuẩn hóa 3NF, ràng buộc toàn vẹn, các truy vấn SQL chính. Lấy nội dung từ `docs/THIET_KE_CSDL.md` và `queries.sql`.
