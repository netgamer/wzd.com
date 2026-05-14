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

const getThemeByBackground = (backgroundStyle) => {
  switch (backgroundStyle) {
    case "cork":
      return {
        bg: "#2f2118",
        bgSoft: "#5f402d",
        card: "rgba(255,255,255,0.08)",
        accent: "#f2c28e",
        text: "#fff7ef",
        muted: "rgba(255,247,239,0.7)"
      };
    case "whiteboard":
      return {
        bg: "#f7f3ec",
        bgSoft: "#ffffff",
        card: "rgba(31,26,19,0.05)",
        accent: "#e60023",
        text: "#1f1a13",
        muted: "rgba(31,26,19,0.65)"
      };
    default:
      return {
        bg: "#fff6df",
        bgSoft: "#ffffff",
        card: "rgba(31,26,19,0.06)",
        accent: "#e60023",
        text: "#1f1a13",
        muted: "rgba(31,26,19,0.64)"
      };
  }
};

const buildOgImage = (board, notes, origin) => {
  for (const note of notes) {
    const pastedImageUrl = asText(note?.metadata?.pastedImageUrl).trim();
    if (pastedImageUrl) {
      return pastedImageUrl;
    }
  }

  const title = asText(board?.title).trim() || DEFAULT_TITLE;
  const description = buildDescription(board, notes);
  const noteCount = Array.isArray(notes) ? notes.length : 0;
  const theme = getThemeByBackground(asText(board?.backgroundStyle).trim());

  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
          <stop stop-color="${theme.bgSoft}" />
          <stop offset="1" stop-color="${theme.bg}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" rx="36" fill="url(#bg)" />
      <circle cx="1030" cy="120" r="180" fill="${theme.accent}" fill-opacity="0.08" />
      <circle cx="130" cy="520" r="220" fill="${theme.accent}" fill-opacity="0.06" />
      <rect x="64" y="58" width="130" height="48" rx="24" fill="${theme.accent}" />
      <text x="129" y="89" text-anchor="middle" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800" fill="#ffffff">WZD</text>
      <text x="64" y="176" font-size="60" font-family="Inter, Arial, sans-serif" font-weight="800" fill="${theme.text}">${escapeHtml(title.slice(0, 42))}</text>
      <text x="64" y="234" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="500" fill="${theme.muted}">${escapeHtml(description.slice(0, 92))}</text>
      <rect x="64" y="308" width="1072" height="226" rx="28" fill="${theme.card}" />
      <rect x="98" y="344" width="302" height="150" rx="22" fill="${theme.bgSoft}" />
      <rect x="438" y="344" width="302" height="150" rx="22" fill="${theme.bgSoft}" />
      <rect x="778" y="344" width="302" height="150" rx="22" fill="${theme.bgSoft}" />
      <text x="64" y="578" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700" fill="${theme.text}">공유 보드 · 메모 ${noteCount}개</text>
      <text x="1136" y="578" text-anchor="end" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="600" fill="${theme.muted}">${escapeHtml(origin.replace(/^https?:\/\//, ""))}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
    <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
    <meta name="twitter:image" content="${escapeHtml(metadata.image)}" />
    <link rel="canonical" href="${escapeHtml(metadata.url)}" />
  `;

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(
      /<meta[^>]+(?:name|property)=["'](?:description|og:type|og:site_name|og:title|og:description|og:url|og:image|og:image:width|og:image:height|twitter:card|twitter:title|twitter:description|twitter:image)["'][^>]*>\s*/gi,
      ""
    )
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace("</head>", `${metaTags}\n  </head>`);
};

const parseSettings = (raw) => {
  if (raw === null || raw === undefined || raw === "") return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const fetchSharedBoard = async (env, slug) => {
  const db = env.DB;
  if (!db) {
    return null;
  }

  const boardRow = await db
    .prepare(
      `SELECT id, title, description, settings, background_style
         FROM boards
        WHERE is_archived = 0
          AND json_extract(settings, '$.sharedSlug') = ?
        LIMIT 1`
    )
    .bind(slug)
    .first();
  if (!boardRow?.id) {
    return null;
  }

  const notesResult = await db
    .prepare(
      `SELECT content, metadata, z_index
         FROM notes
        WHERE board_id = ? AND archived = 0
        ORDER BY z_index ASC
        LIMIT 6`
    )
    .bind(boardRow.id)
    .all();

  const settings = parseSettings(boardRow.settings);
  const notes = (notesResult?.results ?? []).map((row) => ({
    content: row.content,
    metadata: parseSettings(row.metadata),
    z_index: row.z_index
  }));

  return {
    board: {
      ...boardRow,
      settings,
      backgroundStyle: asText(
        boardRow.background_style || settings.backgroundStyle || "paper"
      )
    },
    notes
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
    const image = buildOgImage(payload.board, payload.notes, url.origin);

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
