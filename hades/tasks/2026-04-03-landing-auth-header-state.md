## Goal

로그인된 상태로 랜딩 페이지를 볼 때 우상단 헤더 액션을 로그인 상태에 맞게 보여준다.

## User-visible outcome

- 로그인되지 않은 상태에서는 기존처럼 `Google로 시작하기` 버튼이 보인다.
- 로그인된 상태에서는 우상단에 프로필 아이콘이 보이고 작업공간으로 돌아갈 수 있다.

## In scope

- `src/features/landing/LandingPage.tsx` 헤더 액션 UI
- `src/App.tsx` 랜딩 페이지에 사용자/이동 핸들러 전달
- `src/styles/main.css` 랜딩 프로필 버튼 스타일

## Out of scope

- 랜딩 본문 CTA 문구 변경
- 작업공간 프로필 메뉴 동작 변경

## Risks

- 모바일 헤더에서 버튼 폭이 바뀌며 줄바꿈이 생길 수 있다.
- 랜딩을 여는 익명 사용자와 로그인 사용자의 이동 경로가 섞일 수 있다.

## Pass criteria

- `981px+`: 로그인 상태에서 `/landing` 진입 시 우상단에 `Google로 시작하기` 대신 프로필 아이콘이 보인다.
- `981px+`: 해당 아이콘을 누르면 작업공간으로 이동한다.
- `980px and below`: 모바일 랜딩 헤더에서도 로그인 상태 UI가 깨지지 않는다.
- 로그아웃 상태 랜딩은 기존 `Google로 시작하기` 버튼을 유지한다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies both auth states on the landing header.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
