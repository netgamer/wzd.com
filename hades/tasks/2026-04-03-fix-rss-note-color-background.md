## Goal

RSS 리더 카드에도 선택한 메모 색 배경이 적용되게 한다.

## User-visible outcome

- RSS 리더 카드가 흰색 고정이 아니라 선택한 메모 색상에 맞는 배경으로 보인다.

## In scope

- `src/styles/main.css`의 작업공간 RSS 카드 배경 스타일

## Out of scope

- 다른 위젯 카드의 배경 정책 변경
- RSS 카드 내용 구조 변경

## Risks

- RSS 내부 피드 아이템 배경까지 같이 변하면 가독성이 떨어질 수 있다.

## Pass criteria

- `981px+`: 작업공간 RSS 카드에서 `note-yellow`, `note-pink`, `note-blue`, `note-green`, `note-orange`, `note-purple`, `note-mint`, `note-white` 색상이 카드 외곽 배경에 반영된다.
- `980px and below`: 모바일 작업공간 RSS 카드에서도 같은 색상 배경이 유지된다.
- RSS 내부 기사 리스트의 흰색 카드 가독성은 유지된다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
