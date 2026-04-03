## Goal

보드 고양이의 걷기/점프/대기 애니메이션이 사라진 회귀를 원인 기준으로 복구한다.

## User-visible outcome

- 작업공간 idle 후 등장하는 고양이가 다시 걷기, 점프, 대기 프레임 애니메이션을 보인다.
- 정지 이미지만 보이는 상태가 사라진다.

## In scope

- `src/components/BoardCatCompanion.tsx` 상태 머신과 프레임 선택 로직
- 관련 스타일 또는 프레임 참조가 필요할 경우 해당 파일 최소 수정

## Out of scope

- 고양이 동작 규칙 자체의 신규 UX 변경
- 랜딩, 마켓, 다른 위젯 동작 변경

## Risks

- 최근 idle 등장/보드 전환 리스폰 로직과 충돌할 수 있다.
- 프레임 인덱스 복구 과정에서 좌우 반전이나 대기 포즈 매핑이 다시 깨질 수 있다.

## Pass criteria

- idle 10초 후 등장한 고양이가 걷기 상태에서 여러 프레임으로 순환한다.
- 점프 상태에서 상승/하강 프레임이 정지 이미지가 아니라 각 상태 프레임으로 보인다.
- 대기 상태에서 `17/18` 깜빡임 또는 방향 기반 대기 컷이 다시 동작한다.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the animation states on the board.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
