// Gọi REST API của backend; lỗi được ném ra với thông báo tiếng Việt từ server
export async function api(method, url, body) {
  const res = await fetch('/api' + url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error || `Lỗi ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const get = (url) => api('GET', url);
export const post = (url, body) => api('POST', url, body);
export const put = (url, body) => api('PUT', url, body);
export const del = (url) => api('DELETE', url);

// Tạo query string, bỏ qua giá trị rỗng
export function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, v);
  const str = s.toString();
  return str ? '?' + str : '';
}
