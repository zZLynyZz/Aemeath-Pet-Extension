// --- 1. KHỞI TẠO ---
const petImg = document.createElement("img");

petImg.style.cssText = `
    position: fixed !important;
    z-index: 999999 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-sizing: border-box !important;
    object-fit: contain !important;
    image-rendering: pixelated !important;
`;

petImg.style.cursor = "grab";
petImg.style.transition = "left 2s linear, top 2s linear"; 
document.body.appendChild(petImg);

// --- 2. CẤU HÌNH BIẾN & ẢNH ---
const idleGifs = [
    chrome.runtime.getURL("gif/cute.gif"),
    chrome.runtime.getURL("gif/hu.gif"),
    chrome.runtime.getURL("gif/jump__2_.gif"),
    chrome.runtime.getURL("gif/nothing.gif")
];
const happyGifs = [
    chrome.runtime.getURL("gif/happy.gif"),
    chrome.runtime.getURL("gif/happy__2_.gif")
];
const flyGif = chrome.runtime.getURL("gif/fly.gif");

let currentState = "idle"; 
let actionTimeout;
let happyInterval; 
let isDragging = false;
let lastIdleIndex = -1; 
let isFlipped = false;
let offsetX = 0;
let offsetY = 0;

let isPetActive = true; 
let isStandMode = false;
let currentSize = 120; // Biến động lưu size hiện tại

// Hàm ép cứng kích thước (Ghi đè CSS của web)
function applySize(size) {
    currentSize = parseInt(size);
    petImg.style.setProperty('width', `${currentSize}px`, 'important');
    petImg.style.setProperty('max-width', `${currentSize}px`, 'important');
    petImg.style.setProperty('min-width', `${currentSize}px`, 'important');
    petImg.style.setProperty('max-height', `${currentSize}px`, 'important');
}

function syncToStorage(x, y, state, src, flip) {
    if (!isPetActive) return; 
    chrome.storage.local.set({
        petData: { x: x, y: y, state: state, src: src, flip: flip }
    });
}

// --- 3. LOGIC ĐỨNG IM & BAY NGẪU NHIÊN ---
function setIdle(broadcast = true) {
    if (isDragging || !isPetActive) return;
    currentState = "idle";
    petImg.style.cursor = "grab";
    
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * idleGifs.length);
    } while (newIndex === lastIdleIndex && idleGifs.length > 1);
    
    lastIdleIndex = newIndex; 
    petImg.src = idleGifs[newIndex];

    if (broadcast) {
        syncToStorage(parseInt(petImg.style.left || 0), parseInt(petImg.style.top || 0), "idle", petImg.src, isFlipped);
    }
}

function moveRandomly(broadcast = true) {
    if (currentState === "happy" || isDragging || !isPetActive || isStandMode) return; 

    currentState = "moving";
    petImg.src = flyGif;

    // Dùng biến currentSize thay cho 120 cứng
    const randomX = Math.floor(Math.random() * (window.innerWidth - currentSize));
    const randomY = Math.floor(Math.random() * (window.innerHeight - currentSize));

    const currentX = parseInt(petImg.style.left || 0);
    if (randomX < currentX) {
        isFlipped = true;
        petImg.style.transform = "scaleX(-1)";
    } else {
        isFlipped = false;
        petImg.style.transform = "scaleX(1)";
    }

    petImg.style.left = `${randomX}px`;
    petImg.style.top = `${randomY}px`;

    if (broadcast) {
        syncToStorage(randomX, randomY, "moving", flyGif, isFlipped);
    }

    clearTimeout(actionTimeout);
    actionTimeout = setTimeout(() => {
        if (currentState === "moving") setIdle(broadcast);
    }, 2000); 
}

// --- 4. LẮNG NGHE LỆNH TỪ POPUP ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "togglePet") {
        isPetActive = request.status;
        if (isPetActive) { petImg.style.display = "block"; setIdle(true); } 
        else { petImg.style.display = "none"; clearTimeout(actionTimeout); clearInterval(happyInterval); }
    }
    
    if (request.action === "summonPet") {
        isPetActive = true;
        petImg.style.display = "block";
        // Căn đúng giữa màn hình
        const centerX = (window.innerWidth - currentSize) / 2;
        const centerY = (window.innerHeight - currentSize) / 2;
        petImg.style.left = `${centerX}px`;
        petImg.style.top = `${centerY}px`;
        setIdle(true);
    }

    if (request.action === "toggleStand") {
        isStandMode = request.status;
    }

    if (request.action === "changeSize") {
        applySize(request.size);
    }
});

