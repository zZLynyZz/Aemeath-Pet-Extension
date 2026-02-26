// --- DANH SÁCH ĐIỆU NHẢY (CHOREOGRAPHY MAP) ---
const DANCE_MOVES = {
    JUMP: 1,             // Giơ 2 tay nhảy
    ONE_HAND: 2,         // Nhảy 1 tay (Luân phiên happy)
    ONE_HAND_FLIP: 3,    // Nhảy 1 tay (Lật mặt)
    SEAL: 4,             // Hải cẩu vỗ bụng (Mặt trái)
    SEAL_FLIP: 5         // Hải cẩu vỗ bụng (Mặt phải)
};

// --- THUẬT TOÁN XẾP ĐỘI HÌNH (FORMATIONS) ---
function getFormationPositions(formationIndex, N, gap) {
    let positions = [];
    
    // 0: 1 Hàng ngang
    if (formationIndex === 0) { 
        let startX = -((N - 1) * gap) / 2;
        for(let i=0; i<N; i++) positions.push({x: startX + i*gap, y: 0});
    }
    // 1: 2 Hàng 
    else if (formationIndex === 1) { 
        let cols = Math.ceil(N / 2); 
        let startX = -((cols - 1) * gap) / 2; 
        let startY = -gap / 2;
        for(let i=0; i<N; i++) positions.push({x: startX + (i % cols)*gap, y: startY + Math.floor(i / cols)*gap});
    }
    // 2: 3 Hàng 
    else if (formationIndex === 2) { 
        let cols = Math.ceil(N / 3); 
        let startX = -((cols - 1) * gap) / 2; 
        let startY = -gap;
        for(let i=0; i<N; i++) positions.push({x: startX + (i % cols)*gap, y: startY + Math.floor(i / cols)*gap});
    }
    // 3: Chữ A 
    else if (formationIndex === 3) { 
        let aCoords = [ {x: 0, y: -2}, {x: -0.5, y: -1}, {x: 0.5, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: -1.5, y: 1}, {x: 1.5, y: 1}, {x: -2, y: 2}, {x: 2, y: 2} ];
        for(let i=0; i<N; i++) {
            if (i < aCoords.length) positions.push({x: aCoords[i].x * gap, y: aCoords[i].y * gap});
            else positions.push({x: (-((N - aCoords.length - 1) * gap) / 2) + (i - aCoords.length)*gap, y: 3.5 * gap}); 
        }
    }
    // 4: Hình Trái Tim
    else if (formationIndex === 4) { 
        let heartCoords = [ {x: -1, y: -1.5}, {x: 1, y: -1.5}, {x: -2, y: -0.5}, {x: 0, y: -0.5}, {x: 2, y: -0.5}, {x: -2, y: 0.5}, {x: 2, y: 0.5}, {x: -1, y: 1.5}, {x: 1, y: 1.5}, {x: 0, y: 2.5} ];
        for(let i=0; i<N; i++) {
            if (i < heartCoords.length) positions.push({x: heartCoords[i].x * gap, y: heartCoords[i].y * gap});
            else positions.push({x: (-((N - heartCoords.length - 1) * gap) / 2) + (i - heartCoords.length)*gap, y: -3 * gap}); 
        }
    }
    
    return positions;
}