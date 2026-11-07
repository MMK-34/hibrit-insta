// Bağlantı testi: token, hesap bilgisi ve paylaşım kotası. Token ekrana yazılmaz.
import "dotenv/config";
const t = process.env.IG_ACCESS_TOKEN, id = process.env.IG_USER_ID;
const host = t?.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
const get = (p) => fetch(`https://${host}/v23.0/${p}${p.includes("?") ? "&" : "?"}access_token=${t}`).then((r) => r.json());
console.log("host:", host);
console.log("hesap:", JSON.stringify(await get(`${id}?fields=id,username,name,media_count,followers_count`)));
console.log("kota:", JSON.stringify(await get(`${id}/content_publishing_limit?fields=quota_usage,config`)));
console.log("token:", JSON.stringify((await get("debug_token?input_token=" + t)).data ?? {}, ["type", "is_valid", "expires_at", "scopes", "app_id"]));