// --- 5. VÒNG LẶP TỰ ĐỘNG ---
setInterval(() => {
    if (currentState === "idle" && document.hasFocus() && !isDragging && isPetActive && !document.hidden) {
        if (isStandMode) setIdle(true);
        else Math.random() > 0.3 ? setIdle(true) : moveRandomly(true);
    }
}, 5000);

// --- 6. LOGIC KÉO THẢ ---
let mouseDownTime;

petImg.addEventListener("mousedown", (e) => {
    if (!isPetActive) return; 
    e.preventDefault();
    mouseDownTime = Date.now(); 
    isDragging = true;
    currentState = "happy";
    petImg.style.cursor = "grabbing";
    petImg.style.transition = "none"; 

    const rect = petImg.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    clearInterval(happyInterval);
    let happyIndex = 0;
    petImg.src = happyGifs[happyIndex];
    happyInterval = setInterval(() => {
        happyIndex = 1 - happyIndex;
        petImg.src = happyGifs[happyIndex];
    }, 300);
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging || !isPetActive) return;
    
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    
    const currentX = parseInt(petImg.style.left || 0);
    if (newX < currentX) { isFlipped = true; petImg.style.transform = "scaleX(-1)"; } 
    else if (newX > currentX) { isFlipped = false; petImg.style.transform = "scaleX(1)"; }
    
    // Giới hạn trong màn hình bằng biến currentSize
    newX = Math.max(0, Math.min(newX, window.innerWidth - currentSize));
    newY = Math.max(0, Math.min(newY, window.innerHeight - currentSize));

    petImg.style.left = `${newX}px`;
    petImg.style.top = `${newY}px`;
});

window.addEventListener("mouseup", () => {
    if (isDragging) {
        const clickDuration = Date.now() - mouseDownTime; 
        isDragging = false;
        petImg.style.transition = "left 2s linear, top 2s linear"; 

        if (clickDuration < 200) {
            currentState = "happy";
            clearTimeout(actionTimeout);
            actionTimeout = setTimeout(() => { clearInterval(happyInterval); setIdle(true); }, 3000);
        } else {
            clearInterval(happyInterval); setIdle(true); 
        }
    }
});

// --- 7. ĐỒNG BỘ ĐA TAB ---
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isPetActive) {
        isPetActive = changes.isPetActive.newValue;
        petImg.style.display = isPetActive ? "block" : "none";
    }
    if (changes.isStandMode) isStandMode = changes.isStandMode.newValue;
    if (changes.petSize) applySize(changes.petSize.newValue); // Đồng bộ size giữa các tab

    if (changes.petData && !isDragging && !document.hasFocus() && isPetActive) {
        const data = changes.petData.newValue;
        clearTimeout(actionTimeout); 
        petImg.style.left = `${data.x}px`;
        petImg.style.top = `${data.y}px`;
        petImg.src = data.src;
        currentState = data.state;
        isFlipped = data.flip || false;
        petImg.style.transform = isFlipped ? "scaleX(-1)" : "scaleX(1)";
    }
});

// Khởi tạo
chrome.storage.local.get(["petData", "isPetActive", "isStandMode", "petSize"], (result) => {
    isPetActive = result.isPetActive !== false; 
    isStandMode = result.isStandMode || false;
    petImg.style.display = isPetActive ? "block" : "none";

    // Set size
    const startSize = result.petSize || 120;
    applySize(startSize);

    if (result.petData) {
        petImg.style.left = `${result.petData.x}px`;
        petImg.style.top = `${result.petData.y}px`;
        petImg.src = result.petData.src || idleGifs[0];
        currentState = result.petData.state || "idle";
        isFlipped = result.petData.flip || false;
        petImg.style.transform = isFlipped ? "scaleX(-1)" : "scaleX(1)";
    } else {
        // Lần đầu mở: Nằm giữa màn hình
        const startX = (window.innerWidth - startSize) / 2;
        const startY = (window.innerHeight - startSize) / 2;
        petImg.style.left = `${startX}px`;
        petImg.style.top = `${startY}px`;
        setIdle(true);
    }
});