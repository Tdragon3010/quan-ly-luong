// Tiện ích dùng chung: lỗi HTTP, kiểm tra dữ liệu đầu vào, xử lý lỗi MySQL

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new HttpError(400, msg);
const notFound = (msg = 'Không tìm thấy dữ liệu') => new HttpError(404, msg);

// Lấy các trường được phép từ body, bỏ qua trường lạ
function pick(body, fields) {
  const out = {};
  for (const f of fields) if (body && body[f] !== undefined) out[f] = body[f];
  return out;
}

function requireFields(obj, fields) {
  const thieu = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (thieu.length) throw badRequest(`Thiếu trường bắt buộc: ${thieu.join(', ')}`);
}

// Đọc tháng/năm từ query, mặc định là kỳ lương gần nhất có dữ liệu
function parseKy(query, macDinh = {}) {
  const thang = Number(query.thang ?? macDinh.thang);
  const nam = Number(query.nam ?? macDinh.nam);
  if (!Number.isInteger(thang) || thang < 1 || thang > 12) throw badRequest('Tháng phải từ 1 đến 12');
  if (!Number.isInteger(nam) || nam < 2000 || nam > 2100) throw badRequest('Năm không hợp lệ');
  return { thang, nam };
}

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);

// Sinh câu UPDATE ... SET a = ?, b = ? từ object
function setClause(obj) {
  const keys = Object.keys(obj);
  if (!keys.length) throw badRequest('Không có dữ liệu để cập nhật');
  return { sql: keys.map((k) => `${k} = ?`).join(', '), values: keys.map((k) => obj[k]) };
}

// Chuyển lỗi MySQL thành thông báo tiếng Việt dễ hiểu
function mysqlErrorToHttp(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      const key = (err.sqlMessage.match(/for key '(?:[\w]+\.)?([\w]+)'/) || [])[1];
      const thongBao = {
        PRIMARY: 'Mã này đã tồn tại',
        UQ_NhanVien_Email: 'Email đã được dùng cho nhân viên khác',
        UQ_NhanVien_SDT: 'Số điện thoại đã được dùng cho nhân viên khác',
        UQ_PhongBan_Ten: 'Tên phòng ban đã tồn tại',
        UQ_ChucVu_Ten: 'Tên chức vụ đã tồn tại',
        UQ_ChamCong_NV_Ngay: 'Nhân viên này đã được chấm công trong ngày',
        UQ_BangLuong_Ky: 'Nhân viên đã có phiếu lương tháng này',
      }[key];
      return new HttpError(409, thongBao || `Dữ liệu bị trùng: ${err.sqlMessage}`);
    }
    case 'ER_ROW_IS_REFERENCED_2':
    case 'ER_ROW_IS_REFERENCED':
      return new HttpError(409, 'Không thể xóa vì đang có dữ liệu khác tham chiếu tới bản ghi này');
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_NO_REFERENCED_ROW':
      return new HttpError(400, 'Mã tham chiếu không tồn tại (phòng ban / chức vụ / nhân viên)');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new HttpError(400, `Dữ liệu vi phạm ràng buộc: ${err.sqlMessage}`);
    case 'ER_SIGNAL_EXCEPTION':
      return new HttpError(400, err.sqlMessage);
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
    case 'WARN_DATA_TRUNCATED':
    case 'ER_WRONG_VALUE':
    case 'ER_DATA_TOO_LONG':
    case 'ER_BAD_NULL_ERROR':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
      return new HttpError(400, `Giá trị không hợp lệ: ${err.sqlMessage}`);
    default:
      return null;
  }
}

module.exports = { HttpError, badRequest, notFound, pick, requireFields, parseKy, isDate, isTime, setClause, mysqlErrorToHttp };
