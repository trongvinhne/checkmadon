const videoInput = document.getElementById("videoInput");
const video = document.getElementById("video");
const scanBtn = document.getElementById("scanBtn");
const status = document.getElementById("status");
const progress = document.getElementById("progress");

let frames = [];

videoInput.addEventListener("change", () => {
    const file = videoInput.files[0];

    if (!file) return;

    video.src = URL.createObjectURL(file);

    status.textContent = "Đã chọn video.";
    progress.value = 0;

    frames = [];
});

scanBtn.addEventListener("click", async () => {

    if (!video.src) {
        alert("Hãy chọn video trước.");
        return;
    }

    status.textContent = "Đang lấy khung hình...";

    progress.value = 0;

    await extractFrames();

});

async function extractFrames() {

    frames = [];

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const duration = video.duration;

    const step = 0.5;

    for (let t = 0; t < duration; t += step) {

        await seekVideo(t);

        ctx.drawImage(video,0,0);

        frames.push(canvas.toDataURL("image/jpeg",0.8));

        progress.value = (t / duration) * 100;

        status.textContent =
            "Đã lấy " + frames.length + " khung hình";

    }

    progress.value = 100;

    status.textContent =
        "Hoàn thành.\nTổng khung hình: " + frames.length;

    console.log(frames);

}

function seekVideo(time){

    return new Promise(resolve=>{

        video.currentTime=time;

        video.onseeked=()=>resolve();

    });

}