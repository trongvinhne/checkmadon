*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}

body{
    background:#f3f5f7;
    padding:20px;
}

.container{
    max-width:800px;
    margin:auto;
    background:#fff;
    border-radius:14px;
    padding:20px;
    box-shadow:0 8px 25px rgba(0,0,0,.08);
}

h1{
    text-align:center;
    margin-bottom:20px;
}

h2{
    margin-top:25px;
    margin-bottom:10px;
}

input[type=file]{
    width:100%;
    margin-bottom:15px;
}

video{
    width:100%;
    border-radius:10px;
    background:#000;
    margin-bottom:15px;
}

button{
    width:100%;
    padding:14px;
    border:none;
    border-radius:10px;
    background:#0d6efd;
    color:#fff;
    font-size:16px;
    font-weight:600;
    cursor:pointer;
    margin-top:10px;
}

button:disabled{
    opacity:.5;
    cursor:not-allowed;
}

#status{
    margin-top:15px;
    font-weight:bold;
    color:#444;
    white-space:pre-line;
}

progress{
    width:100%;
    height:20px;
    margin-top:15px;
}

textarea{
    width:100%;
    resize:vertical;
    min-height:220px;
    padding:12px;
    border:1px solid #ddd;
    border-radius:10px;
    font-size:15px;
}

#qrCanvas{
    display:block;
    margin:20px auto;
    max-width:260px;
}

.nav{
    display:flex;
    gap:10px;
    align-items:center;
    justify-content:center;
    margin-top:15px;
}

.nav button{
    width:auto;
    padding:10px 18px;
}

#currentIndex{
    min-width:80px;
    text-align:center;
    font-weight:bold;
}