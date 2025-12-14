// Content Script cho trang SheerID
// Xử lý tất cả các bước xác minh

console.log('🔵 SheerID Content Script loaded');
console.log('📍 Current URL:', window.location.href);

// Kiểm tra trạng thái trang hiện tại
function detectPageState() {
    const pageText = document.body?.innerText || '';
    const pageTextLower = pageText.toLowerCase();
    
    // 1. Form page
    if (pageTextLower.includes('verify your student status') || pageTextLower.includes('country*')) {
        return 'FORM_PAGE';
    }
    
    // 2. Upload page - trang yêu cầu upload tài liệu
    if (pageTextLower.includes('upload proof of enrollment') || 
        pageTextLower.includes('add documents') ||
        pageTextLower.includes('upload documents') ||
        pageTextLower.includes('proof of enrollment')) {
        console.log('🔍 Detected UPLOAD_PAGE');
        return 'UPLOAD_PAGE';
    }
    
    // 3. Success page
    if (pageTextLower.includes('verification is complete') || pageTextLower.includes('successfully verified')) {
        return 'SUCCESS_PAGE';
    }
    
    return 'UNKNOWN';
}


// Tạo nút điều khiển
function createControlButton() {
    if (document.getElementById('sheerid-auto-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'sheerid-auto-btn';
    btn.innerHTML = '🎓 Auto Fill Student';
    btn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 25px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        transition: all 0.3s ease;
        font-family: Arial, sans-serif;
    `;
    
    btn.onmouseover = () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    };
    btn.onmouseout = () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    };
    
    btn.onclick = startAutoFill;
    document.body.appendChild(btn);
    console.log('✅ Control button created');
}

function updateButton(text, color) {
    const btn = document.getElementById('sheerid-auto-btn');
    if (btn) {
        btn.innerHTML = text;
        btn.style.background = color;
    }
}

// Bắt đầu quy trình
function startAutoFill() {
    updateButton('⏳ Đang tạo...', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
    
    chrome.runtime.sendMessage({
        action: 'START_PROCESS',
        url: window.location.href
    });
}

// Lắng nghe message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📩 SheerID received:', message.action);
    
    if (message.action === 'FILL_FORM' && message.script) {
        console.log('🚀 Starting form fill...');
        
        // Parse data từ script
        const data = parseScriptData(message.script);
        console.log('📋 Parsed data:', data);
        
        if (data.firstName) {
            fillForm(data);
        }
        
        sendResponse({ success: true });
    }
    
    return true;
});

// Parse data từ script string
function parseScriptData(script) {
    const get = (key) => {
        const match = script.match(new RegExp(`${key}: "([^"]+)"`));
        return match ? match[1] : '';
    };
    
    return {
        country: get('country') || 'United States',
        schoolName: get('schoolName'),
        firstName: get('firstName'),
        lastName: get('lastName'),
        birthDay: get('birthDay'),
        birthMonth: get('birthMonth'),
        birthYear: get('birthYear'),
        email: get('email')
    };
}

// ==================== FORM FILLING LOGIC ====================

