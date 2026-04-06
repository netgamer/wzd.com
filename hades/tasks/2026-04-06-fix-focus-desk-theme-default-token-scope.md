## Goal

Focus Desk 테마에서 기본 버튼/패널 색 토큰이 사라지는 변수 스코프 문제를 고친다.

## User-visible outcome

- Focus Desk에서 새 메모와 위젯 추가 버튼이 정상 색으로 보인다.
- 기본 보드 테마 토큰이 사이드바 밖 헤더와 패널에도 안정적으로 적용된다.

## In scope

- `src/styles/main.css`의 board theme CSS variable scope 정리

## Out of scope

- 새 테마 추가
- UI 구조 변경

## Risks

- 기본 토큰을 루트로 옮길 때 기존 테마 override 우선순위가 깨지지 않아야 한다.

## Pass criteria

- Focus Desk에서 `새 메모`, `위젯 추가`, `보드 설정` 버튼이 선명하게 보인다.
- 다른 테마 회귀 없이 `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
