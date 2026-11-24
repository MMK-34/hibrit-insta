// Ürün/ekipman markaları: slayt ya da açıklamada geçerse "Reklam / Tanıtım" notu eklenir (yarış adındaki sponsor da sayılır: güvenli taraf).
// Metin tr küçük harfe çevrilip taranır ("NİKE", "GARMİN" kapakta büyük harfle gelir). "brooks" (soyadı), "polar" (Türkçe kelime),
// "decathlon" (atletizm branşı), tek başına "on" eklenmez. İnceleme: rapor/BRAND-inceleme.md
export const BRAND_TEXT_RE = /(?<![\p{L}\p{N}])(puma|nike|adidas|reebok|asics|new balance|hoka|saucony|nobull|rogue fitness|gymshark|under armour|salomon|garmin|coros|whoop|concept2|technogym|tyr|centr|eleiko|suunto|mizuno|altra|on running|kiprun|the north face|strava|maurten)(?![\p{L}\p{N}])/u;
// Tüm slayt alanları (kicker, bullets, tablo, stat...) taranır; tr küçük harf + "ı"->"i" ("ASICS" -> "asics", "NİKE" -> "nike")
export const allStrings = (v) => typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(allStrings) : v && typeof v === "object" ? Object.values(v).flatMap(allStrings) : [];
export const brandInText = (post) => BRAND_TEXT_RE.test(allStrings([post.caption, post.slides]).join(" ").toLocaleLowerCase("tr").replace(/ı/g, "i"));
