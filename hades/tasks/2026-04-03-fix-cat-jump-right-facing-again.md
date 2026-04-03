## Goal

고양이가 왼쪽에서 오른쪽으로 점프할 때 점프 포즈도 오른쪽을 바라보도록 수정한다.

## User-visible outcome

- 오른쪽 점프 시 고양이 포즈가 오른쪽을 향한다.
- 왼쪽 점프 시 기존 방향은 유지된다.

## In scope

- `src/components/BoardCatCompanion.tsx` 점프 방향 계산
- 필요 시 관련 스타일 보정

## Out of scope

- 고양이 다른 행동 로직 변경
- 다른 보드 UI 변경

## Risks

- 방향 계산 수정이 착지 후 보행 방향에 영향을 줄 수 있다.

## Pass criteria

- 오른쪽 점프 시 점프 포즈가 오른쪽을 향한다.
- 왼쪽 점프 시 점프 포즈는 왼쪽을 향한다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
