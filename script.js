let afDataForExport = []; 

// 1. CHUYỂN ĐỔI CHẾ ĐỘ NHẬP KHOẢNG CÁCH (LINEAR)
function toggleDistMode() {
    const mode = document.getElementById('distMode').value;
    if (mode === 'lambda') {
        document.getElementById('modeLambda').style.display = 'flex';
        document.getElementById('modePhysical').style.display = 'none';
    } else {
        document.getElementById('modeLambda').style.display = 'none';
        document.getElementById('modePhysical').style.display = 'flex';
        document.getElementById('modePhysical').style.flexDirection = 'column';
    }
}

// CHUYỂN ĐỔI CHẾ ĐỘ NHẬP KHOẢNG CÁCH (PLANAR) - MỚI THÊM
function toggleDistModePlanar() {
    const mode = document.getElementById('distModePlanar').value;
    if (mode === 'lambda') {
        document.getElementById('modeLambdaPlanar').style.display = 'flex';
        document.getElementById('modePhysicalPlanar').style.display = 'none';
    } else {
        document.getElementById('modeLambdaPlanar').style.display = 'none';
        document.getElementById('modePhysicalPlanar').style.display = 'flex';
        document.getElementById('modePhysicalPlanar').style.flexDirection = 'column';
    }
}
// CHUYỂN ĐỔI CHẾ ĐỘ NHẬP GÓC QUÉT (LINEAR)
function toggleSteeringModeULA() {
    const mode = document.getElementById('steerModeULA').value;
    if (mode === 'angle') {
        document.getElementById('steerAngleULA').style.display = 'flex';
        document.getElementById('steerPhaseULA').style.display = 'none';
    } else {
        document.getElementById('steerAngleULA').style.display = 'none';
        document.getElementById('steerPhaseULA').style.display = 'flex';
        document.getElementById('steerPhaseULA').style.flexDirection = 'column';
    }
}

// CHUYỂN ĐỔI CHẾ ĐỘ NHẬP GÓC QUÉT (PLANAR)
function toggleSteeringModeUPA() {
    const mode = document.getElementById('steerModeUPA').value;
    if (mode === 'angle') {
        document.getElementById('steerAngleUPA').style.display = 'flex';
        document.getElementById('steerPhaseUPA').style.display = 'none';
    } else {
        document.getElementById('steerAngleUPA').style.display = 'none';
        document.getElementById('steerPhaseUPA').style.display = 'flex';
        document.getElementById('steerPhaseUPA').style.flexDirection = 'column';
    }
}

// 2. TÍNH TOÁN ĐẶC TÍNH PHẦN TỬ (ELEMENT FACTOR)
function getElementFactor(thetaRad, type) {
    let val;
    switch(type) {
        case 'isotropic': return 1;
        case 'hertzian': return Math.abs(Math.sin(thetaRad));
        case 'dipole_half':
            if (Math.abs(Math.sin(thetaRad)) < 1e-9) return 0;
            return Math.abs(Math.cos((Math.PI / 2) * Math.cos(thetaRad)) / Math.sin(thetaRad));
        case 'dipole_full':
            if (Math.abs(Math.sin(thetaRad)) < 1e-9) return 0;
            return Math.abs((Math.cos(Math.PI * Math.cos(thetaRad)) + 1) / Math.sin(thetaRad));
        case 'loop_small': return Math.abs(Math.sin(thetaRad));
        case 'patch':
            val = Math.cos(thetaRad);
            return val > 0 ? val : 0; 
        case 'horn_ideal':
            val = Math.cos(thetaRad);
            return val > 0 ? val * val : 0;
        default: return 1;
    }
}

