import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json());

// Cache HTML GitHub
let cachedHtml = "";
let lastFetched = 0;
const CACHE_DURATION = 60 * 1000; // 1 phút

app.get("/get/html", async (req, res) => {
  const now = Date.now();
  if (cachedHtml && now - lastFetched < CACHE_DURATION) return res.send(cachedHtml);

  try {
    const githubUrl = "https://raw.githubusercontent.com/Jj87-huy/skillfoger/main/index.html";
    const response = await fetch(githubUrl, {
      headers: { "User-Agent": "SkillFoger-Server" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let html = await response.text();

    // Chỉnh sửa nội dung trước khi gửi client
    html = html.replace(
      "<h1>Xin chào!</h1>",
      "<h1>Chào mừng bạn đến trang đã chỉnh sửa!</h1>"
    ).replace(
      "<p>Nội dung gốc từ GitHub.</p>",
      "<p>Nội dung này đã được server sửa trước khi gửi client.</p>"
    );

    cachedHtml = html;
    lastFetched = now;

    res.set("Access-Control-Allow-Origin", "*");
    res.send(html);

  } catch (err) {
    console.error("❌ Lỗi fetch HTML:", err);
    res.status(500).send("Lỗi fetch HTML từ GitHub");
  }
});

// Route gốc
app.get("/", (req, res) => res.send(`It works!\nNodeJS ${process.version}`));

// Start server
app.listen(PORT, () => console.log(`✅ Server Node.js chạy trên port ${PORT}`));
