export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // bỏ toàn bộ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')   // bỏ số thứ tự đầu chuỗi: "1. xxx", "01. xxx"
    .replace(/[_\s]+/g, '-')    // đổi _ và khoảng trắng thành -
    .replace(/[^a-z0-9-]/g, '') // bỏ mọi ký tự không hợp lệ (giữ a-z, 0-9, -)
    .replace(/-+/g, '-')        // gộp nhiều dấu - thành 1
    .replace(/^-|-$/g, '')      // bỏ - ở đầu/cuối
}
