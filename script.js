const videoInput = document.getElementById("videoInput");
const video = document.getElementById("video");

videoInput.addEventListener("change", function () {

const file = this.files[0];

if(!file) return;

video.src = URL.createObjectURL(file);

video.style.display = "block";

});