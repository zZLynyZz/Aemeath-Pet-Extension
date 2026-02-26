// --- 1. CẤU HÌNH & BIẾN TOÀN CỤC ---
const idleGifs = [
    chrome.runtime.getURL("gif/cute.gif"),
    chrome.runtime.getURL("gif/hu.gif"),
    chrome.runtime.getURL("gif/jump.gif"), 
    chrome.runtime.getURL("gif/nothing.gif")
];
const happyGifs = [
    chrome.runtime.getURL("gif/happy.gif"),
    chrome.runtime.getURL("gif/happy__2_.gif")
];
const flyGif = chrome.runtime.getURL("gif/fly.gif");
const jumpGif = chrome.runtime.getURL("gif/jump.gif"); 
const nothingGif = chrome.runtime.getURL("gif/nothing.gif");
const sealGif = chrome.runtime.getURL("gif/cute.gif"); // Nạp hải cẩu

let isPetActive = true; 
let isStandMode = false;
let currentSize = 120;
let currentCount = 1;

let petsArray = []; 
let globalPetsData = []; 
let currentFormationIndex = 0; 
let lastSavedDataString = ""; 
let globalSummonTimeout = null; 

function saveGlobalPetsData() {
    if (!isPetActive) return;
    lastSavedDataString = JSON.stringify(globalPetsData); 
    chrome.storage.local.set({ petsData: globalPetsData });
}

// --- 2. BẢN VẼ (CLASS) CỦA PET ---
class Pet {
    constructor(id, initialData = null) {
        this.id = id;
        this.currentState = "idle";
        this.isDragging = false;
        this.isFlipped = false;
        this.lastIdleIndex = -1;
        
        this.actionTimeout = null;
        this.happyInterval = null;
        this.danceInterval = null; // Thêm bộ đếm nhịp nhảy
        this.loopInterval = null;
        
        this.offsetX = 0;
        this.offsetY = 0;

        this.img = document.createElement("img");
        this.img.style.cssText = `
            position: fixed !important;
            z-index: ${999999 - id} !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-sizing: border-box !important;
            object-fit: contain !important;
            image-rendering: pixelated !important; 
        `;
        this.img.style.cursor = "grab";
        this.img.style.transition = "left 2s ease-in-out, top 2s ease-in-out"; 
        this.img.style.display = isPetActive ? "block" : "none";
        
        document.body.appendChild(this.img);
        this.applySize(currentSize);

        if (initialData) {
            this.img.style.left = `${initialData.x}px`;
            this.img.style.top = `${initialData.y}px`;
            this.img.src = initialData.src || idleGifs[0];
            this.currentState = initialData.state || "idle";
            this.isFlipped = initialData.flip || false;
            this.img.style.transform = this.isFlipped ? "scaleX(-1)" : "scaleX(1)";
            this.applyFailsafeTimeout();
        } else {
            const startX = (window.innerWidth - currentSize) / 2 + (Math.random() * 100 - 50);
            const startY = (window.innerHeight - currentSize) / 2 + (Math.random() * 100 - 50);
            this.img.style.left = `${startX}px`;
            this.img.style.top = `${startY}px`;
            this.setIdle(true);
        }

        this.setupEvents();
        this.startLoop();
    }

    applySize(size) {
        this.img.style.setProperty('width', `${size}px`, 'important');
        this.img.style.setProperty('max-width', `${size}px`, 'important');
        this.img.style.setProperty('min-width', `${size}px`, 'important');
        this.img.style.setProperty('max-height', `${size}px`, 'important');
    }

    updateDataToGlobal(broadcast = true) {
        globalPetsData[this.id] = {
            x: parseInt(this.img.style.left || 0),
            y: parseInt(this.img.style.top || 0),
            state: this.currentState,
            src: this.img.src,
            flip: this.isFlipped
        };
        if (broadcast) saveGlobalPetsData();
    }

