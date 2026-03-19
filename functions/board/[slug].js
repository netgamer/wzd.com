const DEFAULT_TITLE = "WZD 개인 시작페이지";
const DEFAULT_DESCRIPTION = "WZD에서 메모, 링크, 위젯이 담긴 보드를 만들고 공유해보세요.";

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const asText = (value) => (typeof value === "string" ? value : "");

const stripUrls = (content = "") =>
  content
    .replace(
      /(?:https?:\/\/https?:\/\/\S+|https?:\/\/https?\/\/\S+|https?:\/\/\S+|https?\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

const getFirstNonEmptyLine = (content = "") =>
  stripUrls(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";

const buildDescription = (board, notes) => {
  const boardDescription = asText(board?.description).trim();
  if (boardDescription) {
    return boardDescription.slice(0, 180);
  }

  const noteLines = notes
    .map((note) => getFirstNonEmptyLine(asText(note?.content)))
    .filter(Boolean)
    .slice(0, 2);

  if (noteLines.length > 0) {
    return noteLines.join(" · ").slice(0, 180);
  }

  const noteCount = Array.isArray(notes) ? notes.length : 0;
  return noteCount > 0
    ? `메모 ${noteCount}개가 정리된 WZD 공유 보드입니다.`
    : DEFAULT_DESCRIPTION;
};

const getPreviewImage = (notes, origin) => {
  for (const note of notes) {
    const pastedImageUrl = asText(note?.metadata?.pastedImageUrl).trim();
    if (pastedImageUrl) {
      return pastedImageUrl;
    }
  }

  return `${origin}/favicon.ico`;
};

const injectMetaTags = (html, metadata) => {
  const metaTags = `
    <title>${escapeHtml(metadata.title)}</title>
    <meta name="description" content="${escapeHtml(metadata.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WZD" />
    <meta property="og:title" content="${escapeHtml(metadata.title)}" />
    <meta property="og:description" content="${escapeHtml(metadata.description)}" />
    <meta property="og:url" content="${escapeHtml(metadata.url)}" />
    <meta property="og:image" content="${escapeHtml(metadata.image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
    <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
    <meta name="twitter:image" content="${escapeHtml(metadata.image)}" />
    <link rel="canonical" href="${escapeHtml(metadata.url)}" />
  `;

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|og:type|og:site_name|og:title|og:description|og:url|og:image|twitter:card|twitter:title|twitter:description|twitter:image)["'][^>]*>\s*/gi, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace("</head>", `${metaTags}\n  </head>`);
};

const fetchSharedBoard = async (env, slug) => {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`
  };

  const boardUrl = new URL(`${supabaseUrl}/rest/v1/boards`);
  boardUrl.searchParams.set("select", "id,title,description,settings");
  boardUrl.searchParams.set("is_archived", "eq.false");
  boardUrl.searchParams.set("settings->>sharedSlug", `eq.${slug}`);
  boardUrl.searchParams.set("limit", "1");

  const boardResponse = await fetch(boardUrl.toString(), { headers });
  if (!boardResponse.ok) {
    return null;
  }

  const boards = await boardResponse.json();
  const board = Array.isArray(boards) ? boards[0] : null;
  if (!board?.id) {
    return null;
  }

  const notesUrl = new URL(`${supabaseUrl}/rest/v1/notes`);
  notesUrl.searchParams.set("select", "content,metadata,z_index");
  notesUrl.searchParams.set("board_id", `eq.${board.id}`);
  notesUrl.searchParams.set("archived", "eq.false");
  notesUrl.searchParams.set("order", "z_index.asc");
  notesUrl.searchParams.set("limit", "6");

  const notesResponse = await fetch(notesUrl.toString(), { headers });
  const notes = notesResponse.ok ? await notesResponse.json() : [];

  return {
    board,
    notes: Array.isArray(notes) ? notes : []
  };
};

export const onRequestGet = async (context) => {
  const { request, env, params } = context;
  const slug = asText(params?.slug).trim();

  const assetResponse = await env.ASSETS.fetch(new URL("/index.html", request.url));
  const html = await assetResponse.text();

  if (!slug) {
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  }

  try {
    const payload = await fetchSharedBoard(env, slug);
    if (!payload?.board) {
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      });
    }

    const url = new URL(request.url);
    const title = `${asText(payload.board.title).trim() || DEFAULT_TITLE} | WZD`;
    const description = buildDescription(payload.board, payload.notes);
    const image = getPreviewImage(payload.notes, url.origin);

    const withMeta = injectMetaTags(html, {
      title,
      description,
      url: url.toString(),
      image
    });

    return new Response(withMeta, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch {
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  }
};
