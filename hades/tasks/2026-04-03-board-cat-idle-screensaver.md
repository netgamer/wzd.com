## Goal

작업공간 고양이를 사용자 입력이 10초 없을 때만 등장하는 idle screensaver 동작으로 바꾼다.

## User-visible outcome

- 작업공간을 사용 중일 때는 고양이가 보이지 않는다.
- 입력이 10초 동안 없으면 고양이가 위에서 떨어지며 등장한다.
- 클릭, 터치, 스크롤, 키 입력, 편집 등 사용자 활동이 발생하면 고양이는 즉시 사라진다.

## In scope

- `src/App.tsx`의 고양이 활성 조건과 idle 타이머 관리
- 작업공간 입력 이벤트를 기반으로 한 고양이 숨김/재등장 제어

## Out of scope

- 고양이 프레임, 이동 로직, 점프 로직 변경
- 랜딩, 공유 보드, 읽기 전용 보드 동작 변경

## Risks

- 입력 이벤트 범위가 부족하면 편집 중에도 고양이가 남을 수 있다.
- idle 타이머가 과하게 초기화되면 고양이가 다시 등장하지 않을 수 있다.

## Pass criteria

- `981px+`: 작업공간에서 입력 직후 고양이가 즉시 사라지고, 10초 무입력 후 위에서 떨어지며 다시 등장한다.
- `980px and below`: 모바일 작업공간에서도 터치/스크롤 후 고양이가 숨고, 10초 무입력 후 다시 등장한다.
- 홈 랜딩, 공유 보드, 읽기 전용 보드에서는 기존처럼 고양이가 나타나지 않는다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
