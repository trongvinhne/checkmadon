const video = document.getElementById("video");
const input = document.getElementById("videoInput");
const button = document.getElementById("scanButton");
const status = document.getElementById("status");
const result = document.getElementById("result");

input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    video.src = URL.createObjectURL(file);
};

button.onclick = async () => {
status.innerHTML = "Đã bấm nút Quét mã";
alert("Đã bấm nút Quét mã");

    if (!video.src) {
        alert("Hãy chọn video");
        return;
    }

    await video.play();
    video.pause();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let frames = [];

    const step = 0.5;

    for (let t = 0; t < video.duration; t += step) {

        video.currentTime = t;

        await new Promise(resolve => {

            video.onseeked = resolve;

        });

        ctx.drawImage(video,0,0);

        frames.push(canvas.toDataURL("image/jpeg"));

        status.innerHTML =
        "Đang đọc video: " +
        Math.round(t/video.duration*100)
        +"%";

    }

    status.innerHTML =
    "Đã lấy "
    +frames.length+
    " khung hình";

    result.innerHTML =
    "<b>Sẵn sàng OCR...</b>";

    console.log(frames);

};