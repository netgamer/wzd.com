# agent.md

## 프로젝트 개요
WZD.com 스타일의 개인화 시작페이지를 구현한다.
사용자는 위젯(북마크, 메모, RSS, 실시간 검색어 등)을 추가/삭제하고, 3개 라인(컬럼)에 드래그앤드롭으로 배치하며, 라인 너비를 조절할 수 있어야 한다.
배포는 Cloudflare Pages, 인증은 Google OAuth, 데이터 저장은 Supabase(PostgreSQL)를 기본으로 한다.

## 목표
- 레거시 포털 느낌의 대시보드 UI 재현
- 사용자별 레이아웃/위젯 상태 영구 저장(DB)
- 빠른 초기 렌더링과 부드러운 DnD UX
- Git 기반 자동 배포 파이프라인 구성

## 핵심 기능 요구사항

### 1) 레이아웃 시스템
- 기본 레이아웃은 3개 컬럼
- 각 컬럼은 가로 너비를 드래그로 늘리거나 줄일 수 있음
- 컬럼 내부 위젯은 세로 스택 구조
- 위젯은 컬럼 간 이동 가능
- 위젯 순서 변경 가능(드래그앤드롭)
- 반응형: 데스크톱 우선, 태블릿/모바일에서는 1~2컬럼으로 자동 축소

### 2) 위젯 관리
- 상단 `콘텐츠 추가` 버튼 제공
- 클릭 시 위젯 갤러리(모달/패널) 오픈
- 위젯 추가 시 기본 설정값으로 생성
- 위젯 최소 기능:
  - 북마크: 폴더/링크 추가, 삭제, 정렬
  - 메모: 텍스트 입력 자동 저장
  - RSS: 피드 URL 등록, 항목 리스트 표시
  - 실시간 검색어: 외부 API 또는 더미/모의 데이터 소스 지원
- 위젯 공통 기능:
  - 접기/펼치기
  - 삭제
  - 설정(타이틀/데이터소스/표시 개수)

### 3) 인증/사용자
- 로그인 기본 방식은 Google OAuth 단일 로그인
- 미로그인 사용자는 읽기 전용 또는 로컬 임시 저장만 허용
- 로그인 사용자는 사용자별 레이아웃/콘텐츠를 DB에 저장
- 세션 관리는 Supabase Auth를 사용

### 4) 데이터 저장
- 저장 대상:
  - 컬럼 너비
  - 위젯 위치/순서
  - 위젯별 설정값
  - 사용자 콘텐츠(북마크/메모 등)
- DB는 Supabase PostgreSQL 사용
- Row Level Security(RLS)로 `auth.uid() = user_id` 정책 적용
- 로컬 캐시는 UX 개선용으로만 사용하고, 원본은 DB 기준으로 동기화

### 5) 배포/운영
- 저장소(GitHub 권장)와 Cloudflare Pages 연동
- `main` 브랜치 머지 시 프로덕션 자동 배포
- PR 브랜치는 Preview 배포 사용
- 환경변수는 Cloudflare Pages 대시보드에서 관리
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_APP_ENV`

### 6) 상단/하단 UI
- 상단 바:
  - 로고 영역
  - `콘텐츠 추가` 버튼
  - 페이지/테마/설정 메뉴 자리
  - 로그인 사용자 정보/로그아웃
- 하단 바:
  - 간단한 링크 영역(피드백/도움말 등)

## 비기능 요구사항
- 위젯 이동/리사이즈 시 60fps에 가깝게 동작
- 데이터 손실 방지(편집 즉시 저장 또는 debounce 저장)
- 접근성:
  - 키보드 포커스 가능
  - 버튼/아이콘 aria-label 제공
- 브라우저 지원: 최신 Chrome/Edge/Safari
- 보안:
  - 키는 공개 가능한 anon key만 클라이언트 사용
  - 서비스 키는 클라이언트 금지

## 권장 기술 스택
- Frontend: React + TypeScript + Vite
- 상태관리: Zustand
- DnD: dnd-kit
- Resizable: react-resizable 또는 커스텀 splitter
- 스타일: CSS Modules 또는 Tailwind(레트로 스킨은 CSS 변수 기반)
- Auth/DB: Supabase Auth + Supabase Postgres
- Deploy: Cloudflare Pages

## 데이터 모델(초안)

```ts
export type WidgetType = 'bookmark' | 'memo' | 'rss' | 'trend';

export interface DashboardState {
  columns: {
    id: string;
    width: number;
    widgetIds: string[];
  }[];
  widgets: Record<string, WidgetInstance>;
}

export interface WidgetInstance {
  id: string;
  userId: string;
  type: WidgetType;
  title: string;
  collapsed: boolean;
  settings: Record<string, unknown>;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}
```

## 구현 순서(권장)
1. 프로젝트 초기화(Vite + React + TS)
2. Git 저장소 생성 및 원격 연결(GitHub)
3. Supabase 프로젝트 생성(Auth: Google, DB 스키마/RLS 구성)
4. Cloudflare Pages에 저장소 연결(빌드/환경변수 설정)
5. 3컬럼 고정 레이아웃 + 컬럼 너비 조절(splitter) 구현
6. 위젯 카드 공통 컴포넌트(헤더/바디/툴버튼) 구현
7. dnd-kit으로 컬럼 내/컬럼 간 이동 구현
8. `콘텐츠 추가` 패널 + 위젯 생성 플로우 구현
9. 북마크/메모/RSS/실검 위젯 최소 기능 구현
10. Supabase CRUD 연결 및 자동 저장 연결
11. 레트로 테마 스타일 튜닝(회색 패턴 배경, 패널 음영, 작은 타이포)
12. QA(새로고침 복원, OAuth 로그인, DnD 안정성, 리사이즈 경계값)

## 완료 기준(Definition of Done)
- Google 로그인 후 사용자별 대시보드가 로드된다.
- 새 위젯을 추가하고 원하는 컬럼/위치로 이동할 수 있다.
- 3개 컬럼 너비를 사용자가 조절할 수 있다.
- 새로고침/재로그인 후에도 레이아웃/콘텐츠가 유지된다.
- 북마크, 메모, RSS, 실시간 검색어 위젯이 각각 동작한다.
- `main` 반영 시 Cloudflare Pages에 자동 배포된다.

## 주의사항
- `기존 사이트와 완전히 동일`이 아니라 `동일한 사용 경험과 핵심 기능`을 목표로 한다.
- 로고/브랜드/원본 리소스는 직접 복제하지 않고 자체 에셋으로 대체한다.
- 외부 API 사용 시 서비스 약관/쿼터/저작권을 준수한다.

## 서브 에이전트

### 디자이너 서브 에이전트
- 파일: `designer-agent.md`
- 역할: WZD 스타일의 시각 언어(레이아웃 밀도, 타이포, 컬러, 패널 질감, 아이콘 톤)를 일관되게 정의하고 검수
- 호출 시점:
  - UI 컴포넌트 제작 전(디자인 토큰/가이드 선행 정의)
  - 신규 위젯 추가 시(카드 규격/헤더/상태/인터랙션 규칙 적용)
  - 릴리스 전(시각 일관성/가독성/정보 밀도 최종 점검)
- 산출물:
  - 디자인 토큰(CSS 변수)
  - 컴포넌트별 스타일 규칙
  - 상태별(기본/호버/포커스/드래그중/비활성) 명세
  - QA 체크리스트
