// Görselleri GitHub reposunun "media" dalına yükler; Instagram raw.githubusercontent.com adresinden çeker.
// Env: GH_REPO (örn. MMK-34/hibrit-insta), GH_TOKEN (Actions'ta GITHUB_TOKEN)
import fs from "node:fs";

const BRANCH = "media";
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));

async function gh(method, path, body) {
  try {
    const r = await fetch(`https://api.github.com${path}`, {
      method,
      headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "hibrit-insta", "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  } catch (e) {
    // Ağ hatası / zaman aşımı: status 0 (geçici sayılır)
    return { ok: false, status: 0, j: { message: String(e?.message ?? e) } };
  }
}

/** Tek dosyayı yükler. 409/422/5xx/ağ hatasında 3 kez artan beklemeyle yeniden dener. */
async function putFile(repo, p, content) {
  let res;
  for (let attempt = 1; attempt <= 4; attempt++) {
    res = await gh("PUT", `/repos/${repo}/contents/${p}`, { message: `media: ${p}`, branch: BRANCH, content });
    if (res.ok) return;
    // Önceki deneme aslında yazdıysa (yanıt kayboldu) 422 "sha wasn't supplied" döner: dosya zaten var, tamam.
    if (res.status === 422) {
      const ex = await gh("GET", `/repos/${repo}/contents/${p}?ref=${BRANCH}`);
      if (ex.ok && ex.j?.sha) return;
    }
    const transient = res.status === 0 || res.status === 409 || res.status === 422 || res.status >= 500;
    if (!transient || attempt === 4) break;
    console.warn(`GitHub yükleme ${res.status} (${p}), ${attempt}. yeniden deneme`);
    await sleep(3000 * 2 ** (attempt - 1));
  }
  throw new Error(`GitHub yükleme ${res.status}: ${JSON.stringify(res.j).slice(0, 200)}`);
}

export async function uploadFiles(files, prefix) {
  const repo = process.env.GH_REPO;
  if (!repo || !process.env.GH_TOKEN) throw new Error("GH_REPO / GH_TOKEN eksik");
  const urls = [];
  for (const f of files) {
    const p = `${prefix}/${f.split(/[\\/]/).pop()}`;
    await putFile(repo, p, fs.readFileSync(f).toString("base64"));
    urls.push(`https://raw.githubusercontent.com/${repo}/${BRANCH}/${p}`);
  }
  // raw CDN'in dosyayı görmesi için kısa bekleme + doğrulama; hiç 200 dönmezse Instagram da çekemez: hata
  for (const u of urls) {
    let ok = false;
    for (let i = 0; i < 10 && !ok; i++) {
      const r = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(15000) }).catch(() => null);
      ok = r?.status === 200;
      if (!ok) await sleep(3000);
    }
    if (!ok) throw new Error(`raw.githubusercontent.com dosyayı sunmuyor: ${u}`);
  }
  return urls;
}
