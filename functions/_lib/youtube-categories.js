// Shared between server (curation fetch) and client (template picker).
// One canonical list — adding a category here surfaces it in the template
// picker AND in the /api/youtube/category/<slug> endpoint.

export const YOUTUBE_CATEGORIES = [
  {
    slug: "health",
    label: "건강·운동",
    emoji: "🏋️",
    description: "홈트·다이어트·헬스 인기 영상",
    query: "홈트 운동 다이어트 헬스",
    color: "mint"
  },
  {
    slug: "tech",
    label: "IT·개발",
    emoji: "💻",
    description: "프로그래밍·개발 강의·신기술",
    query: "개발 프로그래밍 코딩 IT",
    color: "blue"
  },
  {
    slug: "ai",
    label: "AI·인공지능",
    emoji: "🤖",
    description: "ChatGPT·Claude·생성형 AI 활용",
    query: "AI 인공지능 ChatGPT 프롬프트",
    color: "purple"
  },
  {
    slug: "design",
    label: "디자인",
    emoji: "🎨",
    description: "UI·UX·브랜딩 사례·튜토리얼",
    query: "UI UX 디자인 피그마",
    color: "pink"
  },
  {
    slug: "productivity",
    label: "생산성·자기계발",
    emoji: "📈",
    description: "노션·시간관리·루틴",
    query: "생산성 노션 자기계발 루틴",
    color: "yellow"
  },
  {
    slug: "cooking",
    label: "요리·집밥",
    emoji: "🍳",
    description: "집밥·간단 레시피",
    query: "집밥 레시피 요리",
    color: "orange"
  },
  {
    slug: "travel",
    label: "여행",
    emoji: "✈️",
    description: "국내·해외 여행 코스",
    query: "여행 브이로그 국내여행",
    color: "blue"
  },
  {
    slug: "finance",
    label: "재테크·투자",
    emoji: "💰",
    description: "주식·부동산·돈공부",
    query: "재테크 주식 투자 돈공부",
    color: "green"
  },
  {
    slug: "learning",
    label: "공부·강의",
    emoji: "📚",
    description: "공부법·온라인 강의",
    query: "공부법 강의 학습",
    color: "white"
  },
  {
    slug: "music",
    label: "음악",
    emoji: "🎵",
    description: "K-pop·플레이리스트·라이브",
    query: "음악 플레이리스트 라이브 K-pop",
    color: "pink"
  }
];

export const findYoutubeCategory = (slug) =>
  YOUTUBE_CATEGORIES.find((c) => c.slug === slug) ?? null;
