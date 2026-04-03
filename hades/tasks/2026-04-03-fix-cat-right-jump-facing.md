## Goal

고양이가 오른쪽으로 점프할 때 점프 포즈도 진행 방향에 맞게 우측 반전되도록 고친다.

## User-visible outcome

- 오른쪽으로 점프하면 82 프레임이 오른쪽을 바라본다.
- 왼쪽 점프는 기존처럼 유지된다.

## In scope

- `src/components/BoardCatCompanion.tsx` 점프 방향 계산/적용
- 필요 시 관련 스타일 보정

## Out of scope

- 고양이 다른 행동 로직 변경
- 다른 보드 UI 변경

## Risks

- 방향 계산을 잘못 건드리면 착지 후 걷기 방향이 다시 꼬일 수 있다.

## Pass criteria

- 오른쪽 점프 시 점프 포즈가 오른쪽을 향한다.
- 왼쪽 점프 시 점프 포즈는 기존처럼 왼쪽을 향한다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
