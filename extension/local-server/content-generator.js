// Content Script cho trang Generator (nguyenbaviet.io.vn)

console.log('🟢 Generator Content Script loaded');

// Mapping trường với selector và tên
const universityConfig = {
    'cornell': {
        selector: 'button[data-doc="cornell"]',
        name: 'Cornell University'
    },
    'umd': {
        selector: 'button[data-doc="umd"]',
        name: 'UMD-College Park'
    },
    'csu': {
        selector: 'button[data-doc="csu"]',
        name: 'CSU Fullerton'
    },
    'au': {
        selector: 'button[data-doc="au"]',
        name: 'American University'
    },
    'columbia': {
        selector: 'button[data-doc="columbia"]',
        name: 'Columbia University (New York, NY)'
    },
    'dartmouth': {
        selector: 'button[data-doc="dartmouth"]',
        name: 'Dartmouth College'
    },
    'stanford': {
        selector: 'button[data-doc="stanford"]',
        name: 'Stanford University'
    }
};

// Hiển thị overlay trạng thái
function showStatus(message, type = 'info') {
    let overlay = document.getElementById('ext-status-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ext-status-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(overlay);
    }
    
    const icons = { info: '⏳', success: '✅', error: '❌' };
    const colors = { info: '#667eea', success: '#38ef7d', error: '#ff4b2b' };
    
    overlay.innerHTML = `
        <div style="background: white; padding: 40px 60px; border-radius: 20px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 20px;">${icons[type]}</div>
            <div style="font-size: 18px; color: #333; font-weight: bold; margin-bottom: 10px;">${message}</div>
            <div style="font-size: 14px; color: #666;">SheerID Auto Fill Extension</div>
            ${type === 'info' ? `<div style="margin-top: 20px; width: 200px; height: 4px; background: #eee; border-radius: 2px; overflow: hidden;"><div style="width: 30%; height: 100%; background: ${colors[type]}; animation: loading 1s infinite;"></div></div><style>@keyframes loading { 0% { margin-left: 0; } 50% { margin-left: 70%; } 100% { margin-left: 0; } }</style>` : ''}
        </div>
    `;
    overlay.style.display = 'flex';
}

function hideStatus() {
    const overlay = document.getElementById('ext-status-overlay');
    if (overlay) overlay.remove();
}

// Lắng nghe message từ background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📩 Generator received:', message.action, 'University:', message.university);
    if (message.action === 'GENERATE_AND_COPY') {
        generateAndCopy(message.university || 'cornell');
        sendResponse({ success: true });
    }
    return true;
});

