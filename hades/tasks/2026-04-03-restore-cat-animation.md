## Goal

보드 고양이의 6프레임 걷기 애니메이션과 점프/대기 프레임 전환이 다시 실제로 보이도록 복구한다.

## User-visible outcome

- idle 후 등장한 고양이가 걷기 상태에서 6프레임 애니메이션으로 반복된다.
- 점프와 대기 상태에서도 단일 정지 컷이 아니라 지정된 프레임 전환이 보인다.

## In scope

- `src/components/BoardCatCompanion.tsx` 프레임 순환과 상태 전환 로직
- 필요 시 `src/App.tsx`의 고양이 노출 조건 점검

## Out of scope

- 고양이 신규 UX 변경
- 다른 보드/랜딩/위젯 기능 수정

## Risks

- idle 등장 로직과 충돌해 고양이가 너무 자주 리셋될 수 있다.
- 방향/점프 프레임 매핑을 건드리면 기존 포즈 지정이 깨질 수 있다.

## Pass criteria

- 걷기 상태에서 `04,05,06,72,73,13` 6프레임이 실제로 순환한다.
- 대기 상태에서 `17,18` 깜빡임 또는 방향 기반 대기 컷이 보인다.
- 위로 점프는 `82`, 아래로 점프/낙하는 `78` 프레임으로 보인다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies cat animation on the board.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
