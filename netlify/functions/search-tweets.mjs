const API_URL = "https://api.twitterapi.io/twitter/tweet/advanced_search";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS"
    },
    body: JSON.stringify(payload)
  };
}

function normalizeTweet(item) {
  const author = item.author || item.user || {};
  const id = item.id || item.tweetId || item.rest_id || item.id_str;
  const text = item.text || item.full_text || item.content || item.tweetText || "";
  if (!id || !text) return null;

  const createdAt = item.createdAt || item.created_at || item.created_at_datetime || null;
  const username = author.userName || author.username || author.screen_name || item.userName || item.username || "";
  const name = author.name || author.displayName || item.name || username || "Pengguna X";
  const profileImage = author.profilePicture || author.profile_image_url || author.profileImageUrl || "";
  const url = item.url || item.tweetUrl || (username ? `https://x.com/${username}/status/${id}` : `https://x.com/i/web/status/${id}`);

  return {
    id: String(id),
    text: String(text),
    createdAt,
    username: String(username).replace(/^@/, ""),
    name,
    profileImage,
    url,
    lang: item.lang || "",
    source: "twitterapi.io"
  };
}

function findTweetArray(data) {
  if (Array.isArray(data)) return data;
  const candidates = [
    data?.tweets,
    data?.data?.tweets,
    data?.results,
    data?.data?.results,
    data?.statuses
  ];
  return candidates.find(Array.isArray) || null;
}

export default async (request) => {
  if (request.method === "OPTIONS") return json(200, { ok: true });
  if (request.method !== "GET") return json(405, { error: "Method tidak didukung." });

  const apiKey = process.env.TWITTERAPI_KEY;
  if (!apiKey) {
    return json(503, {
      error: "API belum terhubung. Tambahkan TWITTERAPI_KEY di environment variables Netlify, lalu deploy ulang."
    });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("query") || "").trim();
  const queryType = url.searchParams.get("queryType") || "Latest";
  const count = Math.min(Math.max(Number(url.searchParams.get("count") || 20), 1), 100);

  if (!query) return json(400, { error: "Masukkan keyword atau hashtag untuk dicari." });
  if (query.length > 500) return json(400, { error: "Query terlalu panjang." });

  const upstream = new URL(API_URL);
  upstream.searchParams.set("query", query);
  upstream.searchParams.set("queryType", queryType);
  // Do not assume count is supported by every provider version; queryType/query are documented search parameters.
  try {
    const response = await fetch(upstream, {
      method: "GET",
      headers: { "X-API-Key": apiKey, "Accept": "application/json" }
    });
    const rawText = await response.text();
    let payload;
    try { payload = JSON.parse(rawText); } catch { payload = { raw: rawText.slice(0, 500) }; }

    if (!response.ok) {
      const providerMessage = payload?.message || payload?.error || `Provider merespons HTTP ${response.status}`;
      return json(response.status === 429 ? 429 : 502, {
        error: String(providerMessage),
        providerStatus: response.status
      });
    }

    const list = findTweetArray(payload);
    if (!list) {
      return json(502, {
        error: "Respons API diterima, tetapi format daftar tweet tidak dikenali. Periksa dokumentasi TwitterAPI.io dan sesuaikan normalizeTweet/findTweetArray.",
        providerKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 20) : []
      });
    }

    const tweets = list.map(normalizeTweet).filter(Boolean).slice(0, count);
    return json(200, {
      ok: true,
      tweets,
      returned: tweets.length,
      hasNextPage: Boolean(payload?.has_next_page || payload?.hasNextPage),
      nextCursor: payload?.next_cursor || payload?.nextCursor || null,
      searchedAt: new Date().toISOString(),
      query
    });
  } catch (error) {
    return json(502, { error: `Tidak bisa menghubungi TwitterAPI.io: ${error.message}` });
  }
};