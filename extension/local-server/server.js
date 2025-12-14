// Local Server cho SheerID Auto Fill Extension
// Chạy: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    // CORS headers - cho phép extension truy cập
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Xử lý route
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // Loại bỏ query string
    filePath = filePath.split('?')[0];
    
    // Đường dẫn đầy đủ
    const fullPath = path.join(__dirname, filePath);
    
    // Kiểm tra file tồn tại
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // File không tồn tại, trả về index.html (SPA fallback)
            if (filePath !== '/index.html') {
                const indexPath = path.join(__dirname, 'index.html');
                serveFile(indexPath, res);
            } else {
                res.writeHead(404);
                res.end('404 Not Found');
            }
            return;
        }
        
        serveFile(fullPath, res);
    });
});

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('500 Internal Server Error');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 SheerID Auto Fill - Local Server');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Hướng dẫn:');
    console.log('   1. Giữ terminal này mở');
    console.log('   2. Reload extension trong Chrome');
    console.log('   3. Sử dụng extension như bình thường');
    console.log('');
    console.log('⏹️  Nhấn Ctrl+C để dừng server');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});

