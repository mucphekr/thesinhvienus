// Content Script cho trang Proxy
// Hiển thị countdown khi đợi IP mới

console.log('🌐 Proxy Content Script loaded');

let overlayCreated = false;
let countdownStarted = false;

function createCountdownOverlay() {
    // Chỉ tạo overlay 1 lần
    if (overlayCreated || document.getElementById('proxy-countdown-overlay')) {
        return;
    }
    overlayCreated = true;
    
    // Tạo overlay countdown
    const overlay = document.createElement('div');
    overlay.id = 'proxy-countdown-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 80px; margin-bottom: 20px;">🌐</div>
            <div id="status-text" style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">Đang tải trang proxy...</div>
            <div id="countdown-number" style="font-size: 120px; font-weight: bold; margin: 30px 0; text-shadow: 0 4px 20px rgba(0,0,0,0.3);">⏳</div>
            <div style="font-size: 18px; opacity: 0.9;">Vui lòng đợi để IP mới được áp dụng</div>
            <div style="margin-top: 30px; padding: 15px 30px; background: rgba(255,255,255,0.2); border-radius: 10px; font-size: 14px;">
                <span id="ip-status">⏳ Đang tải...</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    console.log('✅ Overlay created, waiting for page load...');
}

function updateProxyStatus() {
    // Kiểm tra response từ trang
    try {
        const pageText = document.body.innerText || '';
        const statusEl = document.getElementById('ip-status');
        
        if (pageText.includes('success') || pageText.includes('thành công')) {
            statusEl.innerHTML = '✅ Đổi proxy thành công!';
            statusEl.style.color = '#38ef7d';
        } else if (pageText.includes('false')) {
            statusEl.innerHTML = '⏳ Đang chờ IP mới khả dụng...';
            statusEl.style.color = '#ffd700';
        }
    } catch (e) {
        console.log('Error reading page:', e);
    }
}

function startCountdown() {
    if (countdownStarted) return;
    countdownStarted = true;
    
    let countdown = 10;
    const countdownEl = document.getElementById('countdown-number');
    const statusText = document.getElementById('status-text');
    
    // Cập nhật UI khi bắt đầu countdown
    if (statusText) {
        statusText.textContent = 'Đang đổi IP mới...';
    }
    if (countdownEl) {
        countdownEl.textContent = '10';
    }
    
    // Cập nhật trạng thái proxy
    updateProxyStatus();
    
    console.log('⏱️ Starting countdown from', countdown);
    
    function updateCountdown() {
        countdown--;
        console.log('⏱️ Countdown:', countdown);
        
        if (countdownEl) {
            countdownEl.textContent = countdown;
            countdownEl.style.transition = 'transform 0.1s ease';
            countdownEl.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                if (countdownEl) {
                    countdownEl.style.transform = 'scale(1)';
                }
            }, 100);
        }
        
        if (countdown <= 0) {
            if (countdownEl) {
                countdownEl.textContent = '✓';
                countdownEl.style.fontSize = '80px';
            }
            const statusEl = document.getElementById('ip-status');
            if (statusEl) {
                statusEl.innerHTML = '🚀 Đang chuyển đến trang tạo thông tin...';
            }
        } else {
            setTimeout(updateCountdown, 1000);
        }
    }
    
    // Bắt đầu sau 1 giây (hiển thị 10 trong 1 giây đầu)
    setTimeout(updateCountdown, 1000);
}

// Lắng nghe message từ background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📩 Proxy received:', message.action);
    
    if (message.action === 'START_COUNTDOWN') {
        console.log('🚀 Received START_COUNTDOWN signal');
        startCountdown();
        sendResponse({ success: true });
    }
    
    return true;
});

// Tạo overlay ngay lập tức
createCountdownOverlay();
