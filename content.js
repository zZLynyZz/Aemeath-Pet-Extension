// --- 1. KHỞI TẠO ---
const petImg = document.createElement("img");

// Mặc giáp CSS: Dùng !important để chống lại CSS của trang web "chủ nhà"
petImg.style.cssText = `
    position: fixed !important;
    z-index: 999999 !important;
    width: 120px !important;
    max-width: 120px !important;
    min-width: 120px !important;
    height: auto !important; 
    max-height: 120px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-sizing: border-box !important;
    object-fit: contain !important;
`;

// Các thuộc tính thay đổi liên tục thì khai báo bình thường để JS dễ ghi đè
petImg.style.cursor = "grab";
petImg.style.transition = "left 2s linear, top 2s linear"; 
document.body.appendChild(petImg);

// --- 2. CẤU HÌNH ĐƯỜNG DẪN ẢNH ---
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

// --- 3. QUẢN LÝ TRẠNG THÁI VÀ TỌA ĐỘ ---
let currentState = "idle"; 
let actionTimeout;
let happyInterval; 
let isDragging = false;
let lastIdleIndex = -1; 
let isFlipped = false; // false = hướng phải (mặc định), true = hướng trái

let offsetX = 0;
let offsetY = 0;

// Hàm lưu trạng thái lên storage để đồng bộ tab khác
function syncToStorage(x, y, state, src, flip) {
    chrome.storage.local.set({
        petData: { x: x, y: y, state: state, src: src, flip: flip }
    });
}

// --- 4. LOGIC ĐỨNG IM & BAY NGẪU NHIÊN ---
function setIdle(broadcast = true) {
    if (isDragging) return;
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
    if (currentState === "happy" || isDragging) return; 

    currentState = "moving";
    petImg.src = flyGif;

    const randomX = Math.floor(Math.random() * (window.innerWidth - 120));
    const randomY = Math.floor(Math.random() * (window.innerHeight - 120));

    // Logic lật mặt khi bay
    const currentX = parseInt(petImg.style.left || 0);
    if (randomX < currentX) {
        isFlipped = true; // Bay sang trái -> Lật
        petImg.style.transform = "scaleX(-1)";
    } else {
        isFlipped = false; // Bay sang phải -> Bình thường
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

// Vòng lặp tự động: Chỉ tab đang được focus mới làm "Não Bộ" phát lệnh
setInterval(() => {
    if (currentState === "idle" && document.hasFocus() && !isDragging) {
        Math.random() > 0.3 ? setIdle(true) : moveRandomly(true);
    }
}, 5000);


// --- 5. LOGIC CLICK & KÉO THẢ (DRAG & DROP) ---
let mouseDownTime;

petImg.addEventListener("mousedown", (e) => {
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
    if (!isDragging) return;
    
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    
    // Logic lật mặt khi cầm kéo đi
    const currentX = parseInt(petImg.style.left || 0);
    if (newX < currentX) {
        isFlipped = true;
        petImg.style.transform = "scaleX(-1)";
    } else if (newX > currentX) {
        isFlipped = false;
        petImg.style.transform = "scaleX(1)";
    }
    
    newX = Math.max(0, Math.min(newX, window.innerWidth - 120));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 120));

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
            actionTimeout = setTimeout(() => {
                clearInterval(happyInterval);
                setIdle(true); 
            }, 3000);
        } else {
            clearInterval(happyInterval);
            setIdle(true); 
        }
    }
});


// --- 6. LOGIC ĐỒNG BỘ GIỮA CÁC TAB ---
chrome.storage.onChanged.addListener((changes) => {
    if (changes.petData && !isDragging && !document.hasFocus()) {
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

// Khi vừa mở tab mới
chrome.storage.local.get(["petData"], (result) => {
    if (result.petData) {
        petImg.style.left = `${result.petData.x}px`;
        petImg.style.top = `${result.petData.y}px`;
        petImg.src = result.petData.src || idleGifs[0];
        currentState = result.petData.state || "idle";
        
        isFlipped = result.petData.flip || false;
        petImg.style.transform = isFlipped ? "scaleX(-1)" : "scaleX(1)";
    } else {
        petImg.style.left = "0px";
        petImg.style.top = `${window.innerHeight - 120}px`;
        setIdle(true);
    }
});