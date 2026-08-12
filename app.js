/* ==========================================
   Zebra Crossing Violation Detector - JavaScript (app.js)
   ========================================== */

let videoElement, canvasElement, canvasCtx;
let isCameraActive = false;
let isRedLight = false;
let isDrawingMode = false;
let centerLine = { x1: 0, y1: 0, x2: 0, y2: 0, buffer: 40 };
let drawingPoints = [];

// Wasm Module Reference (สมมติว่าโหลด C++ ผ่าน WebAssembly แล้ว)
let cppModule = null;
let detectorInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
    initElements();
    initEvents();
    
    // โหลด Wasm Module (ถ้ามีไฟล์ .wasm จริงๆ)
    // cppModule = await createCrossingDetectorModule();
    // detectorInstance = cppModule._createDetector();
    
    console.log("System Initialized");
});

function initElements() {
    videoElement = document.getElementById("webcam");
    canvasElement = document.getElementById("output-canvas");
    canvasCtx = canvasElement.getContext("2d");
}

function initEvents() {
    // ปุ่มเปิด-ปิด กล้อง
    const toggleCameraBtn = document.getElementById("toggle-camera");
    if (toggleCameraBtn) {
        toggleCameraBtn.addEventListener("click", toggleCamera);
    }

    // ปุ่มสลับสถานะไฟจราจร (จำลองการเปลี่ยนอัตโนมัติหรือกดสลับ)
    const toggleLightBtn = document.getElementById("toggle-light");
    if (toggleLightBtn) {
        toggleLightBtn.addEventListener("click", () => {
            isRedLight = !isRedLight;
            updateTrafficLightUI();
            if (detectorInstance && cppModule) {
                cppModule._updateTrafficLight(detectorInstance, isRedLight);
            }
        });
    }

    // Canvas Event สำหรับวาด Center Line
    canvasElement.addEventListener("click", (e) => {
        if (!isDrawingMode) return;
        const rect = canvasElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        drawingPoints.push({ x, y });
        if (drawingPoints.length === 2) {
            centerLine.x1 = drawingPoints[0].x;
            centerLine.y1 = drawingPoints[0].y;
            centerLine.x2 = drawingPoints[1].x;
            centerLine.y2 = drawingPoints[1].y;
            drawingPoints = [];
            isDrawingMode = false;
            alert("บันทึก Center Line ของทางม้าลายเรียบร้อยแล้ว!");
            
            if (detectorInstance && cppModule) {
                cppModule._defineCenterLine(
                    detectorInstance, 
                    centerLine.x1, centerLine.y1, 
                    centerLine.x2, centerLine.y2, 
                    centerLine.buffer
                );
            }
        }
    });
}

async function toggleCamera() {
    if (!isCameraActive) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 } 
            });
            videoElement.srcObject = stream;
            videoElement.play();
            isCameraActive = true;
            requestAnimationFrame(processFrame);
        } catch (err) {
            console.error("ไม่สามารถเปิดกล้องได้:", err);
            alert("กรุณาอนุญาตการใช้งานกล้อง");
        }
    } else {
        const stream = videoElement.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        videoElement.srcObject = null;
        isCameraActive = false;
    }
}

function processFrame() {
    if (!isCameraActive) return;

    // เคลียร์ Canvas และวาดภาพจาก Video
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    // วาด Center Line ของทางม้าลายลงบนจอ
    drawCenterLine();

    // จำลองการเรียกประมวลผลการตรวจจับรถและเช็คทับซ้อน
    // (สามารถแทนที่ด้วยผลลัพธ์จาก MediaPipe Object Detection และ C++ Wasm)
    
    requestAnimationFrame(processFrame);
}

function drawCenterLine() {
    canvasCtx.beginPath();
    canvasCtx.moveTo(centerLine.x1, centerLine.y1);
    canvasCtx.lineTo(centerLine.x2, centerLine.y2);
    canvasCtx.strokeStyle = "#3b82f6";
    canvasCtx.lineWidth = 4;
    canvasCtx.stroke();

    // วาด Buffer Zone รอบ Center Line
    canvasCtx.beginPath();
    canvasCtx.arc(centerLine.x1, centerLine.y1, centerLine.buffer, 0, 2 * Math.PI);
    canvasCtx.fillStyle = "rgba(59, 130, 246, 0.1)";
    canvasCtx.fill();
    canvasCtx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    canvasCtx.stroke();
}

function updateTrafficLightUI() {
    const lightBadge = document.getElementById("light-status-badge");
    if (lightBadge) {
        if (isRedLight) {
            lightBadge.textContent = "🔴 ไฟแดง";
            lightBadge.style.backgroundColor = "#fee2e2";
            lightBadge.style.color = "#dc2626";
        } else {
            lightBadge.textContent = "🟢 ไฟเขียว";
            lightBadge.style.backgroundColor = "#dcfce7";
            lightBadge.style.color = "#16a34a";
        }
    }
}