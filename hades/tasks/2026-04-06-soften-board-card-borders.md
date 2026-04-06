# Task Template

## Goal

검은 보드 카드 테두리를 카드 배경 계열의 더 진한 톤으로 바꾼다.

## User-visible outcome

- 메모와 위젯 카드 경계선이 여전히 잘 보이지만 검은 외곽선처럼 과하게 튀지 않는다.

## In scope

- `src/styles/main.css`의 보드 카드 border color 규칙

## Out of scope

- 카드 배경색 자체 변경
- 그림자, 라운드, 레이아웃 변경

## Risks

- 흰색 계열 카드의 경계선이 너무 옅어질 수 있다.
- 다크 테마에서 대비가 다시 낮아질 수 있다.

## Pass criteria

- 라이트 테마 메모/위젯 카드 border가 검정이 아닌 카드 색 계열의 진한 라인으로 보인다.
- 다크 테마 메모/위젯 카드 border도 카드 색과 어울리는 톤으로 유지된다.
- `npm run build`가 통과한다.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
