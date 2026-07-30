const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const resultEl = document.getElementById("result");
const resultListEl = document.getElementById("resultList");
const resultSummaryEl = document.getElementById("resultSummary");
const currentIndexEl = document.getElementById("currentIndex");
const videoInputEl = document.getElementById("videoInput");
const videoEl = document.getElementById("video");
const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const exportBtn = document.getElementById("exportBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");
const askAiBtn = document.getElementById("askAiBtn");
const aiPromptEl = document.getElementById("aiPrompt");
const aiResponseEl = document.getElementById("aiResponse");
const aiKeyEl = document.getElementById("aiKey");
const qrCanvas = document.getElementById("qrCanvas");
const supportBadgeEl = document.getElementById("supportBadge");
const selectedCodeEl = document.getElementById("selectedCode");

let selectedVideoFile = null;
let currentObjectUrl = null;
let openAiKey = null;
let barcodeDetector = null;
let hiddenCanvas = null;
let hiddenCtx = null;
let previewCtx = null;
let detectedCodes = [];
let selectedCodeIndex = 0;
let scanInProgress = false;

initialize();

function initialize() {
    loadSavedApiKey();
    bindEvents();
    previewCtx = qrCanvas.getContext("2d");
    hiddenCanvas = document.createElement("canvas");
    hiddenCtx = hiddenCanvas.getContext("2d");
    updateSupportBadge();

    if ("BarcodeDetector" in window) {
        try {
            barcodeDetector = new BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "data_matrix", "pdf417"] });
        } catch (error) {
            barcodeDetector = null;
        }
    }
}

