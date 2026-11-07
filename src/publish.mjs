// Instagram Content Publishing API: container -> (carousel) -> publish.
// Gerekli env: IG_USER_ID, IG_ACCESS_TOKEN
// Token EAA... (Unified login / system-user, süresiz) -> graph.facebook.com; IGAA... -> graph.instagram.com
const GRAPH = () => `https://${process.env.IG_ACCESS_TOKEN?.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com"}/v23.0`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, params) {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error("IG_ACCESS_TOKEN yok (.env)");
  const qs = new URLSearchParams({ ...params, access_token: token });
  const r = await fetch(`${GRAPH()}/${path}${method === "GET" ? `?${qs}` : ""}`, method === "GET" ? {} : { method, body: qs });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`IG ${path}: ${JSON.stringify(j.error ?? j).slice(0, 400)}`);
  return j;
}

async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const { status_code } = await call("GET", id, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`IG container ${id}: ${status_code}`);
    await sleep(4000);
  }
  throw new Error(`IG container ${id}: zaman aşımı`);
}

/** imageUrls: 1 => tekli, 2-10 => karosel. Yayınlanan medya id ve permalink döner. */
export async function publish(imageUrls, caption) {
  const me = process.env.IG_USER_ID || "me";
  let creationId;
  if (imageUrls.length === 1) {
    const c = await call("POST", `${me}/media`, { image_url: imageUrls[0], caption });
    await waitReady(c.id);
    creationId = c.id;
  } else {
    const children = [];
    for (const url of imageUrls.slice(0, 10)) {
      const c = await call("POST", `${me}/media`, { image_url: url, is_carousel_item: "true" });
      children.push(c.id);
    }
    for (const id of children) await waitReady(id);
    const c = await call("POST", `${me}/media`, { media_type: "CAROUSEL", children: children.join(","), caption });
    await waitReady(c.id);
    creationId = c.id;
  }
  const pub = await call("POST", `${me}/media_publish`, { creation_id: creationId });
  const info = await call("GET", pub.id, { fields: "permalink" }).catch(() => ({}));
  return { id: pub.id, permalink: info.permalink ?? "" };
}

/** 60 günlük token'ı yeniler (token en az 24 saatlik olmalı). Yeni token döner. */
export async function refreshToken() {
  const j = await call("GET", "refresh_access_token", { grant_type: "ig_refresh_token" });
  return j; // { access_token, token_type, expires_in }
}
