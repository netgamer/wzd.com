# Task Template

## Goal

Midnight Ops와 Neon Lab의 메모 배경 팔레트를 더 고급스럽고 절제된 다크 톤으로 다듬는다.

## User-visible outcome

- 어두운 테마 메모 카드가 탁한 원색 대신 소재감 있는 프리미엄 다크 팔레트로 보인다.

## In scope

- `src/styles/main.css`의 다크 테마 메모, 링크 카드, RSS 카드 배경/테두리 색

## Out of scope

- 라이트 테마 팔레트 변경
- 레이아웃, 타이포, 그림자 변경

## Risks

- 색을 너무 눌러서 카드 구분이 약해질 수 있다.
- 텍스트 대비가 다시 낮아질 수 있다.

## Pass criteria

- `981px+`: Midnight Ops와 Neon Lab에서 메모 카드가 올리브/원색 느낌보다 절제된 다크 톤으로 보인다.
- `981px+`: 링크 카드와 RSS 카드도 같은 계열 다크 팔레트를 사용한다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
