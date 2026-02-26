document.addEventListener('DOMContentLoaded', () => {
    const btnOff = document.getElementById('btnOff');
    const btnOn = document.getElementById('btnOn');
    const btnStand = document.getElementById('btnStand');
    const btnDance = document.getElementById('btnDance'); 
    const btnBreak = document.getElementById('btnBreak'); 
    const controlsOn = document.getElementById('controlsOn');
    
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    const countSlider = document.getElementById('countSlider');
    const countValue = document.getElementById('countValue');

    const btnSummonDropdown = document.getElementById('btnSummonDropdown');
    const summonOptions = document.getElementById('summonOptions');
    const modeNames = ["1 Line", "2 Lines", "3 Lines", "A Shape", "Heart Shape"];

    chrome.storage.local.get(['isPetActive', 'isStandMode', 'petSize', 'petCount'], (result) => {
        const isActive = result.isPetActive !== false; 
        const isStand = result.isStandMode === true; 
        const currentSize = result.petSize || 120; 
        const currentCount = result.petCount || 1; 
        
        updateUI(isActive);
        updateStandUI(isStand);
        
        sizeSlider.value = currentSize;
        sizeValue.innerText = currentSize;
        countSlider.value = currentCount;
        countValue.innerText = currentCount;
    });

    function updateUI(isActive) {
        if (isActive) { controlsOn.style.display = 'block'; btnOn.style.display = 'none'; } 
        else { controlsOn.style.display = 'none'; btnOn.style.display = 'block'; }
    }

    function updateStandUI(isStand) {
        if (isStand) { btnStand.innerText = "Stand Mode: ON"; btnStand.style.backgroundColor = "#d68910"; } 
        else { btnStand.innerText = "Stand Mode: OFF"; btnStand.style.backgroundColor = "#f39c12"; }
    }

    sizeSlider.addEventListener('input', (e) => {
        const newSize = e.target.value;
        sizeValue.innerText = newSize; 
        chrome.storage.local.set({ petSize: newSize }); 
        sendMessageToContent({ action: "changeSize", size: newSize }); 
    });

    countSlider.addEventListener('input', (e) => {
        const newCount = parseInt(e.target.value);
        countValue.innerText = newCount; 
        chrome.storage.local.set({ petCount: newCount }); 
        sendMessageToContent({ action: "changeCount", count: newCount }); 
    });

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

    btnDance.addEventListener('click', () => { sendMessageToContent({ action: "dancePet" }); });
    
    // --- GỬI LỆNH BREAK ---
    btnBreak.addEventListener('click', () => { sendMessageToContent({ action: "breakPet" }); });

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
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, message);
        });
    }

    // --- LOGIC XỔ MENU VÀ CHỌN ĐỘI HÌNH ---
    // Cập nhật tên nút lúc vừa mở popup (đọc từ ổ cứng)
    chrome.storage.local.get(['formationMode'], (result) => {
        const currentFormation = result.formationMode || 0;
        if(btnSummonDropdown) btnSummonDropdown.innerText = `Formation: ${modeNames[currentFormation]} ▾`;
    });

    // Bấm nút thì xổ menu ra
    btnSummonDropdown.addEventListener('click', () => {
        summonOptions.classList.toggle('show');
    });

    // Bấm ra ngoài thì tự cụp menu lại
    window.addEventListener('click', (event) => {
        if (!event.target.matches('.dropbtn')) {
            if (summonOptions.classList.contains('show')) {
                summonOptions.classList.remove('show');
            }
        }
    });

    // Bấm chọn Mode
    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedMode = parseInt(item.getAttribute('data-mode'));
            
            // 1. Đổi tên nút hiển thị ngay lập tức
            btnSummonDropdown.innerText = `Formation: ${modeNames[selectedMode]} ▾`;
            
            // 2. Lưu vào trí nhớ Chrome
            chrome.storage.local.set({ formationMode: selectedMode });
            
            // 3. Đóng menu lại và gửi lệnh sang content.js để pet bay
            summonOptions.classList.remove('show');
            sendMessageToContent({ action: "summonPet", formation: selectedMode });
        });
    });
});