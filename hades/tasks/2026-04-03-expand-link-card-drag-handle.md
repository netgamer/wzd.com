## Goal

링크 전용 카드의 상단 드래그 가능 영역을 넓혀 이동을 더 쉽게 만든다.

## User-visible outcome

- 링크만 있는 카드에서 상단 좁은 선 부분만이 아니라, hover 시 수정/삭제 버튼이 뜨는 상단 영역 전체로 카드를 더 쉽게 이동할 수 있다.

## In scope

- `src/styles/main.css`의 `link-only-note` 상단 헤더/액션 영역

## Out of scope

- 일반 메모 카드의 드래그 방식 변경
- 링크 카드 본문 레이아웃 변경

## Risks

- 상단 오버레이가 너무 넓으면 링크 카드 클릭 경험을 방해할 수 있다.

## Pass criteria

- `981px+`: 링크 전용 카드 상단에서 hover 버튼이 뜨는 영역만큼 넓은 드래그 가능한 체감 영역이 생긴다.
- `980px and below`: 모바일 레이아웃에는 클릭/터치 레이아웃 회귀가 없다.
- 수정/삭제 버튼 노출과 클릭 동작은 유지된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
