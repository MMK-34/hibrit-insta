// Görselleri GitHub reposunun "media" dalına yükler; Instagram raw.githubusercontent.com adresinden çeker.
// Env: GH_REPO (örn. MMK-34/hibrit-insta), GH_TOKEN (Actions'ta GITHUB_TOKEN)
import fs from "node:fs";

const BRANCH = "media";

async function gh(method, path, body) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "hibrit-insta", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export async function uploadFiles(files, prefix) {
  const repo = process.env.GH_REPO;
  if (!repo || !process.env.GH_TOKEN) throw new Error("GH_REPO / GH_TOKEN eksik");
  const urls = [];
  for (const f of files) {
    const p = `${prefix}/${f.split(/[\/]/).pop()}`;
    const res = await gh("PUT", `/repos/${repo}/contents/${p}`, {
      message: `media: ${p}`, branch: BRANCH, content: fs.readFileSync(f).toString("base64"),
    });
    if (!res.ok) throw new Error(`GitHub yükleme ${res.status}: ${JSON.stringify(res.j).slice(0, 200)}`);
    urls.push(`https://raw.githubusercontent.com/${repo}/${BRANCH}/${p}`);
  }
  // raw CDN'in dosyayı görmesi için kısa bekleme + doğrulama
  for (const u of urls) {
    for (let i = 0; i < 10; i++) {
      const r = await fetch(u, { method: "HEAD" }).catch(() => null);
      if (r?.ok) break;
      await new Promise((s) => setTimeout(s, 3000));
    }
  }
  return urls;
}
