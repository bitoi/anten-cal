// ĐIỀU HƯỚNG TAB
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    
    // Ẩn tất cả nội dung tab
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }
    
    // Xóa class active của tất cả các nút
    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    
    // Hiện tab được chọn và thêm class active
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.className += " active";
}
// TAB 1: TÍNH TOÁN LOS VÀ FRESNEL

// Hàm đồng bộ giá trị giữa Slider và Ô nhập số

function calculateLOS() {
    const f = parseFloat(document.getElementById('losFreq').value); // MHz
    const d = parseFloat(document.getElementById('losDist').value); // km
    const h1 = parseFloat(document.getElementById('losH1').value);  // m
    const h2 = parseFloat(document.getElementById('losH2').value);  // m

    // 1. Khoảng cách Radio LOS tối đa (k = 4/3)
    if (h1 >= 0 && h2 >= 0) {
        const maxDist = 4.12 * (Math.sqrt(h1) + Math.sqrt(h2));
        document.getElementById('resMaxDist').innerText = maxDist.toFixed(2);
    } else {
        document.getElementById('resMaxDist').innerText = "Lỗi";
    }

    // 2. Suy hao FSPL và Bán kính Fresnel
    if (f > 0 && d > 0) {
        const fspl = 32.44 + 20 * Math.log10(d) + 20 * Math.log10(f);
        document.getElementById('resFSPL').innerText = fspl.toFixed(2);

        const f_GHz = f / 1000;
        const fresnel = 8.66 * Math.sqrt(d / f_GHz);
        document.getElementById('resFresnel').innerText = fresnel.toFixed(2);
    } else {
        document.getElementById('resFSPL').innerText = "Lỗi";
        document.getElementById('resFresnel').innerText = "Lỗi";
    }
}

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
    
    if(targetTheta >= 0 && targetTheta <= 180) {
        document.getElementById('afResult').innerText = afDataForExport[targetTheta].af.toFixed(4);
    } else {
        document.getElementById('afResult').innerText = "Góc ngoài vùng (0-180)";
    }

    // Vẽ 2 đồ thị
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
    csvContent += "Góc Theta (Độ),Array Factor (Chuẩn hóa)\n";

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
window.onload = function() {
    calculateLOS(); // Tính Tab 1
    calculateAF();  // Tính và vẽ Tab 2 luôn cho đẹp
    calculatePlanarAF(); // Planar
};

// Xử lý Responsive cho các đồ thị Plotly
window.addEventListener('resize', function() {
    const plot2d = document.getElementById('plot2d');
    const plot3d = document.getElementById('plot3d');
    
    if (plot2d && plot2d.innerHTML !== "") Plotly.Plots.resize(plot2d);
    if (plot3d && plot3d.innerHTML !== "") Plotly.Plots.resize(plot3d);
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
        const plotPlanar3D = document.getElementById('plotPlanar3D');
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
// --- THÊM VÀO HÀM calculatePlanarAF() ---
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