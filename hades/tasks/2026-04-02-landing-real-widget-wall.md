## Goal

랜딩 하단의 확장 카드 구간을 메모형 카드가 아니라 실제 위젯 UI 샘플 중심으로 바꾼다.

## User-visible outcome

- 기존 랜딩 히어로와 설명 섹션은 유지된다.
- 하단 확장 구간에서 RSS, 날씨, 체크리스트, 시간표, 배송 추적 같은 실제 위젯형 카드가 보인다.
- 사용자가 “메모 앱”이 아니라 “위젯 보드”라는 인상을 더 강하게 받는다.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`

## Out of scope

- 로그인 후 작업공간 보드 변경
- 랜딩 상단 히어로 문구 변경
- 인증 플로우 변경

## Risks

- 위젯형 카드가 많아지면 CSS 복잡도가 올라갈 수 있다.
- 모바일에서 카드 내용이 과밀해질 수 있다.

## Pass criteria

- `1280px+`에서 확장 구간 카드 다수가 메모형 카드가 아니라 실제 위젯 UI처럼 보인다.
- 확장 구간에 RSS, 날씨, 체크리스트, 디데이, 시간표, 배송 추적, 프롬프트 중 여러 위젯이 포함된다.
- `768px`에서 카드가 2열로 정리되고 읽을 수 있다.
- `375px`에서 카드가 1열로 정리되고 가로 스크롤이 생기지 않는다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
