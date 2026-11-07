// Telegram bildirimi (opsiyonel). Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
export async function notify(text) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!t || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { /* bildirim hatası paylaşımı durdurmaz */ }
}
