import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(String(e)));

const step = async (n, msg, fn) => { process.stdout.write(`${n}. ${msg} ... `); try { await fn(); console.log("OK"); } catch (e) { console.log("FAIL:", String(e).split("\n")[0].slice(0,120)); throw e; } };

await step(1, "Sign-in screen loads", async () => {
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForSelector("text=ClimaVex");
  await page.screenshot({ path: "/tmp/shots/1-signin.png" });
});

await step(2, "Sign in as the bank analyst", async () => {
  await page.click("text=Bank analyst");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Agricultural digital twin", { timeout: 20000 });
});

await step(3, "Map workspace renders with tiles and farms", async () => {
  await page.waitForSelector(".leaflet-container", { timeout: 20000 });
  await page.waitForSelector(".cvx-pin", { timeout: 20000 });
  await page.waitForTimeout(2500);
  const pins = await page.locator(".cvx-pin").count();
  if (pins < 4) throw new Error(`expected >=4 farm pins, got ${pins}`);
});

await step(4, "AI status banner is present", async () => {
  await page.waitForSelector("text=/AI model (connected|not connected|unreachable)/");
});

await step(5, "Farm list shows all demo farms with dekar areas", async () => {
  const txt = await page.locator("aside").first().innerText();
  for (const f of ["Yıldız", "Demir", "Ova", "Geniş"]) if (!txt.includes(f)) throw new Error(`missing ${f}`);
  if (!txt.includes("dekar")) throw new Error("no dekar unit shown");
});

await step(6, "Select a farm and zoom to it", async () => {
  await page.click("text=Yıldız Tarım");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/shots/2-workspace.png" });
});

await step(7, "Crop sections render on the map", async () => {
  const paths = await page.locator("path.cvx-section").count();
  if (paths < 4) throw new Error(`expected crop section polygons, got ${paths}`);
});

await step(8, "Cadastral reference shown in full form", async () => {
  await page.waitForSelector("text=/Konya \\/ Çumra \\/ .* \\/ 463:21/");
});

await step(9, "Risk score calculates", async () => {
  await page.click("text=Calculate risk score");
  await page.waitForSelector("text=Contributing factors", { timeout: 25000 });
  const panel = await page.locator("aside").last().innerText();
  if (!/Crop-mix concentration/i.test(panel)) throw new Error("factors missing");
  if (!/retains the credit decision/i.test(panel)) throw new Error("decision note missing");
  await page.screenshot({ path: "/tmp/shots/3-risk.png" });
});

await step(10, "Finance tab shows the three distinct measures and the 120,000 gap", async () => {
  await page.click('button[role="tab"]:has-text("finance")');
  await page.waitForSelector("text=Credit exposure");
  // Labels are CSS-uppercased, so compare case-insensitively.
  const t = (await page.locator("aside").last().innerText()).toLowerCase();
  for (const s of ["credit exposure", "simulated shortfall", "actual credit loss"]) if (!t.includes(s)) throw new Error(`missing measure: ${s}`);
  if (!/120[.,]000/.test(t)) throw new Error("expected the TL120,000 shortfall");
  await page.screenshot({ path: "/tmp/shots/4-finance.png" });
});

await step(11, "Season timeline is interactive", async () => {
  const slider = page.locator('[role="slider"]').first();
  await slider.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
});

await step(12, "Scenario tab runs a weather replay", async () => {
  await page.click('button[role="tab"]:has-text("scenario")');
  await page.waitForSelector("text=Historical weather replay");
  await page.click("text=Run weather replay");
  await page.waitForSelector("text=Baseline gap", { timeout: 40000 });
  const t = await page.locator("aside").last().innerText();
  if (!/Demo weather scenario/i.test(t)) throw new Error("weather provenance label missing");
  if (!/does not reduce the gap/i.test(t)) throw new Error("payout-timing warning missing");
  await page.screenshot({ path: "/tmp/shots/5-scenario.png", fullPage: false });
});

await step(13, "Divide tab refuses geometry edits for a bank user", async () => {
  await page.click('button[role="tab"]:has-text("divide")');
  await page.waitForSelector("text=/owned by the farmer/i");
});

await step(14, "No horizontal page scroll at 1600px", async () => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (over) throw new Error("horizontal overflow");
});

console.log("\nconsole errors:", errors.length);
errors.slice(0, 6).forEach(e => console.log("  -", e.slice(0, 150)));
await browser.close();
