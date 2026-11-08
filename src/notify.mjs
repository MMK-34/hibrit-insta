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
  // Yalnızca depo sahibinin ya da botun açtığı rapor issue'su kullanılır (herkese açık depoda başkasının açtığı aynı başlıklı issue'ya yazılmaz)
  const owner = repo.split("/")[0].toLowerCase();
  const trusted = (i) => i.title === REPORT_TITLE && !i.pull_request && [owner, "github-actions[bot]"].includes(String(i.user?.login ?? "").toLowerCase());
  const all = await gh("GET", `/repos/${repo}/issues?state=open&per_page=100`) ?? [];
  let issue = all.filter(trusted).sort((a, b) => a.number - b.number)[0];
  if (!issue) issue = await gh("POST", `/repos/${repo}/issues`, { title: REPORT_TITLE, body: "Hibrit Portal botunun günlük özetleri ve hata bildirimleri bu başlık altında toplanır. GitHub her yeni yorumda e-posta gönderir." });
  if (!issue?.number) return;
  const stamp = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  await gh("POST", `/repos/${repo}/issues/${issue.number}/comments`, { body: `**${stamp}**\n\n${String(text).slice(0, 6000)}` });
}

/**
 * ntfy.sh anlık bildirim (telefondaki ntfy uygulaması). NTFY_TOPIC yoksa sessizce geçer; hata paylaşımı durdurmaz.
 * level: "info" (ilerleme), "ok" (paylaşıldı), "warn" (hata/silme), "approve" (onay bekliyor)
 */
export async function push(text, { title = "Hibrit Portal", level = "info", click = "" } = {}) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic || !/^[A-Za-z0-9_-]{16,64}$/.test(topic) || process.argv.includes("--dry")) return;
  const tags = { info: "hourglass_flowing_sand", ok: "white_check_mark", warn: "warning", approve: "bell" }[level] ?? "information_source";
  const priority = { info: "2", ok: "3", warn: "5", approve: "4" }[level] ?? "3";
  try {
    // Başlıklar HTTP header'ında: yalnızca ASCII güvenli değil, bu yüzden RFC 2047 yerine JSON gövdeli yayın kullanılır
    await fetch("https://ntfy.sh/", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic, title, message: String(text).slice(0, 3500), tags: [tags], priority: Number(priority), ...(/^https:\/\//.test(click) ? { click } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { /* bildirim hatası paylaşımı durdurmaz */ }
}

export async function notify(text) {
  // Tüm önemli bildirimler telefona da gider
  {
    const s = String(text);
    const level = /^⚠️/u.test(s) ? "warn" : /^✅/u.test(s) ? "ok" : /ONAY BEKLEYEN/.test(s) ? "approve" : "info";
    const link = (s.match(/https:\/\/www\.instagram\.com\/p\/[\w-]+\/?/) ?? [])[0] ?? "";
    await push(s.replace(/^(⚠️|✅|📊)\s*/u, ""), { level, click: link });
  }
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