// Đợi trang load hoàn tất với các element chính
async function waitForPageReady(maxWaitTime = 15000) {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    const startTime = Date.now();
    
    console.log('⏳ Waiting for page to be fully ready...');
    updateButton('⏳ Đợi trang load...', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    
    // Đợi document ready state
    while (document.readyState !== 'complete' && (Date.now() - startTime) < maxWaitTime) {
        await delay(200);
    }
    console.log('📄 Document ready state:', document.readyState);
    
    // Đợi các element quan trọng xuất hiện
    const importantSelectors = [
        '#changeLanguageSelector-input',
        'input[id*="country" i]',
        'input[id*="firstName" i]',
        'form'
    ];
    
    let foundElements = 0;
    let attempts = 0;
    const maxAttempts = 50; // 50 * 200ms = 10 giây
    
    while (foundElements < 2 && attempts < maxAttempts && (Date.now() - startTime) < maxWaitTime) {
        await delay(200);
        foundElements = 0;
        
        for (const sel of importantSelectors) {
            if (document.querySelector(sel)) {
                foundElements++;
            }
        }
        attempts++;
        
        if (attempts % 10 === 0) {
            console.log(`⏳ Đang chờ elements... (${foundElements}/${importantSelectors.length} found, attempt ${attempts})`);
        }
    }
    
    // Đợi thêm 1 giây để đảm bảo trang ổn định
    console.log(`✅ Page ready check completed: ${foundElements} important elements found`);
    await delay(1000);
    
    return foundElements >= 1;
}

// Kiểm tra xem trang có đang ở tiếng Anh không
function isPageInEnglish() {
    const langSelector = document.querySelector('#changeLanguageSelector-input');
    const currentValue = (langSelector?.value || '').trim().toLowerCase();
    
    // Kiểm tra giá trị selector
    if (currentValue.includes('english')) {
        return true;
    }
    
    // Kiểm tra text trên trang
    const pageText = document.body.innerText.toLowerCase();
    const englishKeywords = ['country', 'first name', 'last name', 'birth date', 'email', 'verify your', 'student status'];
    const nonEnglishKeywords = ['국가', '이름', '생년월일', '이메일', '학생', '한국어', 'país', 'nombre', 'fecha', 'correo', '国家', '姓名', '出生日期', '邮箱'];
    
    // Nếu có từ khóa không phải tiếng Anh -> không phải English
    for (const keyword of nonEnglishKeywords) {
        if (pageText.includes(keyword)) {
            console.log('🔍 Found non-English keyword:', keyword);
            return false;
        }
    }
    
    // Nếu có từ khóa tiếng Anh -> là English
    let englishCount = 0;
    for (const keyword of englishKeywords) {
        if (pageText.includes(keyword)) {
            englishCount++;
        }
    }
    
    return englishCount >= 2;
}

// Kiểm tra và đổi ngôn ngữ sang English (với retry)
async function ensureEnglishLanguage(maxRetries = 3) {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    for (let retry = 0; retry < maxRetries; retry++) {
        console.log(`🌐 Checking language... (attempt ${retry + 1}/${maxRetries})`);
        updateButton(`🌐 Đổi ngôn ngữ... (${retry + 1}/${maxRetries})`, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
        
        // Kiểm tra xem đã là tiếng Anh chưa
        if (isPageInEnglish()) {
            console.log('✅ Page is already in English');
            return true;
        }
        
        // Thử đổi ngôn ngữ
        const success = await tryChangeLanguage();
        
        if (success) {
            // Đợi trang reload
            console.log('⏳ Waiting for page to reload after language change...');
            updateButton('⏳ Đợi trang cập nhật...', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
            
            await waitForPageReload();
            
            // Kiểm tra lại sau khi reload
            if (isPageInEnglish()) {
                console.log('✅ Language changed to English successfully!');
                return true;
            }
        }
        
        // Nếu thất bại, đợi và thử lại
        if (retry < maxRetries - 1) {
            console.log(`⚠️ Language change failed, retrying in 2 seconds...`);
            await delay(2000);
        }
    }
    
    console.log('❌ Failed to change language after all retries');
    return false;
}

// Đợi trang reload sau khi đổi ngôn ngữ
async function waitForPageReload() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    // Đợi trang bắt đầu reload
    await delay(1500);
    
    // Đợi document ready
    let attempts = 0;
    const maxAttempts = 40; // 40 * 250ms = 10 giây
    
    while (attempts < maxAttempts) {
        await delay(250);
        attempts++;
        
        if (document.readyState === 'complete') {
            const langSelector = document.querySelector('#changeLanguageSelector-input');
            const countryInput = document.querySelector('input[id*="country" i]');
            
            if (langSelector || countryInput) {
                console.log(`✅ Page ready after ${attempts * 250 + 1500}ms`);
                // Đợi thêm để React render xong
                await delay(1500);
                return;
            }
        }
    }
    
    // Fallback: đợi thêm nếu không detect được
    await delay(2000);
}

// Thử đổi ngôn ngữ sang English
async function tryChangeLanguage() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    // Tìm language selector
    const langSelector = document.querySelector('#changeLanguageSelector-input');
    
    if (!langSelector) {
        console.log('❌ Language selector not found');
        return false;
    }
    
    const currentValue = (langSelector.value || '').trim();
    console.log('📍 Current language value:', currentValue);
    
    // Scroll vào view
    langSelector.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(500);
    
    // Cách 1: Clear input và gõ "English"
    console.log('🖱️ Trying method 1: Type "English"...');
    langSelector.focus();
    await delay(200);
    
    // Clear giá trị hiện tại
    langSelector.value = '';
    langSelector.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(300);
    
    // Gõ "English"
    for (const char of 'English') {
        langSelector.value += char;
        langSelector.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(50);
    }
    await delay(800);
    
    // Tìm và click option English trong dropdown
    let found = await findAndClickEnglishOption();
    
    if (found) {
        await delay(500);
        return true;
    }
    
    // Cách 2: Click để mở dropdown rồi chọn
    console.log('🖱️ Trying method 2: Click dropdown...');
    
    // Clear và focus lại
    langSelector.value = '';
    langSelector.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(200);
    
    // Click để mở dropdown
    langSelector.click();
    langSelector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await delay(300);
    langSelector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    await delay(500);
    
    // Tìm và click English
    found = await findAndClickEnglishOption();
    
    if (found) {
        await delay(500);
        return true;
    }
    
    // Cách 3: Dùng keyboard navigation
    console.log('🖱️ Trying method 3: Keyboard navigation...');
    langSelector.focus();
    await delay(200);
    
    // Mở dropdown bằng ArrowDown
    langSelector.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await delay(500);
    
    found = await findAndClickEnglishOption();
    
    return found;
}

// Tìm và click vào option English trong dropdown
async function findAndClickEnglishOption() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    // Đợi dropdown xuất hiện
    await delay(500);
    
    // Tìm menu dropdown
    const menuSelectors = [
        '[id*="changeLanguageSelector-menu"]',
        '[id*="changeLanguageSelector-listbox"]',
        '[role="listbox"]',
        '.MuiAutocomplete-listbox',
        'ul[role="listbox"]'
    ];
    
    let menu = null;
    for (const sel of menuSelectors) {
        menu = document.querySelector(sel);
        if (menu) break;
    }
    
    if (!menu) {
        console.log('❌ Dropdown menu not found');
        return false;
    }
    
    console.log('✅ Found dropdown menu');
    
    // Tìm tất cả options
    const options = menu.querySelectorAll('li, [role="option"], [data-option-index]');
    console.log('📋 Found', options.length, 'options');
    
    // Log tất cả options để debug
    options.forEach((opt, idx) => {
        const text = (opt.innerText || opt.textContent || '').trim();
        console.log(`  Option ${idx}: "${text}"`);
    });
    
    // Tìm English option (ưu tiên "English" chính xác, sau đó là variant)
    let englishOption = null;
    
    // Ưu tiên 1: "English" chính xác
    for (const opt of options) {
        const text = (opt.innerText || opt.textContent || '').trim();
        if (text === 'English') {
            englishOption = opt;
            break;
        }
    }
    
    // Ưu tiên 2: Bắt đầu bằng "English"
    if (!englishOption) {
        for (const opt of options) {
            const text = (opt.innerText || opt.textContent || '').trim();
            if (text.startsWith('English')) {
                englishOption = opt;
                break;
            }
        }
    }
    
    // Ưu tiên 3: Chứa "english" (case insensitive)
    if (!englishOption) {
        for (const opt of options) {
            const text = (opt.innerText || opt.textContent || '').toLowerCase().trim();
            if (text.includes('english')) {
                englishOption = opt;
                break;
            }
        }
    }
    
    if (!englishOption) {
        console.log('❌ English option not found in dropdown');
        // Đóng dropdown
        document.body.click();
        return false;
    }
    
    console.log('✅ Found English option:', englishOption.innerText?.trim());
    
    // Scroll option vào view
    englishOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(300);
    
    // Click option với nhiều cách
    try {
        // Cách 1: Direct click
        englishOption.click();
        await delay(100);
        
        // Cách 2: MouseEvent
        englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        await delay(50);
        englishOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        await delay(50);
        englishOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        await delay(100);
        
        // Cách 3: PointerEvent (cho MUI)
        englishOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        await delay(50);
        englishOption.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
        
        console.log('✅ Clicked English option');
        return true;
        
    } catch (e) {
        console.log('⚠️ Error clicking option:', e);
        return false;
    }
}

