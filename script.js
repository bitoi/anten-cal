

// ==========================================
// TAB 2: TÍNH TOÁN ARRAY FACTOR (AF)
// ==========================================
let afDataForExport = []; // Biến toàn cục lưu dữ liệu để xuất CSV

function calculateAF() {
    const N = parseInt(document.getElementById('numN').value);
    const d_lambda = parseFloat(document.getElementById('distD').value);
    const alphaDeg = parseFloat(document.getElementById('phaseAlpha').value);
    const alphaRad = (alphaDeg * Math.PI) / 180;
    
    afDataForExport = []; // Reset mảng dữ liệu

    // Quét 180 độ để lấy dữ liệu xuất CSV
    for (let theta = 0; theta <= 180; theta++) {
        const thetaRad = (theta * Math.PI) / 180;
        const psi = 2 * Math.PI * d_lambda * Math.cos(thetaRad) + alphaRad;
        
        let af;
        if (Math.abs(Math.sin(psi / 2)) < 1e-9) {
            af = 1;
        } else {
            af = Math.abs(Math.sin((N * psi) / 2) / (N * Math.sin(psi / 2)));
        }
        
        afDataForExport.push({ theta: theta, af: af });
    }

    // Hiển thị kết quả tại góc quan sát chỉ định
    const targetTheta = parseInt(document.getElementById('thetaDeg').value);
    document.getElementById('displayTheta').innerText = targetTheta;
    let bw = extractBeamwidths(N, d_lambda, alphaRad);
    document.getElementById('ulaHPBW').innerText = bw.hpbw + "°";
    document.getElementById('ulaFNBW').innerText = bw.fnbw + "°";
    let directivity_linear = 2 * N * d_lambda; 
    let directivity_linear_dBi = 10 * Math.log10(directivity_linear);
    document.getElementById('ulaDirectivity').innerText = directivity_linear.toFixed(2) + " (lần) ~ " + directivity_linear_dBi.toFixed(2) + " dBi";
    
    if(targetTheta >= 0 && targetTheta <= 180) {
        document.getElementById('afResult').innerText = afDataForExport[targetTheta].af.toFixed(4);
    } else {
        document.getElementById('afResult').innerText = "Góc ngoài vùng (0-180)";
    }

    // Vẽ đồ thị
    drawCartesianChart();
    drawPolarChart(N, d_lambda, alphaRad);
    draw3DChart(N, d_lambda, alphaRad); 
}

// --- VẼ ĐỒ THỊ 2D POLAR (Thang dB) ---
function drawPolarChart(N, d_lambda, alphaRad) {
    let theta_vals = [];
    let af_db_vals = [];

    for (let theta = 0; theta <= 360; theta += 1) {
        theta_vals.push(theta);
        const thetaRad = (theta * Math.PI) / 180;
        
        const psi = 2 * Math.PI * d_lambda * Math.cos(thetaRad) + alphaRad;
        let af;
        if (Math.abs(Math.sin(psi / 2)) < 1e-9) {
            af = 1;
        } else {
            af = Math.abs(Math.sin((N * psi) / 2) / (N * Math.sin(psi / 2)));
        }

        let af_db = 20 * Math.log10(af);
        if (af_db < -40) af_db = -40; // Đặt sàn -40dB cho đẹp
        af_db_vals.push(af_db);
    }

    const data = [{
        r: af_db_vals,
        theta: theta_vals,
        mode: 'lines',
        line: { color: '#BF1E2D', width: 2 },
        fill: 'toself',
        fillcolor: 'rgba(191, 30, 45, 0.2)',
        type: 'scatterpolar'
    }];

    const layout = {
        polar: {
            radialaxis: { visible: true, range: [-40, 0] },
            angularaxis: { direction: "counterclockwise", rotation: 0 }
        },
        showlegend: false,
        margin: { l: 30, r: 30, b: 30, t: 30 }
    };

    Plotly.newPlot('plot2d', data, layout);
}

