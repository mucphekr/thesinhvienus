// Popup Script

document.addEventListener('DOMContentLoaded', () => {
    // Load URL và trường đã lưu (nếu có)
    chrome.storage.local.get(['lastSheeridUrl', 'selectedUniversity'], (result) => {
        if (result.lastSheeridUrl) {
            document.getElementById('sheeridUrl').value = result.lastSheeridUrl;
        }
        // Load trường đã chọn
        if (result.selectedUniversity) {
            const radio = document.querySelector(`input[name="university"][value="${result.selectedUniversity}"]`);
            if (radio) radio.checked = true;
        }
    });
    
    // Lưu lựa chọn trường khi thay đổi
    document.querySelectorAll('input[name="university"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            chrome.storage.local.set({ selectedUniversity: e.target.value });
        });
    });
    
    // Bắt đầu Auto Fill
    document.getElementById('startAutoFill').addEventListener('click', () => {
        const urlInput = document.getElementById('sheeridUrl');
        const errorMsg = document.getElementById('errorMsg');
        const url = urlInput.value.trim();
        
        // Lấy trường được chọn
        const selectedUniversity = document.querySelector('input[name="university"]:checked')?.value || 'cornell';
        
        // Validate URL
        if (!url || !url.includes('sheerid.com')) {
            errorMsg.classList.add('show');
            urlInput.style.borderColor = '#ff4b2b';
            return;
        }
        
        // Hide error
        errorMsg.classList.remove('show');
        urlInput.style.borderColor = 'rgba(102, 126, 234, 0.3)';
        
        // Lưu URL và trường
        chrome.storage.local.set({ 
            lastSheeridUrl: url,
            selectedUniversity: selectedUniversity
        });
        
        // Gửi message đến background để bắt đầu quy trình
        chrome.runtime.sendMessage({
            action: 'START_FROM_POPUP',
            url: url,
            university: selectedUniversity
        }, (response) => {
            if (response && response.success) {
                // Đóng popup
                window.close();
            }
        });
    });
    
    // Enter key để submit
    document.getElementById('sheeridUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('startAutoFill').click();
        }
    });
    
    // Clear error khi nhập
    document.getElementById('sheeridUrl').addEventListener('input', () => {
        document.getElementById('errorMsg').classList.remove('show');
        document.getElementById('sheeridUrl').style.borderColor = 'rgba(102, 126, 234, 0.3)';
    });
    
    // Xóa link
    document.getElementById('clearUrl').addEventListener('click', () => {
        document.getElementById('sheeridUrl').value = '';
        document.getElementById('errorMsg').classList.remove('show');
        document.getElementById('sheeridUrl').style.borderColor = 'rgba(102, 126, 234, 0.3)';
        chrome.storage.local.remove('lastSheeridUrl');
        document.getElementById('sheeridUrl').focus();
    });
    
    // Mở SheerID Google One
    document.getElementById('openSheerID').addEventListener('click', () => {
        chrome.tabs.create({
            url: 'https://gemini.google/students/'
        });
    });
    
    // Mở Generator
    document.getElementById('openGenerator').addEventListener('click', () => {
        chrome.tabs.create({
            url: 'https://nguyenbaviet.io.vn/'
        });
    });
});
