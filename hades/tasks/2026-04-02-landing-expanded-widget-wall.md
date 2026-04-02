## Goal

현재 랜딩페이지 하단에 예전 보드형 홈처럼 카드가 많이 보이는 확장 위젯 월을 추가한다.

## User-visible outcome

- 기존 랜딩 카피와 구조는 유지된다.
- 기존 설명 섹션 아래에서 위젯과 메모가 많이 깔린 실전 보드형 샘플 구간을 볼 수 있다.
- 위젯이 많은 보드라는 인상이 랜딩 하단에서 더 강하게 전달된다.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`

## Out of scope

- 로그인 후 작업공간 레이아웃 변경
- 랜딩 상단 히어로 카피 변경
- 인증 플로우 변경

## Risks

- 카드 수가 많아지면 모바일에서 길이가 과해질 수 있다.
- 기존 설명 섹션과 시각적 톤이 어긋날 수 있다.

## Pass criteria

- `1280px+`에서 기존 랜딩 아래에 카드가 많이 보이는 보드형 섹션이 추가된다.
- `768px`에서 카드가 2열 또는 읽기 쉬운 밀도로 정리된다.
- `375px`에서 카드가 1열로 정리되고 가로 스크롤이 생기지 않는다.
- 기존 위젯 설명 섹션, 메모 샘플 섹션, 최종 CTA는 유지된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