    applyFailsafeTimeout() {
        clearTimeout(this.actionTimeout);
        if (this.currentState === "dancing") {
            this.actionTimeout = setTimeout(() => { this.setIdle(true); }, 15000); // Concert kéo dài 15s nếu không ai Break
        } else if (this.currentState === "summoning") {
            this.actionTimeout = setTimeout(() => { this.freezeForSummon(true); }, 3000);
        } else if (this.currentState === "frozen") {
            this.actionTimeout = setTimeout(() => { this.setIdle(true); }, 11000);
        } else if (this.currentState === "moving") {
            this.actionTimeout = setTimeout(() => { this.setIdle(true); }, 3000);
        }
    }

    setIdle(broadcast = true) {
        if (this.isDragging || !isPetActive) return;
        this.currentState = "idle";
        this.img.style.cursor = "grab";
        clearInterval(this.danceInterval); // Dọn dẹp nhịp nhảy cũ
        
        let newIndex;
        do { newIndex = Math.floor(Math.random() * idleGifs.length); } while (newIndex === this.lastIdleIndex && idleGifs.length > 1);
        
        this.lastIdleIndex = newIndex; 
        this.img.src = idleGifs[newIndex];
        this.updateDataToGlobal(broadcast);
    }

    // --- HÀM THỰC THI VŨ ĐẠO (ĐỌC TỪ CONCERT.JS) ---
    executeDanceMove(moveCode, broadcast = true) {
        if (this.isDragging || !isPetActive) return; 
        this.currentState = "dancing"; 
        clearInterval(this.danceInterval);

        switch (moveCode) {
            case DANCE_MOVES.JUMP:
                this.isFlipped = false;
                this.img.style.transform = "scaleX(1)";
                this.img.src = jumpGif;
                break;
            case DANCE_MOVES.ONE_HAND:
            case DANCE_MOVES.ONE_HAND_FLIP:
                this.isFlipped = (moveCode === DANCE_MOVES.ONE_HAND_FLIP);
                this.img.style.transform = this.isFlipped ? "scaleX(-1)" : "scaleX(1)";
                
                let hIndex = 0;
                this.img.src = happyGifs[hIndex];
                // Đổi tư thế mỗi 400ms tạo cảm giác vung tay theo nhạc
                this.danceInterval = setInterval(() => {
                    hIndex = 1 - hIndex;
                    this.img.src = happyGifs[hIndex];
                }, 400); 
                break;
            case DANCE_MOVES.SEAL:
            case DANCE_MOVES.SEAL_FLIP:
                this.isFlipped = (moveCode === DANCE_MOVES.SEAL_FLIP);
                this.img.style.transform = this.isFlipped ? "scaleX(-1)" : "scaleX(1)";
                this.img.src = sealGif;
                break;
        }

        this.updateDataToGlobal(broadcast);
        this.applyFailsafeTimeout();
    }

    freezeForSummon(broadcast = true) {
        if (this.isDragging || !isPetActive) return;
        this.currentState = "frozen"; 
        this.img.src = nothingGif; 
        clearInterval(this.danceInterval);
        this.updateDataToGlobal(broadcast);
        this.applyFailsafeTimeout();
    }

    moveRandomly(broadcast = true) {
        if (this.currentState === "happy" || this.currentState === "dancing" || this.currentState === "frozen" || this.currentState === "summoning" || this.isDragging || !isPetActive || isStandMode) return; 
        this.currentState = "moving";
        this.img.src = flyGif;

        const randomX = Math.floor(Math.random() * (window.innerWidth - currentSize));
        const randomY = Math.floor(Math.random() * (window.innerHeight - currentSize));
        const currentX = parseInt(this.img.style.left || 0);
        
        if (randomX < currentX) { this.isFlipped = true; this.img.style.transform = "scaleX(-1)"; } 
        else { this.isFlipped = false; this.img.style.transform = "scaleX(1)"; }

        this.img.style.left = `${randomX}px`;
        this.img.style.top = `${randomY}px`;
        this.updateDataToGlobal(broadcast);
        this.applyFailsafeTimeout();
    }

    startLoop() {
        const delay = 4000 + Math.random() * 2000; 
        this.loopInterval = setInterval(() => {
            if (this.currentState === "idle" && document.hasFocus() && !this.isDragging && isPetActive && !document.hidden) {
                if (isStandMode) this.setIdle(true);
                else Math.random() > 0.3 ? this.setIdle(true) : this.moveRandomly(true);
            }
        }, delay);
    }

