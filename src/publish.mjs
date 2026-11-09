// Instagram Content Publishing API: container -> (carousel) -> publish.
// Gerekli env: IG_USER_ID, IG_ACCESS_TOKEN
// Token EAA... (Unified login / system-user, süresiz) -> graph.facebook.com; IGAA... -> graph.instagram.com
const GRAPH = () => `https://${process.env.IG_ACCESS_TOKEN?.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com"}/v23.0`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Geçici Graph hataları: 1 (bilinmeyen), 2 (servis), 4 (uygulama hız sınırı), 17 (kullanıcı hız sınırı),
// 9007 (medya henüz hazır değil), -2 (geçici); ayrıca HTTP 5xx ve ağ hatası / zaman aşımı.
const TRANSIENT_CODES = new Set([1, 2, 4, 17, 9007, -2]);

class IgError extends Error {
  constructor(message, transient) { super(message); this.transient = transient; }
}

async function call(method, path, params) {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error("IG_ACCESS_TOKEN yok (.env)");
  const qs = new URLSearchParams({ ...params, access_token: token });
  let r;
  try {
    r = await fetch(`${GRAPH()}/${path}${method === "GET" ? `?${qs}` : ""}`, {
      ...(method === "GET" ? {} : { method, body: qs }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    throw new IgError(`IG ${path}: ağ hatası (${e?.name ?? ""} ${e?.message ?? e})`, true);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const transient = r.status >= 500 || TRANSIENT_CODES.has(j.error?.code) || j.error?.is_transient === true;
    throw new IgError(`IG ${path}: HTTP ${r.status} ${JSON.stringify(j.error ?? j).slice(0, 400)}`, transient);
  }
  return j;
}

/** Geçici hatalarda en fazla 3 kez artan beklemeyle yeniden dener. */
async function retry(label, fn, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (!e.transient || attempt >= retries) throw e;
      console.warn(`${label}: geçici hata, ${attempt + 1}. yeniden deneme: ${e.message.slice(0, 200)}`);
      await sleep(5000 * 2 ** attempt);
    }
  }
}

function userId() {
  const id = process.env.IG_USER_ID;
  if (!id) throw new Error("IG_USER_ID yok (.env / Actions secret)");
  return id;
}

async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const { status_code } = await retry(`IG durum ${id}`, () => call("GET", id, { fields: "status_code" }));
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`IG container ${id}: ${status_code}`);
    await sleep(4000);
  }
  throw new Error(`IG container ${id}: zaman aşımı`);
}

