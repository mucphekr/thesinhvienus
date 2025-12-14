// Background Service Worker - Điều phối giữa các tab

let sessionData = {
    sheeridTabId: null,
    sheeridUrl: null,
    generatorTabId: null,
    autofillScript: null,
    status: 'idle',
    waitingToFill: false,
    startedFromPopup: false,
    selectedUniversity: 'cornell',
    hasStudentImage: false,  // Track if we have an image ready for upload
    generatorMessageSent: false  // Prevent duplicate GENERATE_AND_COPY messages
};

// Lắng nghe message từ content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Background received:', message.action);
    
    switch (message.action) {
        case 'START_FROM_POPUP':
            // Bắt đầu từ popup với URL được cung cấp
            startFromPopup(message.url, message.university);
            sendResponse({ success: true });
            break;
            
        case 'START_PROCESS':
            startProcess(message.url, sender.tab.id);
            sendResponse({ success: true });
            break;
            
        case 'SCRIPT_READY':
            sessionData.autofillScript = message.script;
            sessionData.hasStudentImage = message.hasImage || false;
            sessionData.status = 'ready';
            console.log('✅ Script received, length:', message.script.length, 'Has image:', sessionData.hasStudentImage);
            returnToSheerID();
            sendResponse({ success: true });
            break;
            
        case 'GET_SCRIPT':
            sendResponse({ 
                script: sessionData.autofillScript,
                status: sessionData.status 
            });
            break;
            
        case 'PROCESS_COMPLETE':
            sessionData.status = 'idle';
            sessionData.autofillScript = null;
            sessionData.hasStudentImage = false;
            console.log('🎉 Process completed!');
            sendResponse({ success: true });
            break;
            
        case 'DOWNLOAD_IMAGE':
            // Download ảnh xuống thư mục Downloads
            downloadStudentImage(message.dataUrl, message.fileName);
            sendResponse({ success: true });
            break;
            
        case 'GET_DOWNLOADED_FILE':
            // Lấy file đã download gần nhất
            getRecentDownload().then(file => {
                sendResponse({ file: file });
            });
            return true; // Keep channel open for async response
    }
    
    return true;
});

// URL của generator - ưu tiên localhost, fallback sang online
const GENERATOR_URL_LOCAL = 'http://localhost:3000/';
const GENERATOR_URL_ONLINE = 'https://nguyenbaviet.io.vn/';

// Kiểm tra localhost có hoạt động không
async function checkLocalhost() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(GENERATOR_URL_LOCAL, { 
            method: 'HEAD',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (e) {
        return false;
    }
}

// Bắt đầu quy trình từ popup (với URL được dán vào)
async function startFromPopup(sheeridUrl, university = 'cornell') {
    console.log('🚀 Starting from popup with URL:', sheeridUrl, 'University:', university);
    
    sessionData.status = 'generating';
    sessionData.sheeridUrl = sheeridUrl;
    sessionData.startedFromPopup = true;
    sessionData.selectedUniversity = university;
    sessionData.generatorMessageSent = false; // Reset flag for new process
    
    // Kiểm tra localhost trước
    const useLocal = await checkLocalhost();
    const generatorUrl = useLocal ? GENERATOR_URL_LOCAL : GENERATOR_URL_ONLINE;
    
    console.log('📂 Using generator:', useLocal ? 'LOCALHOST' : 'ONLINE');
    
    // Mở trang generator
    console.log('📂 Step 1: Opening generator page...');
    const newTab = await chrome.tabs.create({
        url: generatorUrl,
        active: true
    });
    
    sessionData.generatorTabId = newTab.id;
    console.log('📂 Opened generator tab:', newTab.id);
}

// Bắt đầu quy trình tạo thông tin
async function startProcess(sheeridUrl, tabId) {
    console.log('🚀 Starting process for:', sheeridUrl);
    
    sessionData.sheeridTabId = tabId;
    sessionData.sheeridUrl = sheeridUrl;
    sessionData.status = 'generating';
    sessionData.generatorMessageSent = false; // Reset flag for new process
    
    // Kiểm tra localhost trước
    const useLocal = await checkLocalhost();
    const generatorUrl = useLocal ? GENERATOR_URL_LOCAL : GENERATOR_URL_ONLINE;
    
    console.log('📂 Using generator:', useLocal ? 'LOCALHOST' : 'ONLINE');
    
    // Mở trang generator
    console.log('📂 Step 1: Opening generator page...');
    const newTab = await chrome.tabs.create({
        url: generatorUrl,
        active: true
    });
    
    sessionData.generatorTabId = newTab.id;
    console.log('📂 Opened generator tab:', newTab.id);
}

// Quay lại trang SheerID
async function returnToSheerID() {
    console.log('🔙 Returning to SheerID');
    
    if (sessionData.generatorTabId) {
        try {
            await chrome.tabs.remove(sessionData.generatorTabId);
            console.log('❌ Closed generator tab');
        } catch (e) {
            console.log('Tab already closed');
        }
        sessionData.generatorTabId = null;
    }
    
    // Nếu bắt đầu từ popup (chưa có tab SheerID), mở trang mới
    if (sessionData.startedFromPopup && sessionData.sheeridUrl) {
        console.log('📄 Opening SheerID page from popup URL...');
        const sheeridTab = await chrome.tabs.create({
            url: sessionData.sheeridUrl,
            active: true
        });
        sessionData.sheeridTabId = sheeridTab.id;
        sessionData.waitingToFill = true;
        sessionData.startedFromPopup = false;
        console.log('📄 SheerID tab opened:', sheeridTab.id);
        return;
    }
    
    // Nếu đã có tab SheerID, quay lại và refresh
    if (sessionData.sheeridTabId) {
        try {
            // Chuyển về tab SheerID
            await chrome.tabs.update(sessionData.sheeridTabId, { active: true });
            console.log('🔄 Refreshing SheerID page...');
            
            // Refresh trang
            await chrome.tabs.reload(sessionData.sheeridTabId);
            
            // Đánh dấu đang chờ refresh xong để điền form
            sessionData.waitingToFill = true;
            
        } catch (e) {
            console.error('Error returning to SheerID:', e);
        }
    }
}

// Lắng nghe khi tab được cập nhật
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Generator tab loaded - chỉ gửi message 1 lần
    if (tabId === sessionData.generatorTabId && changeInfo.status === 'complete' && !sessionData.generatorMessageSent) {
        console.log('📄 Generator page loaded');
        sessionData.generatorMessageSent = true; // Đánh dấu đã gửi, ngăn duplicate
        
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { 
                action: 'GENERATE_AND_COPY',
                university: sessionData.selectedUniversity
            })
                .catch(e => console.log('Message error:', e));
        }, 2500);
    }
    
    // SheerID tab loaded và sẵn sàng điền form
    if (tabId === sessionData.sheeridTabId && changeInfo.status === 'complete' && sessionData.waitingToFill) {
        console.log('🔄 SheerID page loaded, ready to fill form');
        sessionData.waitingToFill = false;
        
        // Đợi 4 giây sau khi trang load xong để đảm bảo trang render đầy đủ
        setTimeout(async () => {
            try {
                await chrome.tabs.sendMessage(sessionData.sheeridTabId, {
                    action: 'FILL_FORM',
                    script: sessionData.autofillScript
                });
                console.log('📝 Sent FILL_FORM message');
            } catch (e) {
                console.error('Error sending message:', e);
            }
        }, 4000);
    }
});

