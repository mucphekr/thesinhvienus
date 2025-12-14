# SheerID Auto Fill - Local Server

## Yêu cầu
- Node.js (tải từ https://nodejs.org/)

## Cách sử dụng

### Windows
1. Double-click vào file `start-server.bat`
2. Hoặc mở PowerShell và chạy: `.\start-server.ps1`
3. Hoặc mở Command Prompt và chạy: `node server.js`

### Server sẽ chạy tại
```
http://localhost:3000
```

## Tại sao cần Local Server?

1. **Kiểm soát tốt hơn**: Chạy local cho phép extension có quyền truy cập đầy đủ vào canvas và file
2. **Không phụ thuộc mạng**: Không cần internet để tạo thông tin sinh viên
3. **Tốc độ nhanh hơn**: Không có độ trễ mạng
4. **Bảo mật hơn**: Dữ liệu không gửi qua internet

## Cấu trúc thư mục

```
local-server/
├── server.js           # Node.js server
├── index.html          # Trang generator (copy từ student-name-generator.html)
├── start-server.bat    # Script khởi động (Windows)
├── start-server.ps1    # Script khởi động (PowerShell)
├── README.md           # File này
└── *.jpg               # Các file ảnh template
```

## Lưu ý

- Giữ terminal/command prompt mở khi sử dụng extension
- Nhấn `Ctrl+C` để dừng server
- Extension sẽ tự động phát hiện localhost và sử dụng nếu có