// Hàm chính
async function generateAndCopy(university = 'cornell') {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    try {
        const config = universityConfig[university] || universityConfig['cornell'];
        showStatus(`Đang chọn ${config.name}...`, 'info');
        
        // Bước 0: Click chọn trường đại học đã chọn
        console.log(`🏫 Clicking ${config.name} button...`);
        const uniBtn = document.querySelector(config.selector);
        if (!uniBtn) throw new Error(`Không tìm thấy nút ${config.name}`);
        
        uniBtn.click();
        await delay(2000); // Đợi trang load danh sách sinh viên
        
        showStatus('Đang tạo thông tin sinh viên...', 'info');
        
        // Bước 1: Click nút Random US Name
        console.log('🎲 Clicking Random US Name...');
        const randomBtn = document.querySelector('.btn-random');
        if (!randomBtn) throw new Error('Không tìm thấy nút Random');
        
        randomBtn.click();
        await delay(5000); // Đợi API trả về và render canvas hoàn chỉnh
        
        showStatus('Đang đọc thông tin...', 'info');
        
        // Bước 2: Đọc dữ liệu trực tiếp từ DOM
        const firstName = document.getElementById('firstName')?.textContent?.trim();
        const lastName = document.getElementById('lastName')?.textContent?.trim();
        const email = document.getElementById('studentEmail')?.textContent?.trim();
        const schoolName = document.getElementById('schoolName')?.textContent?.trim();
        const birthDateText = document.getElementById('birthDate')?.textContent?.trim();
        
        console.log('📋 Data:', { firstName, lastName, email, schoolName, birthDateText });
        
        if (!firstName || firstName === '-' || !email || email === '-') {
            throw new Error('Dữ liệu chưa được tạo. Đang thử lại...');
        }
        
        // Parse birth date (format: "day/Month/year" e.g. "15/January/2002")
        const birthParts = birthDateText?.split('/') || [];
        const birthDay = birthParts[0] || '15';
        const birthMonth = birthParts[1] || 'January';
        const birthYear = birthParts[2] || '2002';
        
        showStatus('Đang tạo script...', 'info');
        
        // Bước 3: Tự tạo script từ dữ liệu đã đọc
        const script = generateScript({
            firstName,
            lastName: lastName === '-' ? '' : lastName,
            email,
            schoolName,
            birthDay,
            birthMonth,
            birthYear,
            country: 'United States'
        });
        
        console.log('✅ Script generated, length:', script.length);
        
        // Bước 4: Capture ảnh từ canvas
        showStatus('Đang lưu ảnh thẻ sinh viên...', 'info');
        
        // Đợi thêm để đảm bảo canvas đã render xong
        await delay(2000);
        
        // Thử gọi applyName() nếu có để đảm bảo canvas được vẽ
        if (typeof window.applyName === 'function') {
            console.log('📷 Calling applyName() to ensure canvas is rendered...');
            window.applyName();
            await delay(1000);
        }
        
        // Tìm canvas và capture ảnh (thử nhiều ID)
        let canvas = document.getElementById('imageCanvas') || document.getElementById('canvas');
        
        // Nếu không tìm thấy, thử tìm bằng selector
        if (!canvas) {
            canvas = document.querySelector('canvas');
        }
        
        let imageDataUrl = null;
        let imageFileName = null;
        
        if (canvas) {
            console.log('📷 Found canvas:', canvas.id, 'Size:', canvas.width, 'x', canvas.height);
            
            // Kiểm tra canvas có nội dung không (không phải trắng hoàn toàn)
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
            const hasContent = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0 && val !== 255);
            console.log('📷 Canvas has content:', hasContent);
            
            try {
                imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                // Tạo filename từ tên trường và tên sinh viên
                const schoolShort = config.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
                imageFileName = `${schoolShort}_${firstName}_${lastName}_StudentID.jpg`;
                console.log('✅ Canvas captured:', imageFileName, 'Data length:', imageDataUrl.length);
            } catch (e) {
                console.log('⚠️ Cannot capture canvas (might be tainted):', e.message);
                // Canvas bị tainted do cross-origin image
                // Thử tìm ảnh original và vẽ lại
                showStatus('⚠️ Lỗi bảo mật canvas, thử phương pháp khác...', 'info');
            }
        } else {
            console.log('⚠️ Canvas not found - listing all canvas elements:');
            document.querySelectorAll('canvas').forEach((c, i) => {
                console.log(`  Canvas ${i}: id="${c.id}", class="${c.className}"`);
            });
        }
        
        // Lưu ảnh vào storage VÀ download xuống máy
        if (imageDataUrl && imageDataUrl.length > 1000) {
            // Kiểm tra xem ảnh có data thực sự không (không phải canvas trắng)
            const imageData = {
                dataUrl: imageDataUrl,
                fileName: imageFileName,
                studentName: `${firstName} ${lastName}`,
                timestamp: Date.now()
            };
            
            // Lưu vào storage (dùng cho auto-upload)
            await chrome.storage.local.set({ studentImage: imageData });
            console.log('✅ Image saved to storage, size:', Math.round(imageDataUrl.length / 1024), 'KB');
            
            // Verify lại
            const verify = await chrome.storage.local.get(['studentImage']);
            if (verify.studentImage) {
                console.log('✅ Verified: Image is in storage');
            } else {
                console.log('❌ Error: Image not saved properly');
            }
        } else {
            console.log('⚠️ Image data is empty or too small, not saving');
        }
        
        // Bước 5: Gửi về background
        showStatus('Đang gửi script...', 'success');
        await delay(500);
        
        chrome.runtime.sendMessage({
            action: 'SCRIPT_READY',
            script: script,
            hasImage: !!imageDataUrl
        });
        
        showStatus('Hoàn thành! Quay lại SheerID...', 'success');
        await delay(1000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showStatus('Lỗi: ' + error.message, 'error');
        setTimeout(hideStatus, 3000);
    }
}

