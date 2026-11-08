// Hibrit Portal dış zamanlayıcı: GitHub'ın kendi cron'u düşebildiği için her saat GitHub Actions'taki
// "Instagram otomatik paylaşım" workflow'unu workflow_dispatch ile tetikler (mode=normal, trigger=cron).
// run.mjs, trigger=cron çalışmalarına 45 dk kapısını uygular: GitHub cron'u aynı saatte çalıştıysa bu çalışma hiçbir şey yapmaz.
// Gizli değişken: GH_TOKEN (wrangler secret put GH_TOKEN). Herkese açık HTTP ucu yok.
const REPO = "MMK-34/hibrit-insta";
const WORKFLOW = "post.yml";

async function dispatch(env) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GH_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "hibrit-portal-trigger",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main", inputs: { mode: "normal", trigger: "cron" } }),
  });
  if (r.status !== 204) throw new Error(`GitHub dispatch HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.status;
}

export default {
  async scheduled(event, env, ctx) {
    // Geçici hatada bir kez yeniden dene
    try { await dispatch(env); }
    catch (e) { console.warn(String(e)); await new Promise((s) => setTimeout(s, 20000)); await dispatch(env); }
    console.log(`tetiklendi: ${event.cron}`);
  },
  async fetch() {
    return new Response("Not found", { status: 404 });
  },
};