// ==========================================
// 3. XỬ LÝ MẢNG TUYẾN TÍNH (ULA)
// ==========================================
function calculateAF() {
    const N = parseInt(document.getElementById('numN').value);
    const elementType = document.getElementById('elementType').value;
    
    // Tính khoảng cách d
    let d_lambda = 0;
    if (document.getElementById('distMode').value === 'lambda') {
        d_lambda = parseFloat(document.getElementById('distD').value);
    } else {
        const f_MHz = parseFloat(document.getElementById('freqMHz').value);
        const d_cm = parseFloat(document.getElementById('distCM').value);
        d_lambda = d_cm / (30000 / f_MHz);
    }

    // Tính góc quét
    // Tính góc quét hoặc lấy góc pha trực tiếp (MỚI)
    let alphaRad = 0;
    const steerMode = document.getElementById('steerModeULA').value;
    
    if (steerMode === 'angle') {
        // Chế độ: Tự động tính từ góc mục tiêu
        const theta0Rad = (parseFloat(document.getElementById('theta0Deg').value) * Math.PI) / 180;
        alphaRad = -2 * Math.PI * d_lambda * Math.cos(theta0Rad);
    } else {
        // Chế độ: Người dùng nhập trực tiếp góc pha
        alphaRad = (parseFloat(document.getElementById('alphaDeg').value) * Math.PI) / 180;
    }
    
    document.getElementById('ulaAlpha').innerText = (alphaRad * 180 / Math.PI).toFixed(2) + "°";

    // Phân tích thông số (HPBW, SLL)
    let stats = extractStatsULA(N, d_lambda, alphaRad, elementType);
    
    document.getElementById('ulaHPBW').innerText = stats.hpbw + "°";
    document.getElementById('ulaFNBW').innerText = stats.fnbw + "°";
    document.getElementById('ulaSLL').innerText = stats.sll;

    // Directivity xấp xỉ
    let directivity_linear = 2 * N * d_lambda; 
    document.getElementById('ulaDirectivity').innerText = directivity_linear.toFixed(2) + " (times) ~ " + (10 * Math.log10(directivity_linear)).toFixed(2) + " dBi";

    // Vẽ 3 đồ thị
    drawCartesianULA(N, d_lambda, alphaRad, elementType, stats.maxVal);
    drawPolarULA(N, d_lambda, alphaRad, elementType, stats.maxVal);
    draw3DULA(N, d_lambda, alphaRad, elementType, stats.maxVal); 
}

function extractStatsULA(N, d_lambda, betaRad, elementType) {
    let data = [];
    let maxVal = 0;
    
    // Quét toàn bộ 180 độ
    for(let t = 0; t <= 180; t += 0.5) {
        let th = t * Math.PI / 180;
        let psi = 2 * Math.PI * d_lambda * Math.cos(th) + betaRad;
        let af = (Math.abs(Math.sin(psi / 2)) < 1e-9) ? 1 : Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
        let ef = getElementFactor(th, elementType);
        let total = af * ef;
        if(total > maxVal) maxVal = total;
        data.push({t: t, val: total});
    }

    // Tránh lỗi chia 0
    if (maxVal === 0) maxVal = 1;

    let peakIndex = 0;
    for(let i = 0; i < data.length; i++) {
        data[i].db = 20 * Math.log10((data[i].val / maxVal) + 1e-9); 
        if(data[i].db > data[peakIndex].db) peakIndex = i;
    }

    // 1. Tìm HPBW (-3dB)
    let left3dB = 0, right3dB = 180;
    for(let i = peakIndex; i >= 0; i--) { if(data[i].db <= -3) { left3dB = data[i].t; break; } }
    for(let i = peakIndex; i < data.length; i++) { if(data[i].db <= -3) { right3dB = data[i].t; break; } }
    
    // 2. KHÔI PHỤC: Tìm FNBW (Hai điểm Null đầu tiên ở 2 bên búp sóng)
    let leftNull = 0, rightNull = 180;
    for(let i = peakIndex - 1; i >= 0; i--) { 
        if(data[i].db > data[i+1].db) { leftNull = data[i+1].t; break; } 
    }
    for(let i = peakIndex + 1; i < data.length - 1; i++) { 
        if(data[i].db > data[i-1].db) { rightNull = data[i-1].t; break; } 
    }
    let fnbw = (rightNull - leftNull).toFixed(2);
    if (leftNull === 0 && rightNull === 180) fnbw = "Không có Null";

    // 3. Tìm SLL (Mức búp sóng phụ lớn nhất)
    let peaks = [];
    for(let i = 1; i < data.length - 1; i++) {
        if(data[i].db > data[i-1].db && data[i].db > data[i+1].db && data[i].db > -40) {
            peaks.push(data[i].db);
        }
    }
    peaks.sort((a,b) => b - a);
    let sll = peaks.length > 1 ? peaks[1].toFixed(2) + " dB" : "Không có";

    return { 
        hpbw: (right3dB - left3dB).toFixed(2), 
        fnbw: fnbw, // Trả về kết quả FNBW đã tính
        sll: sll, 
        maxVal: maxVal 
    };
}

