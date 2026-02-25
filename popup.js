document.addEventListener('DOMContentLoaded', () => {
    const btnOff = document.getElementById('btnOff');
    const btnSummon = document.getElementById('btnSummon');
    const btnOn = document.getElementById('btnOn');
    const btnStand = document.getElementById('btnStand');
    const controlsOn = document.getElementById('controlsOn');
    
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');

    // Lấy trạng thái từ storage lúc vừa mở popup
    chrome.storage.local.get(['isPetActive', 'isStandMode', 'petSize'], (result) => {
        const isActive = result.isPetActive !== false; 
        const isStand = result.isStandMode === true; 
        const currentSize = result.petSize || 120; // Size mặc định 120
        
        updateUI(isActive);
        updateStandUI(isStand);
        
        // Cập nhật thanh trượt
        sizeSlider.value = currentSize;
        sizeValue.innerText = currentSize;
    });

    function updateUI(isActive) {
        if (isActive) {
            controlsOn.style.display = 'block';
            btnOn.style.display = 'none';
        } else {
            controlsOn.style.display = 'none';
            btnOn.style.display = 'block';
        }
    }

    function updateStandUI(isStand) {
        if (isStand) {
            btnStand.innerText = "Stand Mode: ON";
            btnStand.style.backgroundColor = "#d68910"; 
        } else {
            btnStand.innerText = "Stand Mode: OFF";
            btnStand.style.backgroundColor = "#f39c12"; 
        }
    }

    // --- LOGIC THANH TRƯỢT SIZE ---
    sizeSlider.addEventListener('input', (e) => {
        const newSize = e.target.value;
        sizeValue.innerText = newSize; // Đổi số trên giao diện
        chrome.storage.local.set({ petSize: newSize }); // Lưu vào bộ nhớ
        sendMessageToContent({ action: "changeSize", size: newSize }); // Ép pet đổi size ngay lập tức
    });

    // Các nút bấm cơ bản
    btnOff.addEventListener('click', () => {
        chrome.storage.local.set({ isPetActive: false });
        updateUI(false);
        sendMessageToContent({ action: "togglePet", status: false });
    });

    btnOn.addEventListener('click', () => {
        chrome.storage.local.set({ isPetActive: true });
        updateUI(true);
        sendMessageToContent({ action: "togglePet", status: true });
    });

    // NÚT TRIỆU HỒI
    btnSummon.addEventListener('click', () => {
        sendMessageToContent({ action: "summonPet" });
        window.close(); // Gọi xong thì tự đóng popup
    });

    btnStand.addEventListener('click', () => {
        chrome.storage.local.get(['isStandMode'], (result) => {
            const newState = !result.isStandMode;
            chrome.storage.local.set({ isStandMode: newState });
            updateStandUI(newState);
            sendMessageToContent({ action: "toggleStand", status: newState });
        });
    });

    function sendMessageToContent(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }
});