// Ağsız duman testi: API anahtarı ve gerçek ağ isteği olmadan tüm src/*.mjs modüllerinin
// yüklenmesini ve temel akışları (images, insights, render) doğrular.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { MockAgent } from "undici";

// Modüller import anında .env'den gerçek anahtar çekmesin veya eksik env yüzünden çökmesin
const DUMMY_ENV = {
  ANTHROPIC_API_KEY: "smoke-test-anthropic-key",
  GEMINI_API_KEY: "",
  PEXELS_API_KEY: "",
  PIXABAY_API_KEY: "smoke-test-pixabay-key",
  IG_USER_ID: "000000000000000",
  IG_ACCESS_TOKEN: "smoke-test-ig-token",
  IG_DISCOVERY_TOKEN: "",
  GH_TOKEN: "smoke-test-gh-token",
  GH_REPO: "smoke-test/repo",
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",
  NTFY_TOPIC: "",
  CALENDAR_URL: "",
};
for (const [k, v] of Object.entries(DUMMY_ENV)) process.env[k] = v;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
// Yalnızca botun (run.mjs) içe aktardığı kütüphane modülleri yüklenir. src/ altındaki tek başına çalışan araç betikleri
// (check.mjs, container-test.mjs, render-test.mjs, profil kiti vb.) içe aktarılınca ağa çıkıyor ya da dosya üretiyor (Claude incelemesi).
const RUN_IMPORTS = new Set([...fs.readFileSync(path.join(SRC_DIR, "run.mjs"), "utf8").matchAll(/from "\.\/([a-z0-9-]+\.mjs)"/g)].map((m) => m[1]));
const SKIP = { has: (f) => !RUN_IMPORTS.has(f) };

const origFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = typeof input === "string" ? input : input?.url ?? String(input);
  if (url.startsWith("https://pixabay.com/api/")) {
    return new Response(JSON.stringify({
      total: 1,
      totalHits: 1,
      hits: [
        {
          id: 987654,
          largeImageURL: "https://cdn.pixabay.com/photo/smoke-test.png",
          tags: "protein smoothie nutrition healthy food bowl",
        },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (url.startsWith("https://api.openverse.org/")) {
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error(`ağsız duman testinde beklenmeyen ağ isteği: ${url}`);
};

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`FAIL [${name}]: ${e?.message ?? e}`);
  }
}

let mockAgent = null;
let safeNetMod = null;
let origDispatch = null;

try {
  const modFiles = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".mjs") && !SKIP.has(f)).sort();
  const mods = new Map();

  for (const f of modFiles) {
    await check(`import src/${f}`, async () => {
      const mod = await import(pathToFileURL(path.join(SRC_DIR, f)).href);
      mods.set(f, mod);
    });
  }

  // 1) images.mjs: sahte Pixabay JSON + sahte görsel indirmesi (ağa çıkmadan)
  await check("images.mjs findImages (Pixabay)", async () => {
    const imagesMod = mods.get("images.mjs");
    safeNetMod = mods.get("safe-net.mjs");
    if (!imagesMod || !safeNetMod) throw new Error("images.mjs veya safe-net.mjs yüklenemedi");

    // download() >20000 bayt ve >=400px genişlik ister; sıkıştırmasız 420x525 PNG (~660 KB)
    const fakeImg = await sharp({
      create: { width: 420, height: 525, channels: 3, background: { r: 30, g: 60, b: 90 } },
    }).png({ compressionLevel: 0 }).toBuffer();

    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    mockAgent
      .get("https://cdn.pixabay.com")
      .intercept({ path: "/photo/smoke-test.png", method: "GET" })
      .reply(200, fakeImg, {
        headers: { "content-type": "image/png", "content-length": String(fakeImg.length) },
      })
      .persist();

    origDispatch = safeNetMod.SAFE_AGENT.dispatch.bind(safeNetMod.SAFE_AGENT);
    safeNetMod.SAFE_AGENT.dispatch = (opts, handler) => mockAgent.dispatch(opts, handler);

    process.env.PEXELS_API_KEY = "";
    process.env.PIXABAY_API_KEY = "smoke-test-pixabay-key";

    const res = await imagesMod.findImages(
      ["protein smoothie"],
      1,
      "bilim",
      new Set(),
      "Sporcularda protein ve beslenme",
    );
    if (!Array.isArray(res) || res.length < 1) {
      throw new Error(`en az 1 sonuç beklendi, gelen: ${res?.length ?? 0}`);
    }
    if (!String(res[0].id ?? "").startsWith("pixabay:")) {
      throw new Error(`id "pixabay:" ile başlamalı, gelen: ${res[0].id}`);
    }
    if (!Buffer.isBuffer(res[0].buf) || res[0].buf.length <= 20000) {
      throw new Error("geçerli görsel tamponu dönmedi");
    }
  });

  // 2) insights.mjs: weeklySummary örnek state ile özet üretir
  await check("insights.mjs weeklySummary", async () => {
    const insightsMod = mods.get("insights.mjs");
    if (!insightsMod) throw new Error("insights.mjs yüklenemedi");
    const now = Date.now();
    const state = {
      posts: [
        { media: "m1", kind: "haber", headline: "HYROX İstanbul duyuruldu", at: new Date(now - 6 * 36e5).toISOString(), ins: { reach: 4200, likes: 180, comments: 14, saved: 55, shares: 30 } },
        { media: "m2", kind: "bilgi", headline: "Sporcularda protein zamanlaması", at: new Date(now - 30 * 36e5).toISOString(), ins: { reach: 6800, likes: 240, comments: 22, saved: 120, shares: 48 } },
        { media: "m3", kind: "duyuru", headline: "Eurasia Throwdown kayıtları açıldı", at: new Date(now - 54 * 36e5).toISOString(), ins: { reach: 3100, likes: 110, comments: 8, saved: 25, shares: 15 } },
      ],
    };
    const summary = insightsMod.weeklySummary(state);
    if (typeof summary !== "string" || !summary.includes("Haftalık etkileşim özeti (3 post)")) {
      throw new Error("özet başlığı üretilemedi");
    }
    if (!summary.includes("1. Sporcularda protein zamanlaması")) {
      throw new Error("en yüksek skorlu post ilk sırada değil");
    }
    if (insightsMod.weeklySummary({ posts: [] }) !== "") {
      throw new Error("yetersiz veride boş string dönmeli");
    }
  });

  // 3) render.mjs: repo içi fontlarla 1 kapak slaytı çizimi
  await check("render.mjs renderSlide (kapak)", async () => {
    const renderMod = mods.get("render.mjs");
    if (!renderMod) throw new Error("render.mjs yüklenemedi");
    const jpeg = await renderMod.renderSlide(
      {
        type: "cover",
        kicker: "Duman testi",
        title: "HYROX İstanbul kayıtları açıldı",
        hl: "HYROX İstanbul",
        subtitle: "Ağsız kapak render kontrolü.",
      },
      {
        cat: "hyrox",
        index: 1,
        total: 1,
        date: "24 KASIM 2026",
        location: "Türkiye · İstanbul",
        photo: null,
        eventLogo: null,
      },
    );
    if (!Buffer.isBuffer(jpeg) || jpeg.length < 10000) {
      throw new Error(`kapak JPEG üretilemedi (boyut: ${jpeg?.length ?? 0})`);
    }
    const meta = await sharp(jpeg).metadata();
    if (meta.format !== "jpeg" || meta.width !== 1080 || meta.height !== 1350) {
      throw new Error(`beklenmeyen kapak biçimi: ${meta.format} ${meta.width}x${meta.height}`);
    }
  });
} finally {
  if (safeNetMod && origDispatch) safeNetMod.SAFE_AGENT.dispatch = origDispatch;
  globalThis.fetch = origFetch;
  if (mockAgent) await mockAgent.close().catch(() => {});
  if (safeNetMod?.SAFE_AGENT) await safeNetMod.SAFE_AGENT.close().catch(() => {});
}

const total = passed + failed;
if (failed > 0) {
  console.error(`duman testi: ${passed}/${total} geçti, ${failed} kaldı`);
  process.exit(1);
}
console.log(`duman testi: ${passed}/${total} geçti`);