function bindEvents() {
    videoInputEl.addEventListener("change", onVideoSelected);
    scanBtn.addEventListener("click", onScanClick);
    clearBtn.addEventListener("click", clearResults);
    copyBtn.addEventListener("click", copyResults);
    exportBtn.addEventListener("click", exportResults);
    prevBtn.addEventListener("click", () => selectCode(-1));
    nextBtn.addEventListener("click", () => selectCode(1));
    saveApiKeyBtn.addEventListener("click", onSaveApiKey);
    askAiBtn.addEventListener("click", onAskAi);
    aiPromptEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onAskAi();
        }
    });
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

    if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
    }

    selectedVideoFile = file;
    currentObjectUrl = URL.createObjectURL(file);
    videoEl.src = currentObjectUrl;
    videoEl.load();
    clearResults({ keepStatus: true });
    scanBtn.textContent = "Bắt đầu quét";
    statusEl.textContent = `Đã chọn video: ${file.name}`;

    videoEl.addEventListener("loadedmetadata", () => {
        statusEl.textContent = `Video đã nạp (${formatTime(videoEl.duration)}). Sẵn sàng để quét.`;
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
    if (scanInProgress) {
        return;
    }

    scanInProgress = true;
    scanBtn.disabled = true;
    clearBtn.disabled = true;
    progressEl.value = 0;
    resultEl.value = "";
    detectedCodes = [];
    selectedCodeIndex = 0;
    renderResults();
    statusEl.textContent = "Đang quét video tự động...";

    try {
        const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0;
        const frameCount = duration > 0 ? Math.min(20, Math.max(8, Math.floor(duration * 2))) : 8;
        const foundSet = new Set();

        for (let index = 0; index < frameCount; index += 1) {
            const position = duration > 0 ? Math.min(duration, (index / Math.max(1, frameCount - 1)) * duration) : 0;
            await seekVideo(position);
            const codes = await scanCurrentFrame();
            codes.forEach((code) => foundSet.add(code));

            const progress = Math.round(((index + 1) / frameCount) * 100);
            progressEl.value = progress;
            statusEl.textContent = `Quét tự động: ${index + 1}/${frameCount} khung hình • ${progress}%`;
        }

        detectedCodes = normalizeResults(Array.from(foundSet));
        renderResults();

        if (detectedCodes.length === 0) {
            statusEl.textContent = "Quét hoàn tất - chưa tìm thấy mã phù hợp.";
        } else {
            statusEl.textContent = `Quét hoàn tất - tìm thấy ${detectedCodes.length} mã.`;
        }
    } catch (error) {
        resultEl.value = `Lỗi khi quét mã: ${error.message}`;
        statusEl.textContent = "Quét thất bại.";
    } finally {
        progressEl.value = 100;
        scanBtn.disabled = false;
        clearBtn.disabled = false;
        scanBtn.textContent = "Quét lại";
        scanInProgress = false;
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
    const sourceWidth = videoEl.videoWidth || 1280;
    const sourceHeight = videoEl.videoHeight || 720;
    const width = Math.min(1200, sourceWidth);
    const height = Math.round((width / sourceWidth) * sourceHeight);

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
            logger: (message) => {
                if (message.status === "recognizing text") {
                    statusEl.textContent = `Đang OCR: ${Math.round(message.progress * 100)}%`;
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
    const normalized = (text || "")
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    const tokens = normalized.split(/[^A-Za-z0-9._/-]+/).filter(Boolean);

    tokens.forEach((token) => {
        const code = token.trim();
        if (!code || code.length < 4 || code.length > 40) {
            return;
        }

        const hasLetter = /[A-Za-z]/.test(code);
        const hasDigit = /\d/.test(code);
        const looksLikeCode = (hasLetter && hasDigit) || code.includes("-") || code.includes("_") || code.includes("/");

        if (!looksLikeCode) {
            return;
        }

        if (/^(video|frame|ocr|scan|quét|mã|đơn|nhập|đây|là|tôi|bạn|openai)$/i.test(code)) {
            return;
        }

        results.add(code);
    });

    return Array.from(results);
}

function normalizeResults(codes) {
    const uniqueCodes = new Set();
    const normalized = [];

    codes.forEach((value) => {
        const code = sanitizeCode(value);
        if (!code) {
            return;
        }

        const key = code.toUpperCase();
        if (uniqueCodes.has(key)) {
            return;
        }

        uniqueCodes.add(key);
        normalized.push(code);
    });

    return normalized.sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));
}

function sanitizeCode(value) {
    const text = String(value || "").trim();
    if (!text) {
        return "";
    }

    const cleaned = text
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
        .replace(/[^A-Za-z0-9._/-]/g, "")
        .trim();

    if (!cleaned || cleaned.length < 4 || cleaned.length > 40) {
        return "";
    }

    if (!/[A-Za-z]/.test(cleaned) || !/\d/.test(cleaned)) {
        if (!/[-_/]/.test(cleaned)) {
            return "";
        }
    }

    if (/^(video|frame|ocr|scan|quét|mã|đơn|nhập|đây|là|tôi|bạn|openai)$/i.test(cleaned)) {
        return "";
    }

    return cleaned.toUpperCase();
}

function renderResults() {
    resultSummaryEl.textContent = detectedCodes.length
        ? `Đã tìm thấy ${detectedCodes.length} mã. Chọn một mục để xem chi tiết.`
        : "Chưa có mã nào được phát hiện.";

    if (!detectedCodes.length) {
        resultListEl.innerHTML = '<div class="empty-state">Chưa có mã phù hợp. Hãy thử video rõ nét hơn.</div>';
        resultEl.value = "";
        updateNavigation();
        clearQrPreview();
        selectedCodeEl.textContent = "Chọn một mã để xem chi tiết.";
        return;
    }

    if (selectedCodeIndex >= detectedCodes.length) {
        selectedCodeIndex = 0;
    }

    resultListEl.innerHTML = detectedCodes
        .map((code, index) => `<button type="button" class="code-chip ${index === selectedCodeIndex ? "active" : ""}" data-index="${index}">${code}</button>`)
        .join("");

    resultEl.value = detectedCodes.join("\n");
    resultListEl.querySelectorAll(".code-chip").forEach((button) => {
        button.addEventListener("click", () => {
            selectedCodeIndex = Number(button.dataset.index);
            renderResults();
        });
    });

    updateNavigation();
    renderQrPreview(detectedCodes[selectedCodeIndex]);
    selectedCodeEl.textContent = `Đang chọn: ${detectedCodes[selectedCodeIndex]}`;
}

function updateNavigation() {
    currentIndexEl.textContent = detectedCodes.length ? `${selectedCodeIndex + 1} / ${detectedCodes.length}` : "0 / 0";
    prevBtn.disabled = detectedCodes.length <= 1;
    nextBtn.disabled = detectedCodes.length <= 1;
}

function selectCode(step) {
    if (!detectedCodes.length) {
        return;
    }

    selectedCodeIndex = (selectedCodeIndex + step + detectedCodes.length) % detectedCodes.length;
    renderResults();
}

function clearResults(options = {}) {
    detectedCodes = [];
    selectedCodeIndex = 0;
    resultEl.value = "";
    resultListEl.innerHTML = '<div class="empty-state">Kết quả sẽ xuất hiện ở đây.</div>';
    resultSummaryEl.textContent = "Chưa có mã nào được phát hiện.";
    currentIndexEl.textContent = "0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    selectedCodeEl.textContent = "Chọn một mã để xem chi tiết.";
    clearQrPreview();

    if (!options.keepStatus) {
        statusEl.textContent = "Đã xóa kết quả.";
    }
}

function clearQrPreview() {
    const context = qrCanvas.getContext("2d");
    context.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
}

function renderQrPreview(code) {
    if (!code) {
        clearQrPreview();
        return;
    }

    try {
        QRCode.toCanvas(qrCanvas, code, { width: 260, margin: 2, color: { dark: "#10233f", light: "#ffffff" } });
    } catch (error) {
        console.warn("Không thể tạo QR preview:", error);
        clearQrPreview();
    }
}

async function copyResults() {
    if (!detectedCodes.length) {
        alert("Chưa có mã nào để sao chép.");
        return;
    }

    const text = detectedCodes.join("\n");
    try {
        await navigator.clipboard.writeText(text);
        statusEl.textContent = "Đã sao chép danh sách mã.";
    } catch (error) {
        resultEl.select();
        document.execCommand("copy");
        statusEl.textContent = "Đã sao chép bằng cách dự phòng.";
    }
}

function exportResults() {
    if (!detectedCodes.length) {
        alert("Chưa có mã để xuất.");
        return;
    }

    const text = detectedCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ket-qua-check-madon.txt";
    link.click();
    URL.revokeObjectURL(url);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateSupportBadge() {
    if (typeof window.BarcodeDetector !== "undefined") {
        supportBadgeEl.textContent = "BarcodeDetector: có";
    } else {
        supportBadgeEl.textContent = "BarcodeDetector: không hỗ trợ";
    }
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
        return callOpenAi(prompt);
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
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Bạn là trợ lý AI cho ứng dụng Check Mã Đơn. Hỗ trợ người dùng tiếng Việt." },
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
        return "Tôi có thể hướng dẫn bạn sử dụng chức năng quét: chọn video rồi nhấn 'Bắt đầu quét'. Ứng dụng sẽ tự động đọc khung hình và gom mã vào danh sách.";
    }

    if (lower.includes("qr")) {
        return "Phần QR Preview sẽ hiển thị mã được chọn để bạn tiện theo dõi. Bạn cũng có thể sao chép hoặc xuất toàn bộ kết quả ra file txt.";
    }

    if (lower.includes("mã đơn") || lower.includes("đơn")) {
        return "Ứng dụng này giúp bạn kiểm tra và quét mã đơn từ video. Hãy chọn video, nhấn quét và xem danh sách mã được phát hiện.";
    }

    if (lower.includes("ai")) {
        return "Tôi là trợ lý AI nội bộ của Check Mã Đơn. Bạn có thể hỏi tôi cách dùng trang, cách tối ưu quét video hoặc cách xử lý kết quả.";
    }

    return "Đây là trợ lý AI nội bộ của Check Mã Đơn. Hãy hỏi tôi về quét mã, video, QR hoặc cách dùng ứng dụng.";
}
