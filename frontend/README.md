# frontend/ (Thành viên 3: Giao diện)

HTML, CSS, JavaScript thuần (không cần build), Chart.js cho biểu đồ. Server ở `backend/` phục vụ thư mục này tại http://localhost:3000.

```
frontend/
├── index.html          khung trang: menu bên trái, vùng nội dung, hộp thoại
├── css/app.css         toàn bộ giao diện: màu, chữ, bảng, form, bản điện thoại, bản in
├── img/                logo và bộ icon
└── js/
    ├── app.js          điều hướng giữa các trang (#/nhan-vien, #/bang-luong, ...)
    ├── api.js          hàm gọi API của backend
    ├── ui.js           dùng chung: định dạng tiền, hộp thoại, form, bảng có sắp xếp
    └── pages/          mỗi file một trang
        ├── tongquan.js    Tổng quan (dashboard, biểu đồ)
        ├── nhanvien.js    Nhân viên (CRUD, tìm kiếm, lọc)
        ├── chamcong.js    Chấm công theo ngày + tổng hợp tháng
        ├── thuongphat.js  Thưởng / phạt
        ├── bangluong.js   Bảng lương, phiếu lương, xuất Excel, in
        ├── baocao.js      Báo cáo thống kê
        └── danhmuc.js     Phòng ban & chức vụ
```

## Cách làm việc

Bật server bằng `npm start` (hoặc `npm run dev`) ở thư mục gốc, mở http://localhost:3000. Sửa file trong `frontend/` rồi tải lại trang là thấy ngay, không cần khởi động lại server.

Thư viện Chart.js và font chữ được server lấy từ `node_modules` (đường dẫn `/vendor/...`), nên demo không cần internet.

## Nhận từ backend

Mọi dữ liệu lấy qua các API trong `backend/API.md`. Cần API mới hoặc thêm trường dữ liệu thì **nhắn Thành viên 2**, không tự sửa trong `backend/`.

## Nội dung báo cáo phụ trách

- Chương 4, phần giao diện: các trang và chức năng.
- Chương 5 (Demo): ảnh chụp màn hình, kịch bản demo. Gợi ý: theo dõi một nhân viên xuyên suốt (ví dụ NV013) từ chấm công đến phiếu lương.