const capKey = (s = "") => String(s).replace(/\s+/g, " ").trim().slice(0, 80);
// Graph zaman damgası "2026-11-08T10:00:00+0000" biçiminde
const igTime = (t = "") => Date.parse(String(t).replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

/** Son 15 dakikada aynı caption başlangıcıyla yayımlanmış medya (yanıtı kaybolan media_publish için). */
export async function findRecentDuplicate(me, caption) {
  const j = await call("GET", `${me}/media`, { fields: "id,caption,timestamp,permalink", limit: "3" });
  const key = capKey(caption);
  return (j.data ?? []).find((m) => capKey(m.caption) === key && Date.now() - igTime(m.timestamp) < 15 * 60e3) ?? null;
}

/** imageUrls: 1 => tekli, 2-10 => karosel. Yayınlanan medya id ve permalink döner. */
export async function publish(imageUrls, caption, { collaborators = [] } = {}) {
  const me = userId();
  // Ortak gönderi (Collab) daveti: organizatör kabul ederse post onun profilinde ve takipçilerinde de görünür.
  // Davet desteklenmezse (hesap türü, sınır) container davetsiz yeniden oluşturulur; paylaşım durmaz.
  const collab = collaborators.length ? { collaborators: JSON.stringify(collaborators.slice(0, 3)) } : {};
  const withCollab = async (label, params) => {
    try { return await retry(label, () => call("POST", `${me}/media`, { ...params, ...collab })); } catch (e) {
      if (!collaborators.length) throw e;
      console.warn(`Collab daveti kabul edilmedi (${String(e?.message ?? e).slice(0, 120)}); davetsiz paylaşılıyor.`);
      return retry(label, () => call("POST", `${me}/media`, params));
    }
  };
  let creationId;
  if (imageUrls.length === 1) {
    const c = await withCollab("IG container", { image_url: imageUrls[0], caption });
    await waitReady(c.id);
    creationId = c.id;
  } else {
    const children = [];
    for (const url of imageUrls.slice(0, 10)) {
      const c = await retry("IG karosel öğesi", () => call("POST", `${me}/media`, { image_url: url, is_carousel_item: "true" }));
      children.push(c.id);
    }
    for (const id of children) await waitReady(id);
    const c = await withCollab("IG karosel", { media_type: "CAROUSEL", children: children.join(","), caption });
    await waitReady(c.id);
    creationId = c.id;
  }
  // media_publish: yeniden denemeden önce, yanıt kaybolmuş ama paylaşım gerçekleşmiş mi diye bak (çift paylaşım olmasın)
  let pub, permalink = "";
  for (let attempt = 0; ; attempt++) {
    try { pub = await call("POST", `${me}/media_publish`, { creation_id: creationId }); break; } catch (e) {
      await sleep(5000);
      const dup = await findRecentDuplicate(me, caption).catch(() => null);
      if (dup) { console.warn(`media_publish hata verdi ama post yayında bulundu (${dup.id}); başarılı sayıldı.`); pub = { id: dup.id }; permalink = dup.permalink ?? ""; break; }
      if (!e.transient || attempt >= 3) throw e;
      console.warn(`IG media_publish: geçici hata, ${attempt + 1}. yeniden deneme: ${e.message.slice(0, 200)}`);
      await sleep(5000 * 2 ** attempt);
    }
  }
  if (!permalink) permalink = (await call("GET", pub.id, { fields: "permalink" }).catch(() => ({}))).permalink ?? "";
  return { id: pub.id, permalink };
}

/**
 * Hikâye (Story) paylaşımı: 1080x1920 JPEG URL'si. Business hesaplarda media_type=STORIES desteklenir.
 * Hata fırlatır; çağıran taraf hikâyeyi isteğe bağlı sayıp yutar (ana post yayında kalır).
 */
export async function publishStory(imageUrl) {
  const me = userId();
  const c = await retry("IG hikâye container", () => call("POST", `${me}/media`, { image_url: imageUrl, media_type: "STORIES" }));
  await waitReady(c.id);
  const pub = await call("POST", `${me}/media_publish`, { creation_id: c.id }); // yeniden deneme yok: yanıt kaybolursa çift hikâye riski
  return { id: pub.id };
}

/**
 * Reels paylaşımı: herkese açık MP4 URL'si (H.264/AAC, 9:16). Video işlenmesi birkaç dakika sürebilir.
 * share_to_feed: profil ızgarasında da görünür.
 */
export async function publishReel(videoUrl, caption) {
  const me = userId();
  const c = await retry("IG reels container", () => call("POST", `${me}/media`, { media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true" }));
  for (let i = 0; i < 60; i++) {
    const { status_code, status } = await retry(`IG reels durum ${c.id}`, () => call("GET", c.id, { fields: "status_code,status" }));
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`IG reels ${c.id}: ${status_code} ${status ?? ""}`);
    if (i === 59) throw new Error(`IG reels ${c.id}: zaman aşımı`);
    await sleep(10000);
  }
  const pub = await call("POST", `${me}/media_publish`, { creation_id: c.id }); // yeniden deneme yok: çift paylaşım riski
  const info = await call("GET", pub.id, { fields: "permalink" }).catch(() => ({}));
  return { id: pub.id, permalink: info.permalink };
}

/** Ücretli çağrılardan önce token + hesap kontrolü. Başarısızsa hata fırlatır. */
export async function preflight() {
  const me = userId();
  const j = await retry("IG ön kontrol", () => call("GET", me, { fields: "id,username" }));
  if (!j.id) throw new Error(`IG ön kontrol: beklenmeyen yanıt ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

/** 60 günlük token'ı yeniler (token en az 24 saatlik olmalı). Yeni token döner. */
export async function refreshToken() {
  const j = await call("GET", "refresh_access_token", { grant_type: "ig_refresh_token" });
  return j; // { access_token, token_type, expires_in }
}

/**
 * Yayınlanmış medyayı siler (yayın sonrası denetimde ciddi hata bulunursa). instagram_manage_contents izni gerekir;
 * izin yoksa { ok: false, error } döner ve çağıran kullanıcıya elle silme uyarısı gönderir.
 */
export async function deleteMedia(mediaId) {
  if (!/^\d{5,30}$/.test(String(mediaId ?? ""))) return { ok: false, error: "geçersiz medya kimliği" };
  let last = "";
  for (const token of [process.env.IG_ACCESS_TOKEN, process.env.IG_DISCOVERY_TOKEN].filter(Boolean)) {
    try {
      const host = String(token).startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
      const r = await fetch(`https://${host}/v23.0/${mediaId}?access_token=${token}`, { method: "DELETE", signal: AbortSignal.timeout(30000) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.success === true || j === true)) return { ok: true };
      last = JSON.stringify(j.error ?? j).slice(0, 200);
    } catch (e) { last = String(e?.message ?? e).slice(0, 200); }
  }
  return { ok: false, error: last };
}
