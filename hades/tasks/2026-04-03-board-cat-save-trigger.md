## Goal

고양이가 마우스 오버나 단순 입력 이벤트가 아니라 실제 저장 관련 변화가 있을 때만 사라지도록 바꾼다.

## User-visible outcome

- 고양이가 나타난 뒤 마우스를 올리거나 움직여도 사라지지 않는다.
- 메모/보드 내용이 실제로 바뀌어 저장 흐름이 발생하면 고양이가 사라진다.
- 저장 이후 다시 10초 동안 변화가 없으면 고양이가 다시 등장한다.

## In scope

- `src/App.tsx`의 board cat idle 트리거 로직

## Out of scope

- 고양이 이동 애니메이션 변경
- 등장 위치나 점프 로직 변경

## Risks

- 저장 판정 범위가 너무 좁으면 편집 후에도 고양이가 남아 있을 수 있다.
- 저장 판정 범위가 너무 넓으면 보드 전환이나 초기 로딩에서 불필요하게 리셋될 수 있다.

## Pass criteria

- `981px+`: 고양이 등장 후 마우스 이동, hover, 스크롤만으로는 사라지지 않는다.
- `981px+`: 메모/보드 변경이 발생하면 고양이가 사라지고 10초 뒤 다시 등장한다.
- `980px and below`: 모바일에서도 단순 터치 탐색만으로는 고양이가 사라지지 않고, 저장성 변화 후에만 리셋된다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the cat only resets on save-related changes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
