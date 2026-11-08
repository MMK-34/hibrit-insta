// Bildirimler. İki kanal, ikisi de bilgisayar açık olmadan çalışır:
//  1) Telegram (opsiyonel): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID tanımlıysa her bildirim gider.
//  2) GitHub raporu: GH_TOKEN + GH_REPO varsa yalnızca ÖNEMLİ bildirimler (günlük özet 📊, hatalar ⚠️)
//     depodaki "Bot raporları" issue'suna yorum olarak eklenir; GitHub hesap sahibine e-posta gönderir.
//     Her paylaşım (✅) issue'ya yazılmaz: e-posta kutusu dolmasın.
const REPORT_TITLE = "Bot raporları (otomatik)";

async function gh(method, path, body) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "hibrit-insta", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  return r.ok ? r.json() : null;
}

async function githubReport(text) {
  const repo = process.env.GH_REPO;
  if (!repo || !process.env.GH_TOKEN || process.argv.includes("--dry")) return;
  const list = await gh("GET", `/repos/${repo}/issues?state=open&per_page=50&creator=app%2Fgithub-actions`) ?? [];
  let issue = list.find((i) => i.title === REPORT_TITLE);
  if (!issue) {
    const all = await gh("GET", `/repos/${repo}/issues?state=open&per_page=100`) ?? [];
    issue = all.find((i) => i.title === REPORT_TITLE);
  }
  if (!issue) issue = await gh("POST", `/repos/${repo}/issues`, { title: REPORT_TITLE, body: "Hibrit Portal botunun günlük özetleri ve hata bildirimleri bu başlık altında toplanır. GitHub her yeni yorumda e-posta gönderir." });
  if (!issue?.number) return;
  const stamp = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  await gh("POST", `/repos/${repo}/issues/${issue.number}/comments`, { body: `**${stamp}**\n\n${String(text).slice(0, 6000)}` });
}

export async function notify(text) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: chat } = process.env;
  if (t && chat) {
    try {
      await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 4000), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10000),
      });
    } catch { /* bildirim hatası paylaşımı durdurmaz */ }
  }
  if (/^(⚠️|📊)/u.test(String(text))) {
    try { await githubReport(text); } catch { /* rapor hatası paylaşımı durdurmaz */ }
  }
}
