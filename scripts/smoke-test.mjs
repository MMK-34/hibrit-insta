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
const ghCalls = [];
globalThis.fetch = async (input, init) => {
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
  if (url.startsWith("https://api.github.com/repos/smoke-test/repo/issues")) {
    ghCalls.push({ method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(init.body) : null });
    if ((init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{ number: 1, title: "Bot raporları (otomatik)", user: { login: "smoke-test" } }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { "content-type": "application/json" } });
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

  // 4) countdown.mjs: Türkçe büyük harf eşleşmesi (İSTANBUL YARI MARATONU, BODRUM YARI MARATONU, HYROX İZMİR)
  await check("countdown.mjs isBigRace (Türkçe büyük harf)", async () => {
    const cdMod = mods.get("countdown.mjs");
    if (!cdMod?.isBigRace) throw new Error("isBigRace dışa aktarılmamış");
    for (const nm of ["İSTANBUL YARI MARATONU", "BODRUM YARI MARATONU", "HYROX İZMİR", "Runtalya 2027"]) {
      if (!cdMod.isBigRace(nm)) throw new Error(`büyük yarış eşleşmedi: ${nm}`);
    }
    if (cdMod.isBigRace("Küçük İlçe Halk Koşusu")) throw new Error("küçük koşu büyük yarış sayıldı");
  });

  // 5) collect.mjs: upcomingEvents salon içi (box/50%/simülasyon) kayıtlarını aday yapmaz
  await check("collect.mjs upcomingEvents (salon/50% filtresi)", async () => {
    const colMod = mods.get("collect.mjs");
    if (!colMod?.upcomingEvents) throw new Error("upcomingEvents yüklenemedi");
    const up = await colMod.upcomingEvents();
    const bad = up.filter((e) => /\bbox\b|simulation|simülasyon|in-?house|50%/i.test(e.title));
    if (bad.length) throw new Error(`salon/50% kaydı sızdı: ${bad.map((x) => x.title).join(", ")}`);
  });

  // 6) notify.mjs: issue #1 yönlendirme süzgeci (📈/⚠️/📊/🎬 yazar, ✅ yazmaz)
  await check("notify.mjs issue #1 yönlendirme", async () => {
    const notifyMod = mods.get("notify.mjs");
    if (!notifyMod?.notify) throw new Error("notify yüklenemedi");
    ghCalls.length = 0;
    await notifyMod.notify("✅ Paylaşıldı (test)");
    if (ghCalls.some((c) => c.method === "POST")) throw new Error("✅ bildirimi issue #1'e yazılmamalıydı");
    await notifyMod.notify("📈 Haftalık etkileşim özeti (test)");
    if (!ghCalls.some((c) => c.method === "POST" && c.url.endsWith("/issues/1/comments"))) {
      throw new Error("📈 bildirimi issue #1'e yazılmadı");
    }
  });

  // 7) event-match.mjs: sponsor ön ekli tekrar etkinlik eşleştirmesi (G14, pozitif + negatif senaryolar)
  await check("event-match.mjs sameEventMatch (G14 senaryoları)", async () => {
    const emMod = mods.get("event-match.mjs");
    if (!emMod?.sameEventMatch) throw new Error("sameEventMatch yüklenemedi");
    const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "event-match-fixtures.json"), "utf8"));
    const errs = [];
    for (const tc of fx.cases ?? []) {
      const got = Boolean(emMod.sameEventMatch(tc.postedEventName, tc.candidate));
      if (got !== Boolean(tc.expectMatch)) errs.push(`${tc.id}: beklenen ${tc.expectMatch}, gelen ${got}`);
    }
    if (errs.length) throw new Error(errs.join(" | "));
  });

  // 8) circle21.mjs: circle21Reference (ağsız sahte API yanıtı; circle21Events veriyi safeGet/SAFE_AGENT üzerinden çeker)
  await check("circle21.mjs circle21Reference (G15 senaryoları)", async () => {
    const c21Mod = mods.get("circle21.mjs");
    if (!c21Mod?.circle21Reference) throw new Error("circle21Reference yüklenemedi");
    if (!mockAgent) {
      safeNetMod = mods.get("safe-net.mjs");
      if (!safeNetMod) throw new Error("safe-net.mjs yüklenemedi");
      mockAgent = new MockAgent();
      mockAgent.disableNetConnect();
      origDispatch = safeNetMod.SAFE_AGENT.dispatch.bind(safeNetMod.SAFE_AGENT);
      safeNetMod.SAFE_AGENT.dispatch = (opts, handler) => mockAgent.dispatch(opts, handler);
    }
    const startIso = new Date(Date.now() + 5 * 864e5).toISOString();
    const endIso = new Date(Date.now() + 6 * 864e5).toISOString();
    const fakeEvents = [
      { id: "c21-vubox", name: "VU BOX Hybrid (HYROX-style) simulation", slug: "vu-box-hybrid-simulation", country: "TR", date_from: startIso, date_to: endIso, competition_address: "34340 Beşiktaş/İstanbul", onsite: true },
      { id: "c21-alsancak", name: "ALSANCAK TEAM SERIES 2026", slug: "alsancak-team-series-2026", country: "TR", date_from: startIso, date_to: endIso, competition_address: "35220 Konak/İzmir", onsite: true },
      { id: "c21-open", name: "Open Cup", slug: "open-cup", country: "TR", date_from: startIso, date_to: endIso, competition_address: "06510 Çankaya/Ankara", onsite: true },
      { id: "c21-kartal", name: "Kartal SİMÜLASYON", slug: "kartal-simulasyon", country: "TR", date_from: startIso, date_to: endIso, competition_address: "34710 Kadıköy/İstanbul", onsite: true },
    ];
    const c21Payload = Buffer.from(JSON.stringify({ data: fakeEvents }), "utf8");
    mockAgent
      .get("https://api.circle21.events")
      .intercept({ path: /^\/api\/competition/, method: "GET" })
      .reply(200, c21Payload, {
        headers: { "content-type": "application/json", "content-length": String(c21Payload.length) },
      })
      .persist();

    const r1 = await c21Mod.circle21Reference("PUMA Hybrid HYROX shoe");
    if (r1 !== null) throw new Error(`PUMA metni null dönmeliydi, gelen: ${r1?.event?.name}`);

    const r2 = await c21Mod.circle21Reference("Alsancak'ta CrossFit yarışı");
    if (r2?.event?.id !== "c21-alsancak" || r2?.event?.name !== "ALSANCAK TEAM SERIES 2026") {
      throw new Error(`Alsancak kaydı eşleşmedi, gelen: ${r2?.event?.name ?? "null"}`);
    }

    const r3 = await c21Mod.circle21Reference("Salon reopen CrossFit haberi");
    if (r3 !== null) throw new Error(`reopen metni Open kaydına bağlanmamalıydı, gelen: ${r3?.event?.name}`);

    const r4 = await c21Mod.circle21Reference("Kartal CrossFit yarışı");
    if (r4 !== null) throw new Error(`Kartal SİMÜLASYON referans olmamalıydı, gelen: ${r4?.event?.name}`);
  });

  // 9) brand.mjs: brandInText marka tespiti (G15 senaryoları)
  await check("brand.mjs brandInText (G15 senaryoları)", async () => {
    const brandMod = mods.get("brand.mjs");
    if (!brandMod?.brandInText) throw new Error("brandInText yüklenemedi");
    const cases = [
      ["kapak ASICS YENİ", { slides: [{ type: "cover", title: "ASICS YENİ" }] }, true],
      ["kapak NİKE", { slides: [{ type: "cover", title: "NİKE" }] }, true],
      ["caption Nike", { caption: "a\nNike b", slides: [] }, true],
      ["bullets GARMIN", { slides: [{ type: "list", bullets: ["GARMIN saat"] }] }, true],
      ["rows ROGUE FITNESS", { slides: [{ type: "table", rows: [["ROGUE FITNESS", "x"]] }] }, true],
      ["Rogue Echo Bike", { caption: "2027 yarı finallerinde Rogue Echo Bike zorunlu", slides: [] }, true],
      ["Echo Bike", { slides: [{ type: "cover", title: "Echo Bike ilk kez yarı finalde" }] }, true],
      ["SkiErg", { caption: "HYROX istasyonunda SkiErg rekoru", slides: [] }, true],
      ["Haley Brooks", { caption: "Haley Brooks kazandı", slides: [{ title: "Haley Brooks kazandı" }] }, false],
      ["Rogue Invitational", { caption: "Rogue Invitational", slides: [{ title: "Rogue Invitational" }] }, false],
      ["Decathlon rekoru", { caption: "Decathlon rekoru", slides: [{ title: "Decathlon rekoru" }] }, false],
      ["boş nesne", {}, false],
      ["kelime içi niketon", { caption: "Niketon koşusu" }, false],
    ];
    const errs = [];
    for (const [label, post, want] of cases) {
      const got = Boolean(brandMod.brandInText(post));
      if (got !== want) errs.push(`${label}: beklenen ${want}, gelen ${got}`);
    }
    if (errs.length) throw new Error(errs.join(" | "));
  });

  // 10) guard.mjs: stripCta çağrı cümlesi temizliği (kullanıcı kuralı 2026-11-25)
  await check("guard.mjs stripCta (çağrı cümlesi yok)", async () => {
    const g = mods.get("guard.mjs");
    if (!g?.stripCta) throw new Error("stripCta yüklenemedi");
    const cases = [
      ["Katılacak mısın?\nBirlikte yarışmak istediğin arkadaşına gönder.", "Katılacak mısın?"],
      ["Tanıdığın biri var mı? Ona gönder.", "Tanıdığın biri var mı?"],
      ["Salonunda Echo Bike var mı?\nYarı final hedefi olan arkadaşına gönder.", "Salonunda Echo Bike var mı?"],
      ["Hangisini seçerdin?\nYarış planın için kaydet.", "Hangisini seçerdin?"],
      ["Antrenmanı yapıp videoyla gönderiyorsun.", "Antrenmanı yapıp videoyla gönderiyorsun."],
      ["Yeni rekor kaydetti.\n\nNe düşünüyorsun?", "Yeni rekor kaydetti.\n\nNe düşünüyorsun?"],
      ["Paylaşım rekor kırdı.", "Paylaşım rekor kırdı."],
      // Antigravity CTA-inceleme itirazları
      ["Canlı sonuçları federasyon sitesinden takip edin. Kayıt 10 Nisan'da.\n\nHazır mısın?", "Canlı sonuçları federasyon sitesinden takip edin. Kayıt 10 Nisan'da.\n\nHazır mısın?"],
      ["Hazır mısın?\nArkadaşına gönder 👇", "Hazır mısın?"],
      ["Hazır mısın?\nPaylaşmayı unutma.", "Hazır mısın?"],
      ["Hazır mısın?\nBunu arkadaşlarına gönderebilirsin.", "Hazır mısın?"],
      ["Hazır mısın?\nTakipte kalın!", "Hazır mısın?"],
      ["Hazır mısın?\nGÖNDERİN.", "Hazır mısın?"],
      ["Tanıdığın biri var mı?Ona gönder.", "Tanıdığın biri var mı?"],
      ["A geldi.\nYarış arkadaşını etiketle.\nB geldi.", "A geldi.\nB geldi."],
      ["Mesafe 3.5 km. Kayıt açık.", "Mesafe 3.5 km. Kayıt açık."],
      ["Arkadaşına gönderdiği mesaj viral oldu.", "Arkadaşına gönderdiği mesaj viral oldu."],
    ];
    const errs = [];
    for (const [inp, want] of cases) { const got = g.stripCta(inp); if (got !== want) errs.push(`${JSON.stringify(inp)} -> ${JSON.stringify(got)}`); }
    if (errs.length) throw new Error(errs.join(" | "));
  });

  // 11) insights.mjs: collectInsights silinmiş IG postunu atlar ve sonrakileri günceller; token hatasında durur (G17)
  await check("insights.mjs collectInsights (silinmiş post atla, token hatasında dur)", async () => {
    const insightsMod = mods.get("insights.mjs");
    if (!insightsMod?.collectInsights) throw new Error("collectInsights yüklenemedi");
    const now = Date.now();
    const mk = (id, hrsAgo) => ({ media: id, kind: "haber", at: new Date(now - hrsAgo * 36e5).toISOString() });
    const st1 = { posts: [mk("m-ok-1", 72), mk("m-gone", 60), mk("m-ok-2", 30)] };
    const seen = [];
    const r1 = await insightsMod.collectInsights(st1, {
      fetchInsights: async (id) => {
        seen.push(id);
        if (id === "m-gone") throw new Error('IG m-gone: HTTP 400 {"message":"Unsupported get request. Object with ID \'m-gone\' does not exist","code":100,"error_subcode":33}');
        return { likes: 12, comments: 2, reach: 500 };
      },
    });
    if (r1.n !== 2 || r1.skipped !== 1 || r1.err !== "") throw new Error(`beklenen n=2 skipped=1 err="", gelen: ${JSON.stringify(r1)}`);
    if (!st1.posts[1].insMissing || !st1.posts[2].ins) throw new Error("silinmiş post işaretlenmedi veya sonraki post güncellenmedi");
    // İkinci turda insMissing olan post bir daha çağrılmaz
    seen.length = 0;
    st1.posts[2].ins.at = new Date(now - 25 * 36e5).toISOString();
    const r1b = await insightsMod.collectInsights(st1, { fetchInsights: async (id) => { seen.push(id); return { likes: 15, comments: 3 }; } });
    if (seen.includes("m-gone") || r1b.n !== 1) throw new Error(`insMissing tekrar çağrıldı: ${seen.join(",")}`);
    // Token/izin hatasında hemen durmalı
    const st2 = { posts: [mk("m-a", 48), mk("m-b", 36)] };
    const r2 = await insightsMod.collectInsights(st2, {
      fetchInsights: async () => { throw new Error('IG m-a: HTTP 401 {"code":190,"message":"Invalid OAuth access token"}'); },
    });
    if (r2.n !== 0 || !r2.err || st2.posts[0].insMissing || st2.posts[1].ins) throw new Error(`token hatasında durmadı: ${JSON.stringify(r2)}`);
  });

  // 12) followups.mjs: aynı yarış için ikinci kısa Reels engellenir (kullanıcı 2026-11-28, Wolf Haven iki kez çıktı)
  await check("followups.mjs shortRaceSame (aynı yarış farklı başlık)", async () => {
    const f = mods.get("followups.mjs");
    if (!f?.shortRaceSame) throw new Error("shortRaceSame yüklenemedi");
    const cases = [
      ["Wolf Haven Yarışması", "wolfhaven2event", true],
      ["Wolf Haven 2. Event", "wolfhavenyarismasigeliyor", true],
      ["Athens Throwdown 2027", "athensthrowdown2027", true],
      ["Athens Throwdown 2027", "wolfhaven2event", false],
      ["HYROX İstanbul", "hyroxankara", false],
      ["", "wolfhaven2event", false],
    ];
    const errs = cases.filter(([a, b, want]) => f.shortRaceSame(a, b) !== want).map(([a, b, want]) => `${a} ~ ${b} != ${want}`);
    if (errs.length) throw new Error(errs.join(" | "));
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
