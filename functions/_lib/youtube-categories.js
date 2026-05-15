// Shared between server (curation fetch) and client (template picker).
// One canonical list — adding a category here surfaces it in the template
// picker AND in the /api/youtube/category/<slug> endpoint.

// 각 query는 youtube.com/results?search_query=<query>&sp=CAMSAhAB
// (조회수 상위 + 영상 필터)로 검색됨. broad 키워드일수록 안정적인 결과.
export const YOUTUBE_CATEGORIES = [
  {
    slug: "health",
    label: "건강·운동",
    emoji: "🏋️",
    description: "홈트·다이어트·헬스 인기 영상",
    query: "홈트 운동",
    color: "mint"
  },
  {
    slug: "tech",
    label: "IT·개발",
    emoji: "💻",
    description: "프로그래밍·코딩·신기술",
    query: "개발 프로그래밍",
    color: "blue"
  },
  {
    slug: "ai",
    label: "AI·인공지능",
    emoji: "🤖",
    description: "ChatGPT·Claude·생성형 AI 활용",
    query: "AI 인공지능 ChatGPT",
    color: "purple"
  },
  {
    slug: "design",
    label: "디자인",
    emoji: "🎨",
    description: "UI·UX·브랜딩 사례·튜토리얼",
    query: "UI UX 디자인",
    color: "pink"
  },
  {
    slug: "productivity",
    label: "생산성·자기계발",
    emoji: "📈",
    description: "노션·시간관리·루틴",
    query: "생산성 자기계발",
    color: "yellow"
  },
  {
    slug: "cooking",
    label: "요리·집밥",
    emoji: "🍳",
    description: "집밥·간단 레시피",
    query: "집밥 레시피",
    color: "orange"
  },
  {
    slug: "travel",
    label: "여행",
    emoji: "✈️",
    description: "국내·해외 여행 코스",
    query: "여행 브이로그",
    color: "blue"
  },
  {
    slug: "finance",
    label: "재테크·투자",
    emoji: "💰",
    description: "주식·부동산·돈공부",
    query: "재테크 주식 투자",
    color: "green"
  },
  {
    slug: "learning",
    label: "공부·강의",
    emoji: "📚",
    description: "공부법·온라인 강의",
    query: "공부법 강의",
    color: "white"
  },
  {
    slug: "music",
    label: "음악",
    emoji: "🎵",
    description: "K-pop·플레이리스트·라이브",
    query: "K-pop 플레이리스트",
    color: "pink"
  }
];

export const findYoutubeCategory = (slug) =>
  YOUTUBE_CATEGORIES.find((c) => c.slug === slug) ?? null;