// --- CÁC HÀM VẼ ULA ---
function drawCartesianULA(N, d, alpha, type, maxVal) {
    let x_vals = [], y_vals = [];
    afDataForExport = [];

    for (let t = 0; t <= 180; t++) {
        let th = t * Math.PI / 180;
        let psi = 2 * Math.PI * d * Math.cos(th) + alpha;
        let af = (Math.abs(Math.sin(psi / 2)) < 1e-9) ? 1 : Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
        let val = (af * getElementFactor(th, type)) / maxVal;
        
        let db = 20 * Math.log10(val + 1e-9);
        if (db < -40) db = -40;

        x_vals.push(t - 90);
        y_vals.push(db);
        afDataForExport.push({ theta: t, af: val });
    }

    const targetTheta = parseInt(document.getElementById('thetaDeg').value);
    if(targetTheta >= 0 && targetTheta <= 180) {
        document.getElementById('afResult').innerText = afDataForExport[targetTheta].af.toFixed(4);
    }

    const data = [{ x: x_vals, y: y_vals, mode: 'lines', line: { color: 'blue', width: 2 }, type: 'scatter' }];
    const layout = { title: 'Cartesian Radiation Pattern (dB)', xaxis: { title: 'Angle (Degrees)', range: [-90, 90] }, yaxis: { title: 'Amplitude (dB)', range: [-40, 0] }};
    Plotly.newPlot('plotCartesian', data, layout);
}

function drawPolarULA(N, d, alpha, type, maxVal) {
    let t_vals = [], r_vals = [];
    for (let t = 0; t <= 360; t++) {
        let th = t * Math.PI / 180;
        let psi = 2 * Math.PI * d * Math.cos(th) + alpha;
        let af = (Math.abs(Math.sin(psi / 2)) < 1e-9) ? 1 : Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
        let db = 20 * Math.log10((af * getElementFactor(th, type)) / maxVal + 1e-9);
        r_vals.push(db < -40 ? -40 : db);
        t_vals.push(t);
    }
    const data = [{ r: r_vals, theta: t_vals, mode: 'lines', line: { color: '#BF1E2D', width: 2 }, fill: 'toself', type: 'scatterpolar' }];
    const layout = { title: '2D Polar Cut Pattern', polar: { radialaxis: { range: [-40, 0] }, angularaxis: { rotation: 0 }}};
    Plotly.newPlot('plot2d', data, layout);
}

function draw3DULA(N, d, alpha, type, maxVal) {
    let x_vals = [], y_vals = [], z_vals = [];
    const res = 50; 
    for (let i = 0; i <= res; i++) {
        let x_row = [], y_row = [], z_row = [];
        let th = (i * Math.PI) / res; 
        let psi = 2 * Math.PI * d * Math.cos(th) + alpha;
        let af = (Math.abs(Math.sin(psi / 2)) < 1e-9) ? 1 : Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
        let val = (af * getElementFactor(th, type)) / maxVal;

        for (let j = 0; j <= res; j++) {
            let ph = (j * 2 * Math.PI) / res;
            x_row.push(val * Math.sin(th) * Math.cos(ph));
            y_row.push(val * Math.sin(th) * Math.sin(ph));
            z_row.push(val * Math.cos(th));
        }
        x_vals.push(x_row); y_vals.push(y_row); z_vals.push(z_row);
    }
    const data = [{ z: z_vals, x: x_vals, y: y_vals, type: 'surface', colorscale: 'Jet', showscale: false }];
    Plotly.newPlot('plot3d', data, { title: '3D Radiation Pattern (Linear)', scene: { aspectmode: 'cube' }});
}