    setupEvents() {
        this.handleMouseMove = (e) => {
            if (!this.isDragging || !isPetActive) return;
            let newX = e.clientX - this.offsetX;
            let newY = e.clientY - this.offsetY;
            const currentX = parseInt(this.img.style.left || 0);
            if (newX < currentX) { this.isFlipped = true; this.img.style.transform = "scaleX(-1)"; } 
            else if (newX > currentX) { this.isFlipped = false; this.img.style.transform = "scaleX(1)"; }
            newX = Math.max(0, Math.min(newX, window.innerWidth - currentSize));
            newY = Math.max(0, Math.min(newY, window.innerHeight - currentSize));
            this.img.style.left = `${newX}px`;
            this.img.style.top = `${newY}px`;
        };

        this.handleMouseUp = () => {
            if (this.isDragging) {
                const clickDuration = Date.now() - this.mouseDownTime; 
                this.isDragging = false;
                this.img.style.transition = "left 2s ease-in-out, top 2s ease-in-out"; 

                window.removeEventListener("mousemove", this.handleMouseMove);
                window.removeEventListener("mouseup", this.handleMouseUp);

                if (clickDuration < 200) {
                    this.currentState = "happy";
                    clearTimeout(this.actionTimeout);
                    this.actionTimeout = setTimeout(() => { clearInterval(this.happyInterval); this.setIdle(true); }, 3000);
                } else {
                    clearInterval(this.happyInterval); this.setIdle(true); 
                }
            }
        };

        this.img.addEventListener("mousedown", (e) => {
            if (!isPetActive) return; 
            e.preventDefault();
            this.mouseDownTime = Date.now(); 
            this.isDragging = true;
            this.currentState = "happy";
            this.img.style.cursor = "grabbing";
            this.img.style.transition = "none"; 
            clearInterval(this.danceInterval); // Ngừng múa khi bị túm cổ

            const rect = this.img.getBoundingClientRect();
            this.offsetX = e.clientX - rect.left;
            this.offsetY = e.clientY - rect.top;

            clearInterval(this.happyInterval);
            let happyIndex = 0;
            this.img.src = happyGifs[happyIndex];
            this.happyInterval = setInterval(() => {
                happyIndex = 1 - happyIndex;
                this.img.src = happyGifs[happyIndex];
            }, 300);

            window.addEventListener("mousemove", this.handleMouseMove);
            window.addEventListener("mouseup", this.handleMouseUp);
        });
    }

    destroy() {
        this.img.remove();
        clearInterval(this.loopInterval);
        clearInterval(this.happyInterval);
        clearInterval(this.danceInterval);
        clearTimeout(this.actionTimeout);
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseup", this.handleMouseUp);
    }
}

// --- 3. ĐIỀU CHỈNH SỐ LƯỢNG PET ---
function adjustPetCount(newCount, initialDataArray = []) {
    currentCount = newCount;
    while (petsArray.length > currentCount) { let deadPet = petsArray.pop(); globalPetsData.pop(); deadPet.destroy(); }
    while (petsArray.length < currentCount) { let id = petsArray.length; let newPet = new Pet(id, initialDataArray[id] || null); petsArray.push(newPet); }
    saveGlobalPetsData(); 
}