// --- VẼ ĐỒ THỊ 3D SURFACE (Thang Tuyến tính) ---
function draw3DChart(N, d_lambda, alphaRad) {
    let x_vals = [];
    let y_vals = [];
    let z_vals = [];
    const resolution = 50; 

    for (let i = 0; i <= resolution; i++) {
        let x_row = [];
        let y_row = [];
        let z_row = [];
        let thetaRad = (i * Math.PI) / resolution; 
        
        const psi = 2 * Math.PI * d_lambda * Math.cos(thetaRad) + alphaRad;
        let af;
        if (Math.abs(Math.sin(psi / 2)) < 1e-9) {
            af = 1;
        } else {
            af = Math.abs(Math.sin((N * psi) / 2) / (N * Math.sin(psi / 2)));
        }

        for (let j = 0; j <= resolution; j++) {
            let phiRad = (j * 2 * Math.PI) / resolution;
            x_row.push(af * Math.sin(thetaRad) * Math.cos(phiRad));
            y_row.push(af * Math.sin(thetaRad) * Math.sin(phiRad));
            z_row.push(af * Math.cos(thetaRad));
        }
        x_vals.push(x_row);
        y_vals.push(y_row);
        z_vals.push(z_row);
    }

    const data = [{
        z: z_vals, x: x_vals, y: y_vals,
        type: 'surface',
        colorscale: 'Jet',
        showscale: false
    }];

    const layout = {
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 0 },
        scene: {
            xaxis: { title: 'X' }, yaxis: { title: 'Y' }, zaxis: { title: 'Z' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
        }
    };

    Plotly.newPlot('plot3d', data, layout);
}

