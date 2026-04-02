## Goal

랜딩 히어로 우측 샘플 카드가 실제 위젯처럼 보이도록 미니 위젯 UI를 추가한다.

## User-visible outcome

- 히어로 문구와 오른쪽 샘플이 더 잘 맞는다.
- 체크리스트, 디데이, 시간표, 날씨 같은 위젯형 시각 요소가 즉시 보인다.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`

## Out of scope

- 랜딩 본문 섹션 구조 변경
- 로그인 후 작업공간 변경

## Risks

- 히어로 패널이 과밀해질 수 있다.

## Pass criteria

- 히어로 오른쪽 6개 카드 중 여러 개가 실제 위젯 UI처럼 보인다.
- `1280px+`에서 카드가 깨지지 않는다.
- `375px`에서 히어로 패널이 한 열로 정리된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
