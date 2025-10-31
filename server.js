const http = require("http");
const express = require("express");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const bodyParser = require("body-parser");
const fetch = require ("node-fetch");

const app = express();
const USER_DIR = path.join(__dirname, "user");

const port = process.env.PORT || 4000

// ==============================
// 📁 Tạo thư mục user nếu chưa có
// ==============================
fsp.mkdir(USER_DIR, { recursive: true })
  .then(() => console.log("📂 Đã kiểm tra"))
  .catch(err => console.error("❌ Không thể tạo ", err));

// ==============================
// ⚙️ Middleware
// ==============================
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());



let cachedHtml = "";
let lastFetched = 0;
const CACHE_DURATION = 60 * 1000; // 1 phút

app.get("/get/html", async (req, res) => {
  const now = Date.now();

  // Nếu cache còn hiệu lực, trả HTML cached
  if (cachedHtml && now - lastFetched < CACHE_DURATION) {
    return res.send(cachedHtml);
  }

  try {
    const githubUrl = "https://raw.githubusercontent.com/Jj87-huy/skillfoger/main/index.html";
    const response = await fetch(githubUrl);
    let html = await response.text();

    // ==== Chỉnh sửa HTML trước khi gửi client ====
    html = html.replace(
      "<h1>Xin chào!</h1>",
      "<h1>Chào mừng bạn đến trang đã chỉnh sửa!</h1>"
    );

    html = html.replace(
      "<p>Nội dung gốc từ GitHub.</p>",
      "<p>Nội dung này đã được server sửa trước khi gửi client.</p>"
    );
    // ============================================

    // Cache HTML
    cachedHtml = html;
    lastFetched = now;

    // Cho phép client từ domain khác fetch
    res.set("Access-Control-Allow-Origin", "*");
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi fetch HTML từ GitHub");
  }
});

// ==============================
// 🧩 Route gốc — It works! (chuẩn Vietnix)
// ==============================
app.get("/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  const message = "It works!\n";
  const version = "NodeJS " + process.versions.node + "\n";
  const response = [message, version].join("\n");
  res.end(response);
});

// ==============================
// 📄 API: Đăng ký tài khoản
// ==============================
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, name, role, position } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Thiếu thông tin đăng ký" });

    const userId = "id-" + Math.random().toString(36).substring(2, 8);
    const filePath = path.join(USER_DIR, `${userId}.json`);

    const userData = {
      _id: userId,
      username,
      password,
      profile: {
        name: name || username,
        role: role || "free",
        position: position || "Student",
        avatar: { link: "", file: "" },
        account_create_time: new Date().toLocaleString("vi-VN"),
        mail: { email: "", verification: false },
        phone: { number: "", verification: false },
        account_link: { Google: {}, Discord: {} },
      },
      settings: { theme: "dark", language: "vi-vn" },
    };

    await fsp.writeFile(filePath, JSON.stringify(userData, null, 2), "utf8");
    console.log(`✅ Đã tạo tài khoản mới: ${filePath}`);
    res.json({ success: true, id: userId });
  } catch (err) {
    console.error("❌ Lỗi tạo user:", err);
    res.status(500).json({ error: "Không thể tạo tài khoản" });
  }
});

// ==============================
// 📄 API: Đăng nhập
// ==============================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const files = await fsp.readdir(USER_DIR);
    for (const file of files) {
      const data = JSON.parse(await fsp.readFile(path.join(USER_DIR, file), "utf8"));
      if (data.profile.mail.email === email && data.password === password) {
        return res.json({ success: true, user: data });
      }
    }
    res.json({ success: false, message: "Sai email hoặc mật khẩu!" });
  } catch (err) {
    console.error("❌ Lỗi login:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ!" });
  }
});

// ==============================
// 📄 API: Lấy thông tin user
// ==============================
app.get("/api/user/:id", async (req, res) => {
  try {
    const file = path.join(USER_DIR, `${req.params.id}.json`);
    const data = await fsp.readFile(file, "utf8");
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: "Không tìm thấy người dùng." });
  }
});

// ==============================
// 🚀 Tạo HTTP Server (chuẩn Vietnix)
// ==============================
const server = http.createServer(app);
server.listen(port, () => {
  console.log("✅ Server Node (Express)đã chạy");
});