// Download ảnh sinh viên xuống thư mục Downloads
async function downloadStudentImage(dataUrl, fileName) {
    try {
        console.log('📥 Downloading image:', fileName);
        
        const downloadId = await chrome.downloads.download({
            url: dataUrl,
            filename: fileName,
            saveAs: false // Tự động lưu, không hỏi
        });
        
        // Lưu thông tin download để sau này tìm lại
        sessionData.lastDownloadId = downloadId;
        sessionData.lastDownloadFileName = fileName;
        
        console.log('✅ Download started, ID:', downloadId);
        
        // Lưu vào storage
        await chrome.storage.local.set({
            lastDownload: {
                id: downloadId,
                fileName: fileName,
                timestamp: Date.now()
            }
        });
        
    } catch (e) {
        console.error('❌ Download error:', e);
    }
}

// Lắng nghe khi download hoàn tất
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.id === sessionData.lastDownloadId && delta.state) {
        if (delta.state.current === 'complete') {
            console.log('✅ Download completed:', sessionData.lastDownloadFileName);
            
            // Cập nhật storage với trạng thái hoàn tất
            chrome.storage.local.get(['lastDownload'], (result) => {
                if (result.lastDownload) {
                    result.lastDownload.completed = true;
                    chrome.storage.local.set({ lastDownload: result.lastDownload });
                }
            });
        } else if (delta.state.current === 'interrupted') {
            console.log('❌ Download interrupted');
        }
    }
});

// Lấy file đã download gần nhất
async function getRecentDownload() {
    try {
        // Tìm download gần nhất (trong 5 phút)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        const downloads = await chrome.downloads.search({
            orderBy: ['-startTime'],
            limit: 10,
            startedAfter: new Date(fiveMinutesAgo).toISOString()
        });
        
        // Tìm file ảnh StudentID
        const studentIdDownload = downloads.find(d => 
            d.filename && 
            (d.filename.includes('StudentID') || d.filename.includes('student')) &&
            (d.filename.endsWith('.jpg') || d.filename.endsWith('.png') || d.filename.endsWith('.jpeg'))
        );
        
        if (studentIdDownload) {
            console.log('✅ Found recent download:', studentIdDownload.filename);
            return {
                path: studentIdDownload.filename,
                url: studentIdDownload.url,
                id: studentIdDownload.id
            };
        }
        
        console.log('⚠️ No recent StudentID download found');
        return null;
        
    } catch (e) {
        console.error('❌ Error getting recent download:', e);
        return null;
    }
}

console.log('🔧 SheerID Auto Fill Extension loaded');
