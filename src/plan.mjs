// Claude ile haber seçimi + Türkçe post yazımı. JSON çıktı tool_use ile zorlanır.
import { MODEL, BRAND } from "./config.mjs";

const API = "https://api.anthropic.com/v1/messages";

async function claude({ system, user, tool, maxTokens = 4000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY yok (.env)");
  for (let i = 0; i < 3; i++) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: maxTokens, system,
        messages: [{ role: "user", content: user }],
        tools: [tool], tool_choice: { type: "tool", name: tool.name },
      }),
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 5000 * (i + 1))); continue; }
    const j = await r.json();
    if (!r.ok) throw new Error(`Claude API ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
    const block = j.content.find((c) => c.type === "tool_use");
    if (!block) throw new Error("Claude tool_use dönmedi");
    return block.input;
  }
  throw new Error("Claude API tekrar denemeleri tükendi");
}

const EDITOR = `Sen "${BRAND.name}" adlı Türkçe Instagram haber hesabının kıdemli editörüsün.
Konu: HYROX, CrossFit, koşu (maraton, ultra, pist), fonksiyonel fitness ve hibrit antrenman.
Kitle: Türkiye'deki CrossFit/HYROX sporcuları ve koşucular; bilgili, jargonu bilir.
İlkeler:
- Gerçek haber değeri olanı seç: yarış sonuçları, rekorlar, takvim/kural değişiklikleri, büyük sponsorluk/iş haberleri, Türkiye'deki etkinlikler, sağlam bilimsel çalışmalar.
- Klikbait "yaşına göre plank süren kaç olmalı" türü evergreen SEO yazılarını, reklam/advertorial içerikleri ve konu dışı ("maraton" mecazı gibi) sonuçları ele.
- Türkiye ile ilgili haberlere ekstra puan ver.
- Aynı olayı anlatan birden çok haber varsa tek post say.`;

const SELECT_TOOL = {
  name: "select_news",
  description: "Paylaşılacak haberleri seç ve puanla",
  input_schema: {
    type: "object",
    properties: {
      picks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ids: { type: "array", items: { type: "string" }, description: "Aynı olaya ait haber id'leri (ilk id ana kaynak)" },
            score: { type: "integer", minimum: 1, maximum: 10, description: "Haber değeri" },
            category: { type: "string", enum: ["hyrox", "crossfit", "kosu", "fonksiyonel", "genel"] },
            format: { type: "string", enum: ["carousel", "single"], description: "Çok bilgi/rakam varsa carousel, tek cümlelik haber single" },
            why: { type: "string" },
          },
          required: ["ids", "score", "category", "format", "why"],
        },
      },
    },
    required: ["picks"],
  },
};

/** Aday listesinden en fazla `limit` haber seçer (puana göre azalan). */
export async function selectNews(items, { limit, postedIds }) {
  const list = items.filter((i) => !postedIds.has(i.id))
    .map((i) => `id: ${i.id}\nkaynak: ${i.source} | ${i.ageH} saat önce | akış: ${i.feedCat}\nbaşlık: ${i.title}\nözet: ${i.snippet}`).join("\n---\n");
  if (!list) return [];
  const res = await claude({
    system: EDITOR,
    user: `Aşağıdaki aday haberlerden en fazla ${limit} tanesini seç. Haber değeri düşükse daha azını seç ya da hiç seçme.\n\n${list}`,
    tool: SELECT_TOOL, maxTokens: 2000,
  });
  return (res.picks ?? []).sort((a, b) => b.score - a.score).slice(0, limit);
}

const POST_TOOL = {
  name: "write_post",
  description: "Instagram postunu yaz",
  input_schema: {
    type: "object",
    properties: {
      factsOk: { type: "boolean", description: "Kaynak metin postu doğrulamaya yetiyor mu? Yetmiyorsa false." },
      slides: {
        type: "array", minItems: 1, maxItems: 7,
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["cover", "text", "stat", "end"] },
            kicker: { type: "string", description: "cover: kısa üst etiket, örn 'Son dakika' / 'Yarış raporu'" },
            title: { type: "string" },
            subtitle: { type: "string" },
            body: { type: "string" },
            bullets: { type: "array", items: { type: "string" }, maxItems: 4 },
            label: { type: "string", description: "stat: rakamın etiketi" },
            value: { type: "string", description: "stat: rakam/süre, kısa (en fazla 8 karakter ideal)" },
          },
          required: ["type"],
        },
      },
      imageQueries: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Stok foto aramak için İngilizce sorgular, en spesifikten genele. Örn: 'hyrox sled push race', 'marathon runners city street', 'crossfit competition barbell'. Kişi adı kullanma." },
      caption: { type: "string" },
      hashtags: { type: "array", items: { type: "string" }, maxItems: 12 },
    },
    required: ["factsOk", "slides", "imageQueries", "caption", "hashtags"],
  },
};

export async function writePost(pick, sources) {
  const fmt = pick.format === "carousel"
    ? `KAROSEL: 4-7 slayt. 1. slayt "cover" (kanca başlık, en fazla ~55 karakter; subtitle merak uyandıran tek cümle). Ortada "text" (en fazla 3-4 kısa madde) ve uygunsa "stat" slaytları. Son slayt "end": topluluğa soru + kısa yorum çağrısı.`
    : `TEKLİ POST: tam 1 slayt, "cover" tipi. title haberin kendisi (en fazla ~70 karakter), subtitle en önemli ek bilgi (tek cümle).`;
  const src = sources.map((s, i) => `KAYNAK ${i + 1}: ${s.source} — ${s.title}\nURL: ${s.url}\n${s.text || s.snippet}`).join("\n\n=====\n\n");
  return claude({
    system: `${EDITOR}
Yazım kuralları:
- Doğal, akıcı Türkçe; çeviri kokmasın, yapay zekâ klişesi yok ("heyecan verici", "oyunun kurallarını değiştiren", "dünyasında" vb. yasak). Emojiyi caption'da en fazla 2 kez kullan, slaytlarda hiç.
- Hareket ve yarış adları İngilizce kalır (wall ball, sled push, Elite 15, Open). Açıklamalar Türkçe.
- YALNIZCA kaynakta geçen bilgileri kullan. Rakam, süre, isim uydurma. Emin değilsen o bilgiyi koyma. Kaynak yetersizse factsOk=false.
- Kaynak metni çevirip kopyalama; kendi cümlelerinle özetle.
- Caption: 1. satır kanca; 2-4 kısa paragraf; sonda "Kaynak: <yayın adı>" ve bir soru. 2200 karakteri geçme.
- Hashtag: 6-12 adet, Türkçe+İngilizce karışık, # işaretiyle (#hyrox #crossfit #hyroxturkiye gibi).`,
    user: `${fmt}\n\nKategori: ${pick.category}\n\n${src}`,
    tool: POST_TOOL, maxTokens: 4000,
  });
}
