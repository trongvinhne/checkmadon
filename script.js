const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const resultEl = document.getElementById("result");
const videoInputEl = document.getElementById("videoInput");
const videoEl = document.getElementById("video");
const scanBtn = document.getElementById("scanBtn");
const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");
const askAiBtn = document.getElementById("askAiBtn");
const aiPromptEl = document.getElementById("aiPrompt");
const aiResponseEl = document.getElementById("aiResponse");
const aiKeyEl = document.getElementById("aiKey");
const qrCanvas = document.getElementById("qrCanvas");

let selectedVideoFile = null;
let openAiKey = null;
let barcodeDetector = null;
let hiddenCanvas = null;
let hiddenCtx = null;
let previewCtx = null;

initialize();

function initialize() {
    loadSavedApiKey();
    videoInputEl.addEventListener("change", onVideoSelected);
    scanBtn.addEventListener("click", onScanClick);
    saveApiKeyBtn.addEventListener("click", onSaveApiKey);
    askAiBtn.addEventListener("click", onAskAi);
    previewCtx = qrCanvas.getContext("2d");
    hiddenCanvas = document.createElement("canvas");
    hiddenCtx = hiddenCanvas.getContext("2d");

    if ("BarcodeDetector" in window) {
        try {
            barcodeDetector = new BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "data_matrix", "pdf417"] });
        } catch (error) {
            barcodeDetector = null;
        }
    }
}

function loadSavedApiKey() {
    const savedKey = localStorage.getItem("checkmadon_openai_key");
    if (savedKey) {
        openAiKey = savedKey;
        aiKeyEl.value = savedKey;
        aiResponseEl.textContent = "OpenAI API key đã được tải. Bạn có thể hỏi AI hoặc dùng trợ lý nội bộ.";
    }
}

function onVideoSelected(event) {
    const file = event.target.files[0];
    if (!file) {
        statusEl.textContent = "Chưa chọn video";
        return;
    }

    selectedVideoFile = file;
    statusEl.textContent = `Đã chọn video: ${file.name}`;
    videoEl.src = URL.createObjectURL(file);
    videoEl.load();
    resultEl.value = "";
    progressEl.value = 0;
    scanBtn.textContent = "Bắt đầu quét";

    videoEl.addEventListener("loadedmetadata", () => {
        statusEl.textContent = `Video đã nạp (${formatTime(videoEl.duration)}). Đang chuẩn bị quét...`;
        startScan();
    }, { once: true });
}

function onScanClick() {
    if (!selectedVideoFile) {
        alert("Vui lòng chọn một video trước khi quét.");
        return;
    }
    startScan();
}

async function startScan() {
    scanBtn.disabled = true;
    statusEl.textContent = "Đang quét video tự động...";
    progressEl.value = 0;
    resultEl.value = "";

    try {
        const duration = videoEl.duration || 0;
        const frames = Math.min(20, Math.max(6, Math.floor(duration * 2)));
        const foundSet = new Set();
        const errors = [];

        for (let index = 0; index < frames; index++) {
            const position = Math.min(duration, (index / (frames - 1)) * duration);
            await seekVideo(position);
            const codes = await scanCurrentFrame();
            codes.forEach((code) => foundSet.add(code));

            const progress = Math.round(((index + 1) / frames) * 100);
            progressEl.value = progress;
            statusEl.textContent = `Quét tự động: ${index + 1}/${frames} khung hình - ${progress}%`;
        }

        const results = Array.from(foundSet);
        if (results.length === 0) {
            resultEl.value = "Không tìm thấy mã trong video. Hãy thử video khác hoặc kiểm tra chất lượng khung hình.";
            statusEl.textContent = "Quét hoàn tất - chưa tìm thấy mã.";
        } else {
            resultEl.value = results.join("\n");
            statusEl.textContent = `Quét hoàn tất - tìm thấy ${results.length} mã.`;
        }
    } catch (error) {
        resultEl.value = `Lỗi khi quét mã: ${error.message}`;
        statusEl.textContent = "Quét thất bại.";
    } finally {
        progressEl.value = 100;
        scanBtn.disabled = false;
        scanBtn.textContent = "Quét lại";
    }
}

function seekVideo(time) {
    return new Promise((resolve, reject) => {
        const onSeeked = () => {
            videoEl.removeEventListener("seeked", onSeeked);
            resolve();
        };
        const onError = () => {
            videoEl.removeEventListener("error", onError);
            reject(new Error("Không thể đọc video tại thời điểm này."));
        };
        videoEl.addEventListener("seeked", onSeeked);
        videoEl.addEventListener("error", onError, { once: true });
        videoEl.currentTime = Math.min(time, videoEl.duration || time);
    });
}

