# Tài liệu REST API – Quản lý lương nhân viên

- Công nghệ: Node.js 24 + Express 5 + mysql2 (connection pool), MySQL 8.0
- Địa chỉ gốc: `http://localhost:3000/api`
- Dữ liệu gửi/nhận: JSON. Lỗi trả về dạng `{ "error": "thông báo" }` với mã HTTP 400 (dữ liệu sai), 404 (không tìm thấy), 409 (trùng / đang được tham chiếu), 500 (lỗi máy chủ).
- Chạy server: `npm start` · Kiểm thử tự động: `npm run test-api`

## Cấu trúc mã nguồn

```
backend/
├── API.md                  tài liệu này
├── src/
│   ├── index.js            khởi tạo Express, gắn route, xử lý lỗi tập trung, phục vụ frontend/
│   ├── db.js               connection pool MySQL (đọc cấu hình từ .env ở thư mục gốc)
│   ├── utils.js            kiểm tra dữ liệu, đổi lỗi MySQL thành thông báo tiếng Việt
│   └── routes/
│       ├── danhmuc.js      CRUD Phòng ban, Chức vụ
│       ├── nhanvien.js     CRUD Nhân viên + tìm kiếm
│       ├── chamcong.js     Chấm công (từng bản ghi / cả ngày), tổng hợp công
│       ├── thuongphat.js   CRUD Thưởng/Phạt
│       ├── bangluong.js    Tính lương (gọi sp_TinhLuong), bảng lương, phiếu lương
│       └── baocao.js       Thống kê, báo cáo, xuất Excel
└── tests/
    └── test-api.js         37 ca kiểm thử tự động (npm run test-api)
```

## Danh mục

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/phong-ban` | Danh sách phòng ban kèm số nhân viên đang làm |
| GET | `/phong-ban/:ma` | Chi tiết |
| POST | `/phong-ban` | Thêm `{MaPB, TenPB, MoTa}` |
| PUT | `/phong-ban/:ma` | Sửa `{TenPB, MoTa}` |
| DELETE | `/phong-ban/:ma` | Xóa (409 nếu còn nhân viên) |
| GET/POST/PUT/DELETE | `/chuc-vu[/:ma]` | Tương tự, trường `{MaCV, TenCV, PhuCap}` |

## Nhân viên

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/nhan-vien?q=&maPB=&maCV=&trangThai=` | Tìm theo mã/tên/email/SĐT, lọc theo phòng, chức vụ, trạng thái |
| GET | `/nhan-vien/:ma` | Chi tiết + thống kê lương đã nhận |
| POST | `/nhan-vien` | Thêm (bỏ trống `MaNV` để tự sinh NV041, NV042…) |
| PUT | `/nhan-vien/:ma` | Sửa một hoặc nhiều trường |
| DELETE | `/nhan-vien/:ma` | Xóa (tự xóa kèm chấm công, thưởng phạt, bảng lương – ON DELETE CASCADE) |

## Chấm công

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/cham-cong?maNV=&tu=&den=&trangThai=` | Tra cứu lịch sử chấm công |
| GET | `/cham-cong/ngay/:ngay?maPB=` | Bảng chấm công 1 ngày: mọi NV đang làm + bản ghi nếu đã chấm |
| PUT | `/cham-cong/ngay/:ngay` | Lưu cả bảng chấm công của ngày (mảng bản ghi, trong 1 transaction) |
| GET | `/cham-cong/tong-hop?thang=&nam=` | Tổng hợp số ngày đi làm/muộn/nghỉ theo tháng |
| POST | `/cham-cong` | Thêm 1 bản ghi `{MaNV, Ngay, GioVao, GioRa, TrangThai?}` |
| PUT | `/cham-cong/:id` | Sửa |
| DELETE | `/cham-cong/:id` | Xóa |

Quy tắc: nếu không gửi `TrangThai`, hệ thống tự suy ra từ giờ vào (sau 08:00 → `DiMuon`); nghỉ phép / nghỉ không phép tự xóa giờ vào/ra; giờ ra phải sau giờ vào.

## Thưởng / phạt

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/thuong-phat?thang=&nam=&maNV=&loai=` | Danh sách |
| POST | `/thuong-phat` | Thêm `{MaNV, Thang, Nam, Loai: Thuong/Phat, SoTien, LyDo}` |
| PUT / DELETE | `/thuong-phat/:id` | Sửa / xóa |

## Bảng lương

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/bang-luong/tinh` | Tính / tính lại lương `{Thang, Nam}` → gọi thủ tục `sp_TinhLuong` |
| GET | `/bang-luong?thang=&nam=&maPB=&q=` | Bảng lương tháng |
| GET | `/bang-luong/ky` | Các kỳ lương đã tính + tổng quỹ |
| GET | `/bang-luong/phieu/:maNV?thang=&nam=` | Phiếu lương chi tiết (công, các khoản thưởng/phạt) |
| DELETE | `/bang-luong?thang=&nam=` | Hủy bảng lương 1 tháng |

## Báo cáo – thống kê

| Đường dẫn | Kỹ thuật SQL | Nội dung |
|---|---|---|
| `/bao-cao/tong-quan?thang=&nam=` | aggregate, subquery | Số liệu dashboard |
| `/bao-cao/quy-luong-phong-ban?thang=&nam=` | JOIN 3 bảng, GROUP BY, SUM/AVG/MAX/MIN | Quỹ lương theo phòng ban |
| `/bao-cao/vi-pham?thang=&nam=&soLanMuon=3` | GROUP BY + HAVING | NV đi muộn nhiều / nghỉ không phép |
| `/bao-cao/tren-binh-quan?thang=&nam=` | subquery tương quan + derived table | NV có thực lĩnh cao hơn bình quân phòng |
| `/bao-cao/top-thuong?nam=&tuThang=&denThang=&top=5` | JOIN, GROUP BY, ORDER BY, LIMIT | Top nhân viên được thưởng |
| `/bao-cao/xu-huong?nam=` | JOIN, GROUP BY 2 cột | Quỹ lương từng tháng theo phòng (biểu đồ) |
| `/bao-cao/xuat-excel?thang=&nam=` | — | Tải file Excel bảng lương (có dòng tổng bằng công thức SUM) |

## Kết quả kiểm thử (`npm run test-api`)

37/37 ca kiểm thử đạt, gồm CRUD của mọi bảng, các trường hợp dữ liệu sai (trùng email, khóa ngoại không tồn tại, giờ ra trước giờ vào, số tiền 0, tháng 13…), kiểm tra công thức lương trên một nhân viên thử và kiểm tra xóa dây chuyền. Thời gian phản hồi các API báo cáo: 5–25 ms; tính lương cho 41 nhân viên: ~25 ms.
