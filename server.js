// Cento Maze — tiny server: serves the page and proxies Pangram (keeps the API key off the browser).
// Run:  PANGRAM_API_KEY=your-key node server.js   then open http://localhost:3000
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const KEY = process.env.PANGRAM_API_KEY || "";
const BASE = "https://text.external-api.pangram.com";
const MODEL = process.env.PANGRAM_MODEL || ""; // optional, e.g. "pangram-4"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pangramScore(text) {
  if (!KEY) return { error: "No PANGRAM_API_KEY set on the server." };
  const body = { text };
  if (MODEL) body.model = MODEL;
  const start = await fetch(`${BASE}/task`, {
    method: "POST",
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const s = await start.json().catch(() => ({}));
  if (!start.ok || !s.task_id) return { error: `Pangram start failed (${start.status}): ${JSON.stringify(s).slice(0, 300)}` };

  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    const r = await fetch(`${BASE}/task/${s.task_id}`, { headers: { "x-api-key": KEY } });
    const j = await r.json().catch(() => ({}));
    if (j.stage === "STAGE_SUCCESS") {
      return {
        fraction_ai: j.fraction_ai,
        fraction_ai_assisted: j.fraction_ai_assisted,
        fraction_human: j.fraction_human,
        prediction_short: j.prediction_short,
        headline: j.headline,
        prediction: j.prediction,
      };
    }
    if (j.stage === "STAGE_FAILED") return { error: `Pangram failed: ${JSON.stringify(j).slice(0, 300)}` };
  }
  return { error: "Pangram timed out." };
}

// Fully AI-written poem via the Claude Code CLI (uses CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`,
// or ANTHROPIC_API_KEY, from the environment).
const { spawn } = require("child_process");
function aiPoem(first, words) {
  const n = Math.max(20, Math.min(120, words | 0));
  const prompt = `Write an original poem of about ${n} words. The very first word of the poem must be "${first}". ` +
    `Use line breaks. Output only the poem: no title, no quotes, no commentary.`;
  return new Promise((resolve) => {
    const p = spawn("claude", ["-p", prompt, "--model", process.env.CLAUDE_MODEL || "sonnet"], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill(); resolve({ error: "Claude timed out." }); }, 90000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { clearTimeout(timer); resolve({ error: "Couldn't run the claude CLI: " + e.message }); });
    p.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      if (code !== 0 || !text || /not logged in/i.test(text)) return resolve({ error: (text || err || "claude exited " + code).slice(0, 300) + " (set CLAUDE_CODE_OAUTH_TOKEN before starting the server)" });
      resolve({ poem: text });
    });
  });
}

function readJSON(req) {
  return new Promise((resolve) => { let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } }); });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/poem") {
    const { first, words } = await readJSON(req);
    const out = await aiPoem(String(first || "").replace(/[^\p{L}'’-]/gu, "").slice(0, 30) || "light", words);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(out));
  }
  if (req.method === "POST" && req.url === "/api/score") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try {
        const { text } = JSON.parse(raw || "{}");
        const out = await pangramScore(String(text || ""));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }
  const file = req.url === "/" ? "index.html" : req.url.split("?")[0].replace(/^\/+/, "");
  const p = path.join(__dirname, "public", path.normalize(file));
  if (!p.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const type = p.endsWith(".html") ? "text/html" : p.endsWith(".js") ? "text/javascript" : p.endsWith(".css") ? "text/css" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const claudeAuth = process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  console.log(`Cento Maze on http://localhost:${PORT}  (Pangram key ${KEY ? "loaded" : "MISSING"}, Claude token ${claudeAuth ? "loaded" : "MISSING"})`);
});
