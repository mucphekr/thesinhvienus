# 🎓 SheerID Auto Fill Extension

Extension Chrome tự động điền form xác minh sinh viên SheerID

## 📦 Cài đặt

### Bước 1: Tạo Icon
1. Mở file `create-icons.html` trong trình duyệt
2. Click download 3 icon: `icon16.png`, `icon48.png`, `icon128.png`
3. Lưu vào thư mục `extension`

### Bước 2: Cài Extension vào Chrome
1. Mở Chrome và vào `chrome://extensions/`
2. Bật **Developer mode** (góc phải trên)
3. Click **Load unpacked**
4. Chọn thư mục `extension`

## 🚀 Sử dụng

1. Truy cập trang SheerID cần xác minh (ví dụ: Google One Student)
2. Bạn sẽ thấy nút **"🎓 Auto Fill Student"** ở góc phải trên
3. Click vào nút đó
4. Extension sẽ tự động:
   - Mở trang https://nguyenbaviet.io.vn/
   - Tạo tên sinh viên ngẫu nhiên
   - Copy script điền form
   - Quay lại trang SheerID
   - Tự động điền form và submit

## 📁 Cấu trúc file

```
extension/
├── manifest.json          # Config extension
├── background.js          # Service worker điều phối
├── content-sheerid.js     # Script chạy trên SheerID
├── content-generator.js   # Script chạy trên Generator
├── popup.html             # Giao diện popup
├── popup.js               # Logic popup
├── icon16.png             # Icon 16x16
├── icon48.png             # Icon 48x48
├── icon128.png            # Icon 128x128
└── create-icons.html      # Tool tạo icon
```

## ⚠️ Lưu ý

- Extension chỉ hoạt động trên các trang:
  - `https://services.sheerid.com/verify/*`
  - `https://nguyenbaviet.io.vn/*`
- Cần có kết nối internet để tạo tên ngẫu nhiên

## 🔧 Troubleshooting

**Extension không hoạt động?**
1. Kiểm tra đã bật Developer mode chưa
2. Reload extension (click icon refresh)
3. Refresh trang SheerID

**Không thấy nút Auto Fill?**
1. Kiểm tra URL có đúng format `services.sheerid.com/verify/...`
2. Đợi trang load hoàn toàn
3. Thử refresh trang

---

Made with ❤️ by [nguyenbaviet.io.vn](https://nguyenbaviet.io.vn)