// Tạo script điền form
function generateScript(data) {
    return `(async () => {
    const CONFIG = {
        country: "${data.country}",
        schoolName: "${data.schoolName}",
        firstName: "${data.firstName}",
        lastName: "${data.lastName}",
        birthDay: "${data.birthDay}",
        birthMonth: "${data.birthMonth}",
        birthYear: "${data.birthYear}",
        email: "${data.email}",
        targetLanguage: "English (UK)",
        delays: { default: 400, dropdownWait: 2000, schoolWait: 2500, monthWait: 600, typing: 200, languageWait: 2000 }
    };
    
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    // Hàm tìm input theo nhiều cách
    const findInput = (selectors) => {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    };
    
    // Hàm điền input
    const fillInput = async (el, value) => {
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(200);
        el.focus();
        await delay(100);
        el.click();
        await delay(100);
        
        // Clear existing value
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(100);
        
        // Type value
        for (const char of value) {
            el.value += char;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(30);
        }
        
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        await delay(CONFIG.delays.default);
        return true;
    };
    
    // Hàm click dropdown option
    const selectOption = async (text, waitTime = 1500) => {
        await delay(waitTime);
        const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .MuiAutocomplete-option, [data-option-index]');
        for (const opt of options) {
            const optText = (opt.innerText || opt.textContent || '').toLowerCase();
            if (optText.includes(text.toLowerCase())) {
                opt.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await delay(200);
                opt.click();
                console.log("✅ Selected: " + text);
                await delay(500);
                return true;
            }
        }
        console.log("⚠️ Option not found: " + text);
        return false;
    };
    
    console.log("🚀 Bắt đầu điền form SheerID...");
    console.log("📋 Thông tin:", CONFIG.firstName, CONFIG.lastName, CONFIG.email);
    
    // === BƯỚC 1: Change Language ===
    console.log("🌐 Bước 1: Kiểm tra ngôn ngữ...");
    const langInput = document.querySelector('#changeLanguageSelector-input, [id*="changeLanguage"], [aria-label*="language" i]');
    if (langInput && !langInput.value.includes('English')) {
        langInput.click();
        await delay(500);
        await selectOption('English (UK)', 500);
        await delay(CONFIG.delays.languageWait);
    } else {
        console.log("✅ Ngôn ngữ đã OK");
    }
    await delay(500);
    
    // === BƯỚC 2: Country ===
    console.log("🌍 Bước 2: Điền Country...");
    const countrySelectors = [
        'input[id*="country" i]',
        'input[name*="country" i]',
        'input[placeholder*="Country" i]',
        '[aria-label*="country" i] input',
        '#country-input',
        '.sid-field--country input'
    ];
    const countryInput = findInput(countrySelectors);
    if (countryInput) {
        await fillInput(countryInput, CONFIG.country);
        await selectOption(CONFIG.country, CONFIG.delays.dropdownWait);
    } else {
        console.log("⚠️ Không tìm thấy Country input");
    }
    await delay(500);
    
    // === BƯỚC 3: School ===
    console.log("🏫 Bước 3: Điền School...");
    const schoolSelectors = [
        'input[id*="college" i]',
        'input[id*="school" i]',
        'input[name*="organization" i]',
        'input[placeholder*="School" i]',
        'input[placeholder*="search" i]',
        '.sid-field--organization input',
        '[aria-label*="school" i] input'
    ];
    const schoolInput = findInput(schoolSelectors);
    if (schoolInput) {
        await fillInput(schoolInput, CONFIG.schoolName);
        await selectOption(CONFIG.schoolName.split('(')[0].trim(), CONFIG.delays.schoolWait);
    } else {
        console.log("⚠️ Không tìm thấy School input");
    }
    await delay(500);
    
    // === BƯỚC 4: First Name ===
    console.log("👤 Bước 4: Điền First Name...");
    const firstNameSelectors = [
        'input[id*="first" i]',
        'input[name*="first" i]',
        'input[placeholder*="First" i]',
        '.sid-field--firstName input',
        '[aria-label*="first name" i]'
    ];
    const firstNameInput = findInput(firstNameSelectors);
    if (firstNameInput) {
        await fillInput(firstNameInput, CONFIG.firstName);
    }
    await delay(300);
    
    // === BƯỚC 5: Last Name ===
    console.log("👤 Bước 5: Điền Last Name...");
    const lastNameSelectors = [
        'input[id*="last" i]',
        'input[name*="last" i]',
        'input[placeholder*="Last" i]',
        '.sid-field--lastName input',
        '[aria-label*="last name" i]'
    ];
    const lastNameInput = findInput(lastNameSelectors);
    if (lastNameInput) {
        await fillInput(lastNameInput, CONFIG.lastName);
    }
    await delay(300);
    
    // === BƯỚC 6: Birth Month ===
    console.log("📅 Bước 6: Chọn Month...");
    const monthSelectors = [
        'input[id*="month" i]',
        'select[id*="month" i]',
        '[aria-label*="month" i]',
        '.sid-field--birthDate input[placeholder*="Month" i]',
        '[placeholder="Month"]'
    ];
    const monthInput = findInput(monthSelectors);
    if (monthInput) {
        monthInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(200);
        monthInput.click();
        await delay(500);
        await selectOption(CONFIG.birthMonth, CONFIG.delays.monthWait);
    }
    await delay(300);
    
    // === BƯỚC 7: Birth Day ===
    console.log("📅 Bước 7: Điền Day...");
    const daySelectors = [
        'input[id*="day" i]',
        'input[name*="day" i]',
        'input[placeholder*="Day" i]',
        '.sid-field--birthDate input[placeholder="Day"]'
    ];
    const dayInput = findInput(daySelectors);
    if (dayInput) {
        await fillInput(dayInput, CONFIG.birthDay);
    }
    await delay(300);
    
    // === BƯỚC 8: Birth Year ===
    console.log("📅 Bước 8: Điền Year...");
    const yearSelectors = [
        'input[id*="year" i]',
        'input[name*="year" i]',
        'input[placeholder*="Year" i]',
        '.sid-field--birthDate input[placeholder="Year"]'
    ];
    const yearInput = findInput(yearSelectors);
    if (yearInput) {
        await fillInput(yearInput, CONFIG.birthYear);
    }
    await delay(300);
    
    // === BƯỚC 9: Email ===
    console.log("📧 Bước 9: Điền Email...");
    const emailSelectors = [
        'input[id*="email" i]',
        'input[name*="email" i]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
        '.sid-field--email input'
    ];
    const emailInput = findInput(emailSelectors);
    if (emailInput) {
        await fillInput(emailInput, CONFIG.email);
    }
    await delay(500);
    
    console.log("═══════════════════════════════════════════");
    console.log("✅ HOÀN THÀNH ĐIỀN FORM!");
    console.log("👤 Họ tên: " + CONFIG.firstName + " " + CONFIG.lastName);
    console.log("🎂 Ngày sinh: " + CONFIG.birthDay + "/" + CONFIG.birthMonth + "/" + CONFIG.birthYear);
    console.log("📧 Email: " + CONFIG.email);
    console.log("🏫 Trường: " + CONFIG.schoolName);
    console.log("═══════════════════════════════════════════");
    
    // === Click Verify ===
    await delay(1000);
    console.log("🔍 Đang tìm nút Verify...");
    const allBtns = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')];
    const verifyBtn = allBtns.find(btn => {
        const text = (btn.innerText || btn.textContent || btn.value || '').toLowerCase();
        return text.includes('verify') || text.includes('submit') || text.includes('xác minh');
    });
    
    if (verifyBtn && !verifyBtn.disabled) {
        verifyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(500);
        verifyBtn.focus();
        await delay(200);
        verifyBtn.click();
        console.log("✅ Đã click nút Verify!");
    } else {
        console.log("⚠️ Vui lòng click thủ công nút Verify");
    }
})();`;
}

console.log('✅ Generator content script ready');
