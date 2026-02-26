// Sự kiện: Khi trình duyệt Chrome vừa được bật lên
chrome.runtime.onStartup.addListener(() => {
    // Ép thông số về mặc định
    chrome.storage.local.set({ 
        petSize: 120, 
        petCount: 1 
    });
});

