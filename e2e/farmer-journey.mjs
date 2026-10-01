import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1680, height: 1000 } });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
const step = async (n,m,f) => { process.stdout.write(`${n}. ${m} ... `); await f(); console.log("OK"); };

await step(1, "Sign in as the farmer", async () => {
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.click("text=Farmer");
  await p.click('button[type="submit"]');
  await p.waitForSelector("text=Agricultural digital twin", { timeout: 20000 });
  await p.waitForSelector(".cvx-pin", { timeout: 20000 });
});

await step(2, "Open the Yıldız farm", async () => {
  await p.click("text=Yıldız Tarım");
  await p.waitForTimeout(2500);
});

let before;
await step(3, "Record the current section count", async () => {
  await p.click('button[role="tab"]:has-text("sections")');
  await p.waitForTimeout(600);
  before = await p.locator("aside").last().innerText();
  const m = before.match(/Section [A-Z]/g);
  console.log(`\n     currently ${new Set(m).size} sections`);
  process.stdout.write("     ");
});

await step(4, "Divide into 9 sections", async () => {
  await p.click('button[role="tab"]:has-text("divide")');
  await p.waitForSelector("text=Number of sections");
  await p.fill('#section-count', "9");
  await p.click("text=Preview division");
  await p.waitForSelector("text=/Preview · 9 sections/", { timeout: 30000 });
});

await step(5, "Invariant chips all green", async () => {
  const t = await p.locator("aside").last().innerText();
  for (const chip of ["area conserved", "no overlap", "within tolerance"]) {
    if (!t.includes(chip)) throw new Error(`missing chip ${chip}`);
  }
  if (t.includes("✕")) throw new Error("an invariant failed");
});

await step(6, "Preview renders on the map", async () => {
  const n = await p.locator("path.cvx-section").count();
  if (n < 9) throw new Error(`expected 9 preview polygons, got ${n}`);
  await p.screenshot({ path: "/tmp/shots/divide.png" });
});

await step(7, "Assign a different crop to Section A", async () => {
  const selects = p.locator('aside').last().locator('button[role="combobox"]');
  await selects.first().click();
  await p.waitForTimeout(400);
  await p.locator('[role="option"]').nth(3).click();
  await p.waitForTimeout(500);
});

await step(8, "Save the layout", async () => {
  await p.click("text=Save layout");
  await p.waitForSelector("text=/Saved 9 sections/", { timeout: 30000 });
});

await step(9, "RELOAD THE BROWSER — layout must survive", async () => {
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".cvx-pin", { timeout: 20000 });
  await p.click("text=Yıldız Tarım");
  await p.waitForTimeout(2500);
  await p.click('button[role="tab"]:has-text("sections")');
  await p.waitForTimeout(800);
  const after = await p.locator("aside").last().innerText();
  const labels = new Set(after.match(/Section [A-Z]/g) ?? []);
  if (labels.size !== 9) throw new Error(`after reload expected 9 sections, found ${labels.size}`);
  const polys = await p.locator("path.cvx-section").count();
  if (polys < 9) throw new Error(`expected 9 polygons after reload, got ${polys}`);
  console.log(`\n     recovered ${labels.size} sections and ${polys} polygons after a full page reload`);
  process.stdout.write("     ");
  await p.screenshot({ path: "/tmp/shots/after-reload.png" });
});

await step(10, "Farmer can edit geometry (bank could not)", async () => {
  await p.click('button[role="tab"]:has-text("divide")');
  const t = await p.locator("aside").last().innerText();
  if (/owned by the farmer/i.test(t)) throw new Error("owner wrongly blocked from editing");
});

console.log("\npage errors:", errs.length);
errs.slice(0,4).forEach(e => console.log("  -", e.slice(0,140)));
await b.close();
