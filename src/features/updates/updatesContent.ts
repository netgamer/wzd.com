export type UpdateSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type UpdatePost = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  readingTime: string;
  heroLabel: string;
  seoDescription: string;
  sections: UpdateSection[];
};

export const UPDATE_POSTS: UpdatePost[] = [
  {
    slug: "wzd-repositioning-personalized-first-page",
    title: "WZD repositioning: from generic board to personalized first page",
    summary:
      "We tightened the product story around the browser's first screen: bookmarks, RSS, and a page you actually want to open every morning.",
    category: "Positioning",
    publishedAt: "2026-04-10",
    readingTime: "5 min read",
    heroLabel: "Product note",
    seoDescription:
      "Why WZD is now positioned as a personalized first page for bookmarks and RSS instead of a generic dashboard or CMS-style product.",
    sections: [
      {
        title: "What changed",
        paragraphs: [
          "WZD had started to accumulate several product directions at once: boards, widgets, shared pages, and reading surfaces. That created a risk that the product would read like a vague dashboard instead of a sharp habit-forming tool.",
          "The repositioning work narrows the story to one simple promise: when you open your browser, WZD should be the page that already contains the links and reading context you care about most."
        ],
        bullets: [
          "Bookmarks stay central instead of being buried under feature language.",
          "RSS is framed as part of the daily first-page routine, not a separate content product.",
          "Sharing remains optional and supportive, not the lead message."
        ]
      },
      {
        title: "Why this matters",
        paragraphs: [
          "A first-page product has a much easier job than a broad workspace product. It can earn repeat usage through a small daily habit: open browser, scan links, scan feeds, continue working.",
          "That sharper wedge also makes later supporting surfaces easier to explain. Updates, insight reading, and public pages now exist to reinforce the core first-page workflow rather than compete with it."
        ]
      },
      {
        title: "What we are not doing",
        paragraphs: [
          "This is not a pivot into publishing, content management, or a general-purpose team portal. The repositioning is specifically about making the opening browser experience more useful and more personal."
        ],
        bullets: [
          "No CMS roadmap hidden behind the updates page.",
          "No attempt to turn WZD into a media destination.",
          "No broad dashboard language that weakens the product wedge."
        ]
      }
    ]
  },
  {
    slug: "landing-page-now-explains-real-daily-use",
    title: "Landing changes: the homepage now explains real daily use",
    summary:
      "The landing page now shows concrete first-page presets so visitors can understand how WZD fits a creator, researcher, or operator routine.",
    category: "Landing",
    publishedAt: "2026-04-11",
    readingTime: "4 min read",
    heroLabel: "Experience note",
    seoDescription:
      "An overview of the WZD landing page changes that explain the product through realistic first-page presets instead of generic dashboard copy.",
    sections: [
      {
        title: "Problem with the old message",
        paragraphs: [
          "WZD already had flexible UI pieces, but the public story was still too abstract. Visitors could see cards and widgets without immediately understanding what page they were supposed to build or why they would keep coming back to it.",
          "That gap is especially expensive on a product like WZD, because the value depends on habit and recognition. If the first glance does not feel concrete, the product reads as optional."
        ]
      },
      {
        title: "What the new landing does",
        paragraphs: [
          "The new landing hero uses preset stories for a creator, a researcher, and an operator. Each one describes what they open first, what links they pin, and what feed mix belongs on the page.",
          "This keeps the visual language close to the product while making the use case legible in seconds."
        ],
        bullets: [
          "Preset chips change the story instead of just changing decoration.",
          "The hero preview looks like a plausible first page, not a speculative dashboard.",
          "The copy stays centered on bookmarks, RSS, and everyday opening behavior."
        ]
      },
      {
        title: "Why this supports the product",
        paragraphs: [
          "A stronger landing page is not the product by itself. Its job is to reduce explanation cost so the main product has a better chance to convert interest into actual daily use.",
          "The updates hub fits here as a lightweight supporting surface: it can explain decisions and shipping progress without pulling attention away from the primary call to start using WZD."
        ]
      }
    ]
  },
  {
    slug: "insight-reader-mvp-is-a-supporting-reading-surface",
    title: "Insight reader MVP: a supporting reading surface, not a new core product",
    summary:
      "The first Insight MVP turns home payload data into a readable page so WZD can surface trends, feed items, and next actions without breaking the first-page focus.",
    category: "MVP",
    publishedAt: "2026-04-13",
    readingTime: "6 min read",
    heroLabel: "MVP note",
    seoDescription:
      "How the WZD Insight reader MVP uses the home payload to create a lightweight reading surface while remaining secondary to the personalized first-page product.",
    sections: [
      {
        title: "What shipped",
        paragraphs: [
          "The first Insight MVP renders the current home payload into a lightweight reading layout. Instead of dropping users into the editable board, it gives them a clear surface for trends, feed items, rediscovery candidates, and suggested actions.",
          "That makes the underlying data easier to understand and validates whether WZD can derive a second useful view from the same product context."
        ],
        bullets: [
          "Hero summary from the home payload.",
          "Trend cards and feed list for quick scanning.",
          "Rediscovery and action blocks for follow-through."
        ]
      },
      {
        title: "Why it stays secondary",
        paragraphs: [
          "Insight is not replacing the first page and it is not becoming a standalone content destination. It is a supporting reading layer for people who already benefit from WZD collecting links and feeds in one place.",
          "That distinction matters. If the product story starts from insight pages, WZD becomes harder to explain. If the story starts from the first page, the insight surface becomes a natural extension."
        ]
      },
      {
        title: "What we want to learn next",
        paragraphs: [
          "This MVP is useful if it helps a small set of users return to saved context faster, notice high-value items earlier, and treat WZD as more than a static link board.",
          "The right next step is not feature explosion. It is validating whether the reading surface makes the existing first-page habit stronger."
        ],
        bullets: [
          "Do people scan insight before opening pinned links?",
          "Do rediscovery items bring saved material back into use?",
          "Do actions feel concrete enough to create momentum?"
        ]
      }
    ]
  }
];

export const getUpdatePostBySlug = (slug: string) => UPDATE_POSTS.find((post) => post.slug === slug) ?? null;
