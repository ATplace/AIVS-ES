// 用法：node tools/shot.mjs <url> <out.png> [width] [fullPage=1]
// 選用環境變數 LS_JSON='{"key":"value",...}' 會在載入前寫入 localStorage (例如後台登入 token)
import { chromium } from "playwright";
const [url, out, w = "1280", full = "1"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: Number(w), height: 900 }, deviceScaleFactor: 1 });
if (process.env.LS_JSON) {
  const entries = Object.entries(JSON.parse(process.env.LS_JSON));
  await page.addInitScript((es) => { for (const [k, v] of es) localStorage.setItem(k, v); }, entries);
}
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(`saved ${out}`);
if (errors.length) console.log("console errors:\n" + errors.slice(0, 10).join("\n"));
await browser.close();
