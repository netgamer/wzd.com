## Goal

기존 고급 랜딩 페이지를 WZD의 기본 홈 메시지로 다듬고, 그 아래에 위젯 설명과 실제 샘플 내용을 더 풍부하게 보여준다.

## User-visible outcome

- 비로그인 사용자가 첫 화면에서 프리미엄 랜딩 히어로를 본다.
- 히어로 아래에서 위젯 종류별 역할과 실제 카드 안 내용 예시를 바로 이해할 수 있다.
- 메모, 링크 메모, 이미지 메모 샘플이 랜딩 안에서 자연스럽게 이어진다.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`의 `landing-*` 스타일

## Out of scope

- 로그인 후 작업공간 보드 레이아웃 변경
- Supabase 인증 플로우 구조 변경
- 공유 보드 또는 홈 보드 데이터 모델 변경

## Risks

- 랜딩 섹션이 많아지면서 모바일 길이가 과도하게 길어질 수 있다.
- 기존 랜딩 톤을 유지하지 못하면 히어로 품질이 떨어질 수 있다.

## Pass criteria

- `1280px+`에서 기존 프리미엄 히어로가 유지되고, 그 아래에 위젯 설명 섹션과 메모 샘플 섹션이 자연스럽게 이어진다.
- `768px`에서 위젯 설명 카드와 메모 샘플 카드가 겹치지 않고 읽을 수 있다.
- `375px`에서 가로 스크롤 없이 랜딩 전 구간이 한 열 또는 두 열로 정리된다.
- 위젯 섹션에 각 위젯의 역할 설명과 실제 내용 예시가 함께 보인다.
- 메모 섹션에 일반 메모, 하이퍼링크 메모, 이미지 메모 샘플이 모두 보인다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