async function fillForm(CONFIG) {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    updateButton('🌐 Kiểm tra ngôn ngữ...', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
    
    const findInput = (selectors) => {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    };
    
    const fillInput = async (el, value) => {
        if (!el || !value) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(300);
        el.focus();
        await delay(100);
        el.click();
        await delay(100);
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(100);
        
        for (const char of value.toString()) {
            el.value += char;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(40);
        }
        
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        await delay(400);
        console.log('✅ Filled:', value);
        return true;
    };
    
    const selectOption = async (searchText, waitTime = 1500) => {
        await delay(waitTime);
        const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .MuiAutocomplete-option, [data-option-index], ul li');
        
        for (const opt of options) {
            const optText = (opt.innerText || opt.textContent || '').toLowerCase();
            if (optText.includes(searchText.toLowerCase())) {
                opt.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await delay(200);
                opt.click();
                console.log('✅ Selected:', searchText);
                await delay(500);
                return true;
            }
        }
        console.log('⚠️ Option not found:', searchText);
        return false;
    };
    
    try {
        console.log('🚀 Bắt đầu điền form...');
        
        // Đợi trang load hoàn tất với các element chính
        console.log('⏳ Đợi trang load hoàn tất...');
        const pageReady = await waitForPageReady(15000);
        if (!pageReady) {
            console.log('⚠️ Page may not be fully loaded, but continuing...');
        }
        
        // 1. KIỂM TRA VÀ ĐỔI NGÔN NGỮ SANG ENGLISH TRƯỚC
        // Lưu config vào storage trước khi đổi ngôn ngữ (phòng trường hợp trang reload)
        await chrome.storage.local.set({ 
            pendingFormFill: true,
            pendingConfig: CONFIG 
        });
        
        const langOK = await ensureEnglishLanguage(3);
        
        // Kiểm tra lại sau khi đổi ngôn ngữ - nếu trang đã reload, script này có thể đã bị kill
        // và script mới sẽ được inject, nó sẽ check pendingFormFill trong init
        if (!langOK) {
            console.log('⚠️ Could not verify English language, but continuing...');
        }
        
        // Clear pending flag vì đã qua bước đổi ngôn ngữ
        await chrome.storage.local.remove(['pendingFormFill', 'pendingConfig']);
        
        await delay(1000);
        
        updateButton('📝 Đang điền...', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
        
        // 2. Country
        console.log('🌍 Country...');
        const countryInput = findInput(['input[id*="country" i]', 'input[name*="country" i]', '[placeholder*="Country" i]']);
        if (countryInput) {
            await fillInput(countryInput, CONFIG.country);
            await selectOption(CONFIG.country, 2000);
        }
        await delay(500);
        
        // 3. School
        console.log('🏫 School...');
        const schoolInput = findInput(['input[id*="college" i]', 'input[id*="school" i]', 'input[id*="organization" i]', '[placeholder*="search" i]']);
        if (schoolInput) {
            const shortSchool = CONFIG.schoolName.split('(')[0].trim();
            await fillInput(schoolInput, shortSchool);
            
            // Đợi dropdown xuất hiện và danh sách school load xong
            console.log('⏳ Đợi danh sách school load...');
            await delay(2000);
            
            // Đợi cho đến khi có options trong dropdown (tối đa 5 giây)
            let optionsLoaded = false;
            for (let i = 0; i < 25; i++) {
                const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .MuiAutocomplete-option, [data-option-index], ul li');
                if (options.length > 0) {
                    console.log('✅ School options loaded:', options.length);
                    optionsLoaded = true;
                    break;
                }
                await delay(200);
            }
            
            if (!optionsLoaded) {
                console.log('⚠️ School options may not be loaded yet, but continuing...');
            }
            
            // Thêm delay để đảm bảo danh sách đã load hoàn toàn
            await delay(1000);
            
            // Chọn school với waitTime dài hơn
            await selectOption(shortSchool.substring(0, 20), 3000);
            
            // Đợi sau khi chọn để đảm bảo đã chọn xong
            await delay(1000);
        }
        await delay(500);
        
        // 4. First Name
        console.log('👤 First Name...');
        const firstNameInput = findInput(['input[id*="first" i]', 'input[name*="first" i]', '[placeholder*="First" i]']);
        if (firstNameInput) await fillInput(firstNameInput, CONFIG.firstName);
        await delay(300);
        
        // 5. Last Name
        console.log('👤 Last Name...');
        const lastNameInput = findInput(['input[id*="last" i]', 'input[name*="last" i]', '[placeholder*="Last" i]']);
        if (lastNameInput) await fillInput(lastNameInput, CONFIG.lastName);
        await delay(300);
        
        // 6. Month
        console.log('📅 Month...');
        const monthInput = findInput(['input[id*="month" i]', '[placeholder="Month"]']);
        if (monthInput) {
            monthInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(200);
            monthInput.click();
            await delay(500);
            await selectOption(CONFIG.birthMonth, 800);
        }
        await delay(300);
        
        // 7. Day
        console.log('📅 Day...');
        const dayInput = findInput(['input[id*="day" i]', '[placeholder="Day"]']);
        if (dayInput) await fillInput(dayInput, CONFIG.birthDay);
        await delay(300);
        
        // 8. Year
        console.log('📅 Year...');
        const yearInput = findInput(['input[id*="year" i]', '[placeholder="Year"]']);
        if (yearInput) await fillInput(yearInput, CONFIG.birthYear);
        await delay(300);
        
        // 9. Email
        console.log('📧 Email...');
        const emailInput = findInput(['input[id*="email" i]', 'input[type="email"]', '[placeholder*="email" i]']);
        if (emailInput) await fillInput(emailInput, CONFIG.email);
        await delay(500);
        
        console.log('✅ HOÀN THÀNH ĐIỀN FORM!');
        
        // 10. Click Verify
        await delay(1000);
        await clickVerifyButton();
        
        updateButton('✅ Đã gửi!', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        updateButton('❌ Lỗi!', 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)');
    }
}

// Click nút Verify student status
async function clickVerifyButton() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    console.log('🔍 Tìm nút Verify...');
    
    const allBtns = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')];
    let verifyBtn = allBtns.find(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text.includes('verify student') || text.includes('verify my student');
    });
    
    if (!verifyBtn) {
        verifyBtn = allBtns.find(el => (el.innerText || '').toLowerCase().includes('verify'));
    }
    
    if (verifyBtn && !verifyBtn.disabled) {
        verifyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(500);
        verifyBtn.click();
        console.log('✅ Clicked Verify!');
    }
}

// ==================== UPLOAD PAGE HANDLING ====================

// Chuyển Data URL thành File object
function dataUrlToFile(dataUrl, filename) {
    try {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch (e) {
        console.error('❌ Error converting data URL to file:', e);
        return null;
    }
}

// Inject file vào input
function injectFileToInput(input, file) {
    try {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // Dispatch events để trigger React/form handlers
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('✅ File injected successfully');
        return true;
    } catch (e) {
        console.error('❌ Error injecting file:', e);
        return false;
    }
}

// Tìm nút "Add documents"
function findAddDocumentsButton() {
    // Tìm theo selector chính xác từ SheerID
    let addBtn = document.querySelector('button.sid-doc-upload-submit-btn');
    
    // Tìm theo aria-label
    if (!addBtn) {
        addBtn = document.querySelector('button[aria-label="Add documents"]');
    }
    
    // Tìm theo text content
    if (!addBtn) {
        const allBtns = [...document.querySelectorAll('button, [role="button"]')];
        addBtn = allBtns.find(el => {
            const text = (el.innerText || el.textContent || '').toLowerCase().trim();
            return text === 'add documents' || text.includes('add documents');
        });
    }
    
    // Tìm bằng class
    if (!addBtn) {
        addBtn = document.querySelector('[class*="upload-button"], [class*="add-document"], [class*="dropzone"], [class*="doc-upload"]');
    }
    
    // Tìm input file trực tiếp
    if (!addBtn) {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
            console.log('✅ Found file input directly');
            return { type: 'input', element: fileInput };
        }
    }
    
    if (addBtn) {
        console.log('✅ Found Add documents button:', addBtn.className);
    }
    
    return addBtn ? { type: 'button', element: addBtn } : null;
}

// Đợi file input xuất hiện
async function waitForFileInput(maxWait = 5000) {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
            return fileInput;
        }
        await delay(200);
    }
    
    return null;
}