// ==========================================
// 4. XỬ LÝ MẢNG PHẲNG (UPA)
// ==========================================
function calculatePlanarAF() {
    const Nx = parseInt(document.getElementById('numNx').value);
    const Ny = parseInt(document.getElementById('numNy').value);
    
    // --- MỚI: Xử lý Tần số cho Mảng Phẳng ---
    let dx = 0, dy = 0;
    if (document.getElementById('distModePlanar').value === 'lambda') {
        dx = parseFloat(document.getElementById('distDx').value);
        dy = parseFloat(document.getElementById('distDy').value);
    } else {
        const f_MHz = parseFloat(document.getElementById('freqMHzPlanar').value);
        const lambda_cm = 30000 / f_MHz;
        dx = parseFloat(document.getElementById('distDxCM').value) / lambda_cm;
        dy = parseFloat(document.getElementById('distDyCM').value) / lambda_cm;
    }

    const type = document.getElementById('elementTypePlanar').value;

    // --- MỚI: Tự động tính Beam Steering cho Mảng Phẳng ---
    // --- MỚI: Xử lý Beam Steering theo Toggle (Góc hoặc Pha) ---
let bx = 0, by = 0;
const steerMode = document.getElementById('steerModeUPA').value;

if (steerMode === 'angle') {
    // Tự động giải phương trình từ góc mục tiêu (θ0, ϕ0)
    const theta0Rad = (parseFloat(document.getElementById('theta0Planar').value) * Math.PI) / 180;
    const phi0Rad = (parseFloat(document.getElementById('phi0Planar').value) * Math.PI) / 180;
    bx = -2 * Math.PI * dx * Math.sin(theta0Rad) * Math.cos(phi0Rad);
    by = -2 * Math.PI * dy * Math.sin(theta0Rad) * Math.sin(phi0Rad);
} else {
    // Lấy trực tiếp từ input góc pha (βx, βy) do người dùng nhập
    bx = (parseFloat(document.getElementById('betaXDeg').value) * Math.PI) / 180;
    by = (parseFloat(document.getElementById('betaYDeg').value) * Math.PI) / 180;
}

// Cập nhật hiển thị giá trị pha ra giao diện
document.getElementById('upaBeta').innerText = `βx = ${(bx * 180 / Math.PI).toFixed(1)}°, βy = ${(by * 180 / Math.PI).toFixed(1)}°`;

    let x_vals = [], y_vals = [], z_vals = [];
    let contour_z = [];
    const res = 50; 

    // Quét dữ liệu 3D và Contour cùng lúc để tối ưu
    for (let i = 0; i <= res; i++) {
        let x_row = [], y_row = [], z_row = [], c_row = [];
        let th = (i * Math.PI) / res; 
        let ef = getElementFactor(th, type);

        for (let j = 0; j <= res * 2; j++) {
            let ph = (j * Math.PI) / res;
            
            let psi_x = 2 * Math.PI * dx * Math.sin(th) * Math.cos(ph) + bx;
            let psi_y = 2 * Math.PI * dy * Math.sin(th) * Math.sin(ph) + by;

            let af_x = (Math.abs(Math.sin(psi_x / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Nx * psi_x) / 2) / (Nx * Math.sin(psi_x / 2)));
            let af_y = (Math.abs(Math.sin(psi_y / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Ny * psi_y) / 2) / (Ny * Math.sin(psi_y / 2)));

            let total = af_x * af_y * ef;

            x_row.push(total * Math.sin(th) * Math.cos(ph));
            y_row.push(total * Math.sin(th) * Math.sin(ph));
            z_row.push(total * Math.cos(th));

            let db = 20 * Math.log10(total + 1e-9);
            c_row.push(db < -40 ? -40 : db);
        }
        x_vals.push(x_row); y_vals.push(y_row); z_vals.push(z_row);
        if (i <= res/2) contour_z.push(c_row); // Chỉ lấy nửa bán cầu trên cho Contour
    }

    // Tính Directivity
    let d_planar = 4 * Math.PI * (Nx * dx) * (Ny * dy);
    document.getElementById('upaDirectivity').innerText = (10 * Math.log10(d_planar)).toFixed(2) + " dBi";
    document.getElementById('upaHPBWx').innerText = (50.8 / (Nx * dx)).toFixed(2) + "°";
    document.getElementById('upaHPBWy').innerText = (50.8 / (Ny * dy)).toFixed(2) + "°";
// --- PHỤC HỒI: Tính AF tại góc chỉ định và FNBW ---
    const targetThetaDeg = parseFloat(document.getElementById('thetaPlanar').value);
    const targetPhiDeg = parseFloat(document.getElementById('phiPlanar').value);
    
    document.getElementById('dispThetaPlanar').innerText = targetThetaDeg;
    document.getElementById('dispPhiPlanar').innerText = targetPhiDeg;

    if (targetThetaDeg >= 0 && targetThetaDeg <= 180 && targetPhiDeg >= 0 && targetPhiDeg <= 360) {
        const targetThetaRad = (targetThetaDeg * Math.PI) / 180;
        const targetPhiRad = (targetPhiDeg * Math.PI) / 180;

        let psi_x_target = 2 * Math.PI * dx * Math.sin(targetThetaRad) * Math.cos(targetPhiRad) + bx;
        let psi_y_target = 2 * Math.PI * dy * Math.sin(targetThetaRad) * Math.sin(targetPhiRad) + by;

        let af_x_target = (Math.abs(Math.sin(psi_x_target / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Nx * psi_x_target) / 2) / (Nx * Math.sin(psi_x_target / 2)));
        let af_y_target = (Math.abs(Math.sin(psi_y_target / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Ny * psi_y_target) / 2) / (Ny * Math.sin(psi_y_target / 2)));
        let ef_target = getElementFactor(targetThetaRad, type);

        let af_total_target = af_x_target * af_y_target * ef_target;
        document.getElementById('afPlanarResult').innerText = af_total_target.toFixed(4);
    } else {
        document.getElementById('afPlanarResult').innerText = "Angle Error";
    }

    // Trả lại FNBW
    document.getElementById('upaFNBWx').innerText = (114.6 / (Nx * dx)).toFixed(2) + "°";
    document.getElementById('upaFNBWy').innerText = (114.6 / (Ny * dy)).toFixed(2) + "°";
    // --------------------------------------------------
    // Vẽ Đồ thị
    Plotly.newPlot('plotPlanar3D', [{ z: z_vals, x: x_vals, y: y_vals, type: 'surface', colorscale: 'Jet', showscale: false }], { title: '3D Radiation Pattern (Planar)' });
    
    Plotly.newPlot('plotPlanar2D', [{ z: contour_z, type: 'contour', colorscale: 'Jet', contours: { start: -40, end: 0, size: 5 }}], { title: '2D Contour Map (Upper Hemisphere)', xaxis: { title: 'Azimuth Angle Phi (ϕ)' }, yaxis: { title: 'Elevation Angle Theta (θ)' }});
}

// 5. CÁC HÀM HỖ TRỢ
function exportCSV() {
    if (afDataForExport.length === 0) return alert("Vui lòng Tính toán trước khi xuất CSV!");
    let csvContent = "data:text/csv;charset=utf-8,Goc Theta (Deg),Array Factor\n";
    afDataForExport.forEach(r => csvContent += r.theta + "," + r.af.toFixed(6) + "\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "Data_AF.csv";
    link.click();
}

function openSubTab(evt, tabName) {
    document.querySelectorAll(".sub-tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".sub-tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    window.dispatchEvent(new Event('resize')); // Kích hoạt render lại Plotly
}

window.onload = function() { calculateAF(); calculatePlanarAF(); };
window.onresize = function() {
    ['plotCartesian', 'plot2d', 'plot3d', 'plotPlanar2D', 'plotPlanar3D'].forEach(id => {
        if(document.getElementById(id).innerHTML !== "") Plotly.Plots.resize(id);
    });
};