async function scanCurrentFrame() {
    const width = Math.min(1024, videoEl.videoWidth);
    const height = Math.round((width / videoEl.videoWidth) * videoEl.videoHeight);
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;
    hiddenCtx.drawImage(videoEl, 0, 0, width, height);

    qrCanvas.width = width;
    qrCanvas.height = height;
    previewCtx.drawImage(hiddenCanvas, 0, 0);

    const codes = new Set();

    if (barcodeDetector) {
        try {
            const detected = await barcodeDetector.detect(hiddenCanvas);
            detected.forEach((item) => {
                if (item.rawValue) {
                    codes.add(item.rawValue.trim());
                }
            });
        } catch (error) {
            console.warn("BarcodeDetector không đọc được khung hình:", error);
        }
    }

    try {
        const result = await Tesseract.recognize(hiddenCanvas, "eng", {
            logger: (m) => {
                if (m.status === "recognizing text") {
                    statusEl.textContent = `Đang OCR: ${Math.round(m.progress * 100)}%`;
                }
            },
        });

        const text = result.data.text || "";
        const foundCodes = extractCodesFromText(text);
        foundCodes.forEach((code) => codes.add(code));
    } catch (error) {
        console.warn("OCR thất bại cho khung hình:", error);
    }

    return Array.from(codes);
}

function extractCodesFromText(text) {
    const results = new Set();
    const normalized = text.replace(/[\s|lI]/g, " ");
    const pattern = /[A-Za-z0-9\-_/]{6,30}/g;
    const matches = normalized.match(pattern) || [];
    matches.forEach((match) => {
        const code = match.trim();
        if (code.length >= 6) {
            results.add(code);
        }
    });
    return Array.from(results);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function onSaveApiKey() {
    const value = aiKeyEl.value.trim();
    if (!value) {
        localStorage.removeItem("checkmadon_openai_key");
        openAiKey = null;
        aiResponseEl.textContent = "OpenAI API key đã được xóa. Trợ lý nội bộ vẫn hoạt động.";
        return;
    }

    localStorage.setItem("checkmadon_openai_key", value);
    openAiKey = value;
    aiResponseEl.textContent = "OpenAI API key đã được lưu. Bạn có thể hỏi AI ngay.";
}

async function onAskAi() {
    const prompt = aiPromptEl.value.trim();
    if (!prompt) {
        alert("Vui lòng nhập câu hỏi hoặc lệnh cho AI.");
        return;
    }

    aiResponseEl.textContent = "Đang xử lý yêu cầu...";
    try {
        const answer = await askAi(prompt);
        aiResponseEl.textContent = answer;
    } catch (error) {
        aiResponseEl.textContent = `Lỗi khi gọi AI: ${error.message}`;
    }
}

async function askAi(prompt) {
    if (openAiKey) {
        return await callOpenAi(prompt);
    }
    return getLocalAiResponse(prompt);
}

async function callOpenAi(prompt) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Bạn là trợ lý AI cho ứng dụng Check Mã Đơn. Hỗ trợ người dùng tiếng Việt.", },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 400,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    if (!message) {
        throw new Error("Không nhận được phản hồi từ OpenAI.");
    }
    return message.trim();
}

function getLocalAiResponse(prompt) {
    const lower = prompt.toLowerCase();

    if (lower.includes("quét") || lower.includes("scan") || lower.includes("video")) {
        return "Tôi có thể hướng dẫn bạn sử dụng chức năng quét: chọn video rồi nhấn 'Bắt đầu quét'. Hiện tại trang sẽ tự động quét sau khi chọn video.";
    }

    if (lower.includes("qr")) {
        return "Phần QR đã sẵn sàng để bạn xem. Bạn có thể mở rộng ứng dụng để tạo mã QR từ kết quả quét mã đơn.";
    }

    if (lower.includes("mã đơn") || lower.includes("đơn")) {
        return "Ứng dụng hướng tới kiểm tra mã đơn và hỗ trợ quét mã từ video. Hãy chọn video của bạn và để ứng dụng quét tự động.";
    }

    if (lower.includes("ai")) {
        return "Tôi là trợ lý AI nội bộ của Check Mã Đơn. Bạn có thể hỏi tôi về cách dùng ứng dụng hoặc những bước tiếp theo.";
    }

    return "Đây là trợ lý AI nội bộ. Hãy hỏi tôi về quét mã, video, QR hoặc mô tả công dụng của trang này.";
}