// --- 4. LẮNG NGHE LỆNH TỪ POPUP ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "togglePet") {
        isPetActive = request.status;
        petsArray.forEach(pet => { pet.img.style.display = isPetActive ? "block" : "none"; if (isPetActive) pet.setIdle(true); });
    }
    
    // --- GỌI ĐẠO DIỄN XẾP HÀNG ---
    if (request.action === "summonPet") {
        isPetActive = true;
        clearTimeout(globalSummonTimeout); 

        let N = petsArray.length;
        let gap = currentSize * 0.9; 
        
        // Gọi hàm từ file concert.js cực gọn
        let positions = getFormationPositions(currentFormationIndex, N, gap);

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        petsArray.forEach((pet, index) => {
            pet.img.style.display = "block";
            let currentX = parseInt(pet.img.style.left || 0);
            let finalX = screenCenterX + positions[index].x - (currentSize / 2);
            let finalY = screenCenterY + positions[index].y - (currentSize / 2);

            if (finalX < currentX) { pet.isFlipped = true; pet.img.style.transform = "scaleX(-1)"; } 
            else { pet.isFlipped = false; pet.img.style.transform = "scaleX(1)"; }

            pet.currentState = "summoning";
            pet.img.src = flyGif;
            pet.img.style.left = `${finalX}px`;
            pet.img.style.top = `${finalY}px`;
            
            pet.updateDataToGlobal(false); 
            clearTimeout(pet.actionTimeout); 
        });

        saveGlobalPetsData();

        globalSummonTimeout = setTimeout(() => {
            petsArray.forEach(pet => {
                pet.isFlipped = false;
                pet.img.style.transform = "scaleX(1)";
                pet.freezeForSummon(false); 
            });
            saveGlobalPetsData(); 
        }, 2000);

        currentFormationIndex = (currentFormationIndex + 1) % 5;
    }

    // --- GỌI VŨ ĐẠO ---
    if (request.action === "dancePet") { 
        petsArray.forEach(pet => { 
            // Tạm thời hardcode test thử điệu nhảy 1 tay (DANCE_MOVES.ONE_HAND)
            // Sau này m có menu thả xuống thì sẽ truyền biến moveCode từ popup sang đây
            pet.executeDanceMove(DANCE_MOVES.ONE_HAND, false); 
        }); 
        saveGlobalPetsData(); 
    }
    
    if (request.action === "breakPet") {
        petsArray.forEach(pet => { 
            clearTimeout(pet.actionTimeout); 
            clearInterval(pet.danceInterval);
            pet.setIdle(false); 
        });
        saveGlobalPetsData();
    }

    if (request.action === "toggleStand") { isStandMode = request.status; }
    if (request.action === "changeSize") { currentSize = parseInt(request.size); petsArray.forEach(pet => pet.applySize(currentSize)); }
    if (request.action === "changeCount") { adjustPetCount(parseInt(request.count)); }
});

// --- 5. ĐỒNG BỘ ĐA TAB ---
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isPetActive) { isPetActive = changes.isPetActive.newValue; petsArray.forEach(pet => pet.img.style.display = isPetActive ? "block" : "none"); }
    if (changes.isStandMode) isStandMode = changes.isStandMode.newValue;
    if (changes.petSize) { currentSize = parseInt(changes.petSize.newValue); petsArray.forEach(pet => pet.applySize(currentSize)); }
    if (changes.petCount) { if (currentCount !== parseInt(changes.petCount.newValue)) adjustPetCount(parseInt(changes.petCount.newValue), globalPetsData); }

    if (changes.petsData && isPetActive) {
        const newDataString = JSON.stringify(changes.petsData.newValue || []);
        if (newDataString === lastSavedDataString) return; 

        const dataArray = changes.petsData.newValue || [];
        globalPetsData = dataArray; 
        
        dataArray.forEach((data, index) => {
            if (petsArray[index] && !petsArray[index].isDragging) {
                let pet = petsArray[index];
                
                pet.img.style.left = `${data.x}px`;
                pet.img.style.top = `${data.y}px`;
                pet.img.src = data.src;
                pet.currentState = data.state;
                pet.isFlipped = data.flip || false;
                pet.img.style.transform = pet.isFlipped ? "scaleX(-1)" : "scaleX(1)";
                
                pet.applyFailsafeTimeout();
            }
        });
    }
});

// Khởi tạo
chrome.storage.local.get(["petsData", "isPetActive", "isStandMode", "petSize", "petCount"], (result) => {
    isPetActive = result.isPetActive !== false; 
    isStandMode = result.isStandMode || false;
    currentSize = parseInt(result.petSize || 120);
    globalPetsData = result.petsData || [];
    adjustPetCount(parseInt(result.petCount || 1), globalPetsData);
});