// Tìm và click nút Submit
async function clickSubmitButton() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    console.log('🔍 Tìm nút Submit...');
    
    const allBtns = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')];
    let submitBtn = allBtns.find(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        return text === 'submit' || text.includes('submit');
    });
    
    if (submitBtn && !submitBtn.disabled) {
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(500);
        submitBtn.click();
        console.log('✅ Clicked Submit!');
        return true;
    }
    
    console.log('⚠️ Submit button not found or disabled');
    return false;
}

// Xử lý trang Upload
async function handleUploadPage() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    console.log('📄 Handling Upload Page...');
    updateButton('📤 Đang upload ảnh...', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
    
    try {
        // Lấy ảnh từ storage
        const result = await chrome.storage.local.get(['studentImage', 'lastDownload']);
        
        if (!result.studentImage || !result.studentImage.dataUrl) {
            console.log('⚠️ No image found in storage');
            
            // Kiểm tra xem có file đã download không
            if (result.lastDownload) {
                showNotification('📁 Ảnh đã tải xuống', `File: ${result.lastDownload.fileName}\nVui lòng chọn file từ thư mục Downloads`);
            } else {
                showNotification('⚠️ Không tìm thấy ảnh', 'Vui lòng tạo thông tin sinh viên trước');
            }
            updateButton('🎓 Auto Fill Student', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
            return;
        }
        
        const { dataUrl, fileName, studentName } = result.studentImage;
        console.log('📷 Found image for:', studentName, 'File:', fileName);
        
        // Đợi trang load hoàn tất
        await delay(2000);
        
        // Bước 1: Tìm nút Add documents hoặc file input
        console.log('🔍 Looking for Add documents button...');
        const addDocBtn = findAddDocumentsButton();
        
        if (!addDocBtn) {
            console.log('⚠️ Add documents button not found');
            showNotification('⚠️ Không tìm thấy nút', 'Vui lòng click "Add documents" thủ công');
            return;
        }
        
        let fileInput = null;
        
        if (addDocBtn.type === 'input') {
            // Đã có file input sẵn
            fileInput = addDocBtn.element;
            console.log('✅ Found file input directly');
        } else {
            // Click nút để mở file dialog
            console.log('🖱️ Clicking Add documents button...');
            addDocBtn.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(500);
            
            // Click nút
            addDocBtn.element.click();
            console.log('✅ Clicked Add documents button');
            
            // Đợi file input xuất hiện (có thể là hidden)
            await delay(1000);
            fileInput = await waitForFileInput(5000);
            
            // Nếu không tìm thấy file input, có thể button mở native file dialog
            if (!fileInput) {
                console.log('⚠️ File input not found after clicking button');
                
                // Thông báo user chọn file từ Downloads
                showNotification('📁 Chọn file từ Downloads', `File: ${fileName}\n\nĐã tải ảnh xuống thư mục Downloads.\nVui lòng chọn file này trong dialog.`);
                updateButton('📂 Chọn file...', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
                return;
            }
        }
        
        console.log('📄 File input found:', fileInput.id || fileInput.className);
        
        // Bước 2: Chuyển Data URL thành File
        const file = dataUrlToFile(dataUrl, fileName);
        
        if (!file) {
            console.log('⚠️ Cannot create file from data URL');
            showNotification('⚠️ Lỗi tạo file', 'Không thể tạo file từ ảnh');
            return;
        }
        
        console.log('📄 Created file:', file.name, 'Size:', file.size, 'bytes');
        
        // Bước 3: Inject file vào input
        const injected = injectFileToInput(fileInput, file);
        
        if (!injected) {
            console.log('⚠️ Cannot inject file');
            showNotification('📁 Chọn file thủ công', `File: ${fileName}\nĐã tải xuống thư mục Downloads`);
            return;
        }
        
        updateButton('✅ Đã upload ảnh!', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
        showNotification('✅ Đã chọn ảnh!', `File: ${fileName}`);
        
        // Bước 4: Đợi preview hiển thị rồi click Submit
        console.log('⏳ Waiting for preview...');
        await delay(3000);
        
        // Tìm và click Submit
        const submitted = await clickSubmitButton();
        
        if (submitted) {
            updateButton('✅ Đã gửi!', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
            showNotification('✅ Đã gửi xác minh!', 'Đang chờ kết quả...');
            
            // Clear image từ storage sau khi đã submit
            await chrome.storage.local.remove(['studentImage', 'lastDownload']);
        } else {
            showNotification('⚠️ Chưa tìm thấy nút Submit', 'Vui lòng click Submit thủ công');
        }
        
    } catch (error) {
        console.error('❌ Error handling upload page:', error);
        showNotification('❌ Lỗi!', error.message);
        updateButton('🎓 Auto Fill Student', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    }
}

// Hiển thị thông báo trên trang
function showNotification(title, subtitle) {
    let notif = document.getElementById('ext-notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'ext-notification';
        notif.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999998;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notif);
    }
    
    notif.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 12px; opacity: 0.9;">${subtitle}</div>
    `;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        if (notif) notif.remove();
    }, 5000);
}

// ==================== INITIALIZATION ====================

function init() {
    if (document.readyState === 'complete') {
        initPage();
    } else {
        window.addEventListener('load', initPage);
    }
}

async function initPage() {
    createControlButton();
    
    // Reset upload flag khi trang load mới
    uploadHandled = false;
    
    // Kiểm tra xem có pending form fill không (do trang reload khi đổi ngôn ngữ)
    await checkPendingFormFill();
    
    checkAndHandlePage();
    
    // Theo dõi thay đổi DOM để detect khi trang chuyển trạng thái
    const observer = new MutationObserver(() => {
        checkAndHandlePage();
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: true
    });
}

// Kiểm tra và tiếp tục fill form nếu trang đã reload sau khi đổi ngôn ngữ
async function checkPendingFormFill() {
    try {
        const result = await chrome.storage.local.get(['pendingFormFill', 'pendingConfig']);
        
        if (result.pendingFormFill && result.pendingConfig) {
            console.log('🔄 Found pending form fill after page reload');
            
            // Kiểm tra xem trang đã ở tiếng Anh chưa
            if (isPageInEnglish()) {
                console.log('✅ Page is now in English, continuing form fill...');
                
                // Clear pending flag
                await chrome.storage.local.remove(['pendingFormFill', 'pendingConfig']);
                
                // Đợi trang ổn định
                await new Promise(r => setTimeout(r, 2000));
                
                // Tiếp tục điền form (bỏ qua bước đổi ngôn ngữ)
                await fillFormAfterLanguageChange(result.pendingConfig);
            } else {
                console.log('⚠️ Page still not in English, trying to change language again...');
                
                // Thử đổi ngôn ngữ lại
                const langOK = await ensureEnglishLanguage(2);
                
                if (langOK || isPageInEnglish()) {
                    await chrome.storage.local.remove(['pendingFormFill', 'pendingConfig']);
                    await new Promise(r => setTimeout(r, 2000));
                    await fillFormAfterLanguageChange(result.pendingConfig);
                }
            }
        }
    } catch (e) {
        console.log('⚠️ Error checking pending form fill:', e);
    }
}

// Điền form sau khi đã đổi ngôn ngữ xong
async function fillFormAfterLanguageChange(CONFIG) {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    updateButton('📝 Đang điền...', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
    
    const findInput = (selectors) => {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    };
    
    const fillInput = async (el, value) => {
        if (!el || !value) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(300);
        el.focus();
        await delay(100);
        el.click();
        await delay(100);
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(100);
        
        for (const char of value.toString()) {
            el.value += char;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(40);
        }
        
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        await delay(400);
        console.log('✅ Filled:', value);
        return true;
    };
    
    const selectOption = async (searchText, waitTime = 1500) => {
        await delay(waitTime);
        const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .MuiAutocomplete-option, [data-option-index], ul li');
        
        for (const opt of options) {
            const optText = (opt.innerText || opt.textContent || '').toLowerCase();
            if (optText.includes(searchText.toLowerCase())) {
                opt.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await delay(200);
                opt.click();
                console.log('✅ Selected:', searchText);
                await delay(500);
                return true;
            }
        }
        console.log('⚠️ Option not found:', searchText);
        return false;
    };
    
    try {
        // Country
        console.log('🌍 Country...');
        const countryInput = findInput(['input[id*="country" i]', 'input[name*="country" i]', '[placeholder*="Country" i]']);
        if (countryInput) {
            await fillInput(countryInput, CONFIG.country);
            await selectOption(CONFIG.country, 2000);
        }
        await delay(500);
        
        // School
        console.log('🏫 School...');
        const schoolInput = findInput(['input[id*="college" i]', 'input[id*="school" i]', 'input[id*="organization" i]', '[placeholder*="search" i]']);
        if (schoolInput) {
            const shortSchool = CONFIG.schoolName.split('(')[0].trim();
            await fillInput(schoolInput, shortSchool);
            await delay(2000);
            
            let optionsLoaded = false;
            for (let i = 0; i < 25; i++) {
                const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .MuiAutocomplete-option, [data-option-index], ul li');
                if (options.length > 0) {
                    optionsLoaded = true;
                    break;
                }
                await delay(200);
            }
            await delay(1000);
            await selectOption(shortSchool.substring(0, 20), 3000);
            await delay(1000);
        }
        await delay(500);
        
        // First Name
        console.log('👤 First Name...');
        const firstNameInput = findInput(['input[id*="first" i]', 'input[name*="first" i]', '[placeholder*="First" i]']);
        if (firstNameInput) await fillInput(firstNameInput, CONFIG.firstName);
        await delay(300);
        
        // Last Name
        console.log('👤 Last Name...');
        const lastNameInput = findInput(['input[id*="last" i]', 'input[name*="last" i]', '[placeholder*="Last" i]']);
        if (lastNameInput) await fillInput(lastNameInput, CONFIG.lastName);
        await delay(300);
        
        // Month
        console.log('📅 Month...');
        const monthInput = findInput(['input[id*="month" i]', '[placeholder="Month"]']);
        if (monthInput) {
            monthInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(200);
            monthInput.click();
            await delay(500);
            await selectOption(CONFIG.birthMonth, 800);
        }
        await delay(300);
        
        // Day
        console.log('📅 Day...');
        const dayInput = findInput(['input[id*="day" i]', '[placeholder="Day"]']);
        if (dayInput) await fillInput(dayInput, CONFIG.birthDay);
        await delay(300);
        
        // Year
        console.log('📅 Year...');
        const yearInput = findInput(['input[id*="year" i]', '[placeholder="Year"]']);
        if (yearInput) await fillInput(yearInput, CONFIG.birthYear);
        await delay(300);
        
        // Email
        console.log('📧 Email...');
        const emailInput = findInput(['input[id*="email" i]', 'input[type="email"]', '[placeholder*="email" i]']);
        if (emailInput) await fillInput(emailInput, CONFIG.email);
        await delay(500);
        
        console.log('✅ HOÀN THÀNH ĐIỀN FORM!');
        
        // Click Verify
        await delay(1000);
        await clickVerifyButton();
        
        updateButton('✅ Đã gửi!', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        updateButton('❌ Lỗi!', 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)');
    }
}

// Kiểm tra và xử lý trang
let lastPageState = '';
let uploadHandled = false;

function checkAndHandlePage() {
    const pageState = detectPageState();
    
    // Chỉ xử lý khi state thay đổi
    if (pageState !== lastPageState) {
        console.log('📄 Page state changed:', lastPageState, '→', pageState);
        lastPageState = pageState;
        
        // Xử lý trang UPLOAD
        if (pageState === 'UPLOAD_PAGE' && !uploadHandled) {
            console.log('📤 Detected Upload page!');
            uploadHandled = true;
            
            // Đợi 2 giây để trang ổn định rồi xử lý upload
            setTimeout(() => {
                handleUploadPage();
            }, 2000);
        }
        
        // Xử lý trang SUCCESS
        if (pageState === 'SUCCESS_PAGE') {
            console.log('✅ Detected Success page!');
            updateButton('✅ Thành công!', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
            showNotification('🎉 Xác minh thành công!', 'Bạn đã được xác minh là sinh viên');
            uploadHandled = false; // Reset flag
            
            // Reset sau 5 giây
            setTimeout(() => {
                updateButton('🎓 Auto Fill Student', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
                chrome.runtime.sendMessage({ action: 'PROCESS_COMPLETE' });
            }, 5000);
        }
    }
}

init();
