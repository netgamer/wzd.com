## Goal

모바일에서 새 메모 생성 후 해당 카드로 스크롤한 다음 바로 편집 상태로 진입하게 한다.

## User-visible outcome

- 모바일에서 `+`로 새 메모를 만들면 새 메모 위치로 이동한 뒤 즉시 입력 커서가 들어간다.

## In scope

- `src/App.tsx`의 모바일 새 메모 자동 스크롤 후 포커스 처리

## Out of scope

- 기존 메모 선택 시 자동 포커스 동작 변경
- 데스크톱 새 메모 포커스 흐름 변경

## Risks

- 포커스를 너무 일찍 주면 스크롤이 어긋날 수 있다.
- 모바일 키보드 오픈 타이밍에 따라 뷰포트가 다시 흔들릴 수 있다.

## Pass criteria

- `980px and below`: 모바일에서 새 메모 생성 시 해당 카드로 이동하고 본문 편집 커서가 바로 들어간다.
- `981px+`: 데스크톱 새 메모 생성 흐름은 기존과 동일하다.
- 기존 메모를 선택할 때는 같은 자동 포커스가 불필요하게 다시 실행되지 않는다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