// --- XUẤT FILE CSV ---
function exportCSV() {
    if (afDataForExport.length === 0) {
        alert("Vui lòng bấm 'Tính toán' trước khi xuất dữ liệu!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Goc Theta (Deg),Array Factor\n";

    afDataForExport.forEach(function(row) {
        csvContent += row.theta + "," + row.af.toFixed(6) + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Array_Factor_Data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// KHỞI CHẠY KHI MỞ TRANG
// ==========================================


// Xử lý Responsive cho các đồ thị Plotly
window.addEventListener('resize', function() {
    const plot2d = document.getElementById('plot2d');
    const plot3d = document.getElementById('plot3d');
    
    if (plot2d && plot2d.innerHTML !== "") Plotly.Plots.resize(plot2d);
    if (plot3d && plot3d.innerHTML !== "") Plotly.Plots.resize(plot3d);
    if (document.getElementById('plotCartesian').innerHTML !== "") Plotly.Plots.resize('plotCartesian');
});
// Hàm chuyển đổi Tab con (Sub-tabs)
function openSubTab(evt, tabName) {
    let i, subcontent, sublinks;
    subcontent = document.getElementsByClassName("sub-tab-content");
    for (i = 0; i < subcontent.length; i++) {
        subcontent[i].style.display = "none";
        subcontent[i].classList.remove("active");
    }
    sublinks = document.getElementsByClassName("sub-tab-btn");
    for (i = 0; i < sublinks.length; i++) {
        sublinks[i].className = sublinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.className += " active";
    if (tabName === 'sub-linear') {
        const plot2d = document.getElementById('plot2d');
        const plot3d = document.getElementById('plot3d');
        if (plot2d && plot2d.innerHTML !== "") Plotly.Plots.resize(plot2d);
        if (plot3d && plot3d.innerHTML !== "") Plotly.Plots.resize(plot3d);
    } else if (tabName === 'sub-planar') {
        const plotPlanar2D = document.getElementById('plotPlanar2D');
        const plotPlanar3D = document.getElementById('plotPlanar3D');
        if (plotPlanar3D && plotPlanar3D.innerHTML !== "") Plotly.Plots.resize(plotPlanar3D);
        if (plotPlanar3D && plotPlanar3D.innerHTML !== "") Plotly.Plots.resize(plotPlanar3D);
    }
}

// Hàm Toán học & Vẽ đồ thị cho Planar Array
function calculatePlanarAF() {
    // Lấy thông số từ UI mảng phẳng
    const Nx = parseInt(document.getElementById('numNx').value);
    const Ny = parseInt(document.getElementById('numNy').value);
    const dx = parseFloat(document.getElementById('distDx').value);
    const dy = parseFloat(document.getElementById('distDy').value);
    const betaXRad = (parseFloat(document.getElementById('betaX').value) * Math.PI) / 180;
    const betaYRad = (parseFloat(document.getElementById('betaY').value) * Math.PI) / 180;

    let x_vals = [], y_vals = [], z_vals = [];
    const resolution = 60; // Độ mịn của lưới quét cầu

    // Quét toàn bộ không gian bán cầu (theta từ 0 đến 180, phi từ 0 đến 360)
    for (let i = 0; i <= resolution; i++) {
        let x_row = [], y_row = [], z_row = [];
        let thetaRad = (i * Math.PI) / resolution; 

        for (let j = 0; j <= resolution; j++) {
            let phiRad = (j * 2 * Math.PI) / resolution;
            
            // Tính pha thành phần theo 2 trục X và Y (Quy ước mặt phẳng mảng là XY)
            let psi_x = 2 * Math.PI * dx * Math.sin(thetaRad) * Math.cos(phiRad) + betaXRad;
            let psi_y = 2 * Math.PI * dy * Math.sin(thetaRad) * Math.sin(phiRad) + betaYRad;

            // Tính Array Factor thành phần (bắt lỗi chia 0)
            let af_x = (Math.abs(Math.sin(psi_x / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Nx * psi_x) / 2) / (Nx * Math.sin(psi_x / 2)));
            let af_y = (Math.abs(Math.sin(psi_y / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Ny * psi_y) / 2) / (Ny * Math.sin(psi_y / 2)));

            // Tích chập không gian: Mảng phẳng = Tích 2 mảng tuyến tính
            let af_total = af_x * af_y;

            // Đổi tọa độ Cầu sang Descartes để Plotly vẽ
            x_row.push(af_total * Math.sin(thetaRad) * Math.cos(phiRad));
            y_row.push(af_total * Math.sin(thetaRad) * Math.sin(phiRad));
            z_row.push(af_total * Math.cos(thetaRad));
        }
        x_vals.push(x_row);
        y_vals.push(y_row);
        z_vals.push(z_row);
    }
    // Tính và hiển thị giá trị AF tại góc chỉ định
    const targetThetaDeg = parseFloat(document.getElementById('thetaPlanar').value);
    const targetPhiDeg = parseFloat(document.getElementById('phiPlanar').value);
    
    document.getElementById('dispThetaPlanar').innerText = targetThetaDeg;
    document.getElementById('dispPhiPlanar').innerText = targetPhiDeg;
    

    if (targetThetaDeg >= 0 && targetThetaDeg <= 180 && targetPhiDeg >= 0 && targetPhiDeg <= 360) {
        const targetThetaRad = (targetThetaDeg * Math.PI) / 180;
        const targetPhiRad = (targetPhiDeg * Math.PI) / 180;

        let psi_x_target = 2 * Math.PI * dx * Math.sin(targetThetaRad) * Math.cos(targetPhiRad) + betaXRad;
        let psi_y_target = 2 * Math.PI * dy * Math.sin(targetThetaRad) * Math.sin(targetPhiRad) + betaYRad;

        let af_x_target = (Math.abs(Math.sin(psi_x_target / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Nx * psi_x_target) / 2) / (Nx * Math.sin(psi_x_target / 2)));
        let af_y_target = (Math.abs(Math.sin(psi_y_target / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Ny * psi_y_target) / 2) / (Ny * Math.sin(psi_y_target / 2)));

        let af_total_target = af_x_target * af_y_target;
        document.getElementById('afPlanarResult').innerText = af_total_target.toFixed(4);
    } else {
        document.getElementById('afPlanarResult').innerText = "Lỗi góc";
    }
    let hpbw_x = 50.8 / (Nx * dx);
    let fnbw_x = 114.6 / (Nx * dx);
    let hpbw_y = 50.8 / (Ny * dy);
    let fnbw_y = 114.6 / (Ny * dy);

    document.getElementById('upaHPBWx').innerText = hpbw_x.toFixed(2) + "°";
    document.getElementById('upaFNBWx').innerText = fnbw_x.toFixed(2) + "°";
    document.getElementById('upaHPBWy').innerText = hpbw_y.toFixed(2) + "°";
    document.getElementById('upaFNBWy').innerText = fnbw_y.toFixed(2) + "°";
    // Tính Directivity cho Planar Array: D = 4π * (Aperture hiệu dụng) / (λ^2), với Aperture hiệu dụng xấp xỉ bằng diện tích mảng (Nx*dx)*(Ny*dy)
    let directivity_planar = 4 * Math.PI * (Nx * dx) * (Ny * dy);
    let directivity_planar_dBi = 10 * Math.log10(directivity_planar);
    document.getElementById('upaDirectivity').innerText = directivity_planar.toFixed(2) + " (lần) ~ " + directivity_planar_dBi.toFixed(2) + " dBi";

    drawPlanarContour(Nx, Ny, dx, dy, betaXRad, betaYRad);
    // ----------------------------------------
    // Cấu hình vẽ 3D Plotly cho Planar
    const data = [{
        z: z_vals, x: x_vals, y: y_vals,
        type: 'surface',
        colorscale: 'Jet',
        showscale: false
    }];

    const layout = {
        title: `Đồ thị bức xạ 3D - Mảng phẳng ${Nx}x${Ny}`,
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 40 },
        scene: {
            xaxis: { title: 'X' }, yaxis: { title: 'Y' }, zaxis: { title: 'Z (Broadside)' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
        }
    };

    Plotly.newPlot('plotPlanar3D', data, layout);
    
}
// --- VẼ ĐỒ THỊ CARTESIAN (Thang dB - Trục X là góc) ---
// --- VẼ ĐỒ THỊ CARTESIAN (Thang dB - Lấy dữ liệu trực tiếp) ---
function drawCartesianChart() {
    let x_vals = [];
    let y_vals = [];

    // Duyệt qua mảng dữ liệu đã được tính chuẩn xác ở hàm calculateAF()
    for (let i = 0; i < afDataForExport.length; i++) {
        let theta = afDataForExport[i].theta;
        let af = afDataForExport[i].af;

        // Dịch trục tọa độ: Đỉnh 90 độ của hệ cầu sẽ về mốc 0 của trục X đồ thị
        let plotAngle = theta - 90;
        x_vals.push(plotAngle);

        // Đổi biên độ sang thang đo logarit (dB)
        let af_db = 20 * Math.log10(af);

        // Bọc bảo hiểm: Ép các giá trị lỗi hoặc quá sâu về mốc sàn -40dB
        if (!isFinite(af_db) || isNaN(af_db) || af_db < -40) {
            af_db = -40;
        }

        y_vals.push(af_db);
    }

    const data = [{
        x: x_vals,
        y: y_vals,
        mode: 'lines',
        line: { color: 'blue', width: 2 },
        type: 'scatter'
    }];

    const layout = {
        title: { text: 'Antenna Array Radiation Pattern (Cartesian)', font: { size: 16 } },
        xaxis: { 
            title: 'Angle (Deg)', 
            range: [-90, 90], // Khóa cứng trục X từ -90 đến 90
            dtick: 30,
            gridcolor: '#e2e2e2'
        },
        yaxis: { 
            title: 'Normalized Power (dB)', 
            range: [-40, 0],  // Khóa cứng trục Y từ -40 đến 0
            dtick: 10,
            gridcolor: '#e2e2e2'
        },
        margin: { l: 60, r: 30, b: 60, t: 60 },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        showlegend: false
    };

    Plotly.newPlot('plotCartesian', data, layout);
}
// --- VẼ ĐỒ THỊ 2D CONTOUR CHO PLANAR ARRAY (Thang dB) ---
function drawPlanarContour(Nx, Ny, dx, dy, betaXRad, betaYRad) {
    let phi_vals = [];   // Trục X
    let theta_vals = []; // Trục Y
    let z_vals = [];     // Màu sắc (Độ lớn dB)

    // Tạo mảng trục tọa độ (độ phân giải 2 độ cho mượt)
    for (let p = 0; p <= 360; p += 2) phi_vals.push(p);
    for (let t = 0; t <= 90; t += 2) theta_vals.push(t); // Góc tà từ 0 đến 90 độ (quét bán cầu trên)

    // Tính toán ma trận Array Factor (dB)
    for (let t of theta_vals) {
        let z_row = [];
        let thetaRad = (t * Math.PI) / 180;
        
        for (let p of phi_vals) {
            let phiRad = (p * Math.PI) / 180;
            
            let psi_x = 2 * Math.PI * dx * Math.sin(thetaRad) * Math.cos(phiRad) + betaXRad;
            let psi_y = 2 * Math.PI * dy * Math.sin(thetaRad) * Math.sin(phiRad) + betaYRad;

            let af_x = (Math.abs(Math.sin(psi_x / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Nx * psi_x) / 2) / (Nx * Math.sin(psi_x / 2)));
            let af_y = (Math.abs(Math.sin(psi_y / 2)) < 1e-9) ? 1 : Math.abs(Math.sin((Ny * psi_y) / 2) / (Ny * Math.sin(psi_y / 2)));

            let af_total = af_x * af_y;
            let af_db = 20 * Math.log10(af_total);
            if (af_db < -40) af_db = -40; // Giới hạn sàn -40dB
            
            z_row.push(af_db);
        }
        z_vals.push(z_row);
    }

    const data = [{
        z: z_vals,
        x: phi_vals,
        y: theta_vals,
        type: 'contour',
        colorscale: 'Jet',
        contours: {
            start: -40,
            end: 0,
            size: 5 // Cứ cách 5dB vẽ một đường viền
        },
        colorbar: { title: 'AF (dB)' }
    }];

    const layout = {
        title: { text: 'Bản đồ Contour 2D (Mặt phẳng XY)', font: { size: 15 } },
        xaxis: { title: 'Góc phương vị Phi (Độ)', dtick: 45 },
        yaxis: { title: 'Góc tà Theta (Độ)', dtick: 15 },
        margin: { l: 60, r: 20, b: 50, t: 40 }
    };

    Plotly.newPlot('plotPlanar2D', data, layout);
}

// --- THUẬT TOÁN TÌM HPBW VÀ FNBW (BẢN TRUYỀN BIẾN TRỰC TIẾP) ---
function extractBeamwidths(N, d_lambda, betaRad) {
    // Bọc bảo hiểm: Nếu thiếu dữ liệu thì nhả ra dấu gạch ngang
    if (!N || !d_lambda || isNaN(betaRad)) return { hpbw: "-", fnbw: "-" };

    let data = [];
    for(let t = 0; t <= 180; t += 0.1) {
        let th = t * Math.PI / 180;
        let psi = 2 * Math.PI * d_lambda * Math.cos(th) + betaRad;
        let af = (Math.abs(Math.sin(psi / 2)) < 1e-9) ? 1 : Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
        let db = 20 * Math.log10(af);
        
        if (!isFinite(db) || isNaN(db)) db = -200; 
        data.push({t: t, db: db});
    }

    let maxDb = -Infinity;
    let peakIndex = 0;
    for(let i = 0; i < data.length; i++) {
        if(data[i].db > maxDb) { maxDb = data[i].db; peakIndex = i; }
    }

    let left3dB = 0, right3dB = 180;
    for(let i = peakIndex; i >= 0; i--) { if(data[i].db <= maxDb - 3) { left3dB = data[i].t; break; } }
    for(let i = peakIndex; i < data.length; i++) { if(data[i].db <= maxDb - 3) { right3dB = data[i].t; break; } }
    
    let leftNull = 0, rightNull = 180;
    for(let i = peakIndex - 1; i >= 0; i--) { if(data[i].db > data[i+1].db) { leftNull = data[i+1].t; break; } }
    for(let i = peakIndex + 1; i < data.length - 1; i++) { if(data[i].db > data[i-1].db) { rightNull = data[i-1].t; break; } }

    return {
        hpbw: (right3dB - left3dB).toFixed(2),
        fnbw: (rightNull - leftNull).toFixed(2)
    };
}

window.onload = function() {
    calculateAF();  // Tính và vẽ Tab 2 
    calculatePlanarAF(); // Planar
};