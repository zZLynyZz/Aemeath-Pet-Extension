document.addEventListener('DOMContentLoaded', () => {
    const btnOff = document.getElementById('btnOff');
    const btnSummon = document.getElementById('btnSummon');
    const btnOn = document.getElementById('btnOn');
    const btnStand = document.getElementById('btnStand');
    const btnDance = document.getElementById('btnDance'); 
    const btnBreak = document.getElementById('btnBreak'); // Gọi nút Break
    const controlsOn = document.getElementById('controlsOn');
    
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    const countSlider = document.getElementById('countSlider');
    const countValue = document.getElementById('countValue');

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

    btnSummon.addEventListener('click', () => { sendMessageToContent({ action: "summonPet" }); window.close(); });
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
});