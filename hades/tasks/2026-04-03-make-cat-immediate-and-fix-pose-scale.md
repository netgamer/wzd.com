## Goal

보드 고양이를 idle 대기 없이 바로 등장시키고, 걷기 외 포즈가 원본 비율로 보이도록 고친다.

## User-visible outcome

- 보드가 열리면 고양이가 바로 등장한다.
- 위보기, 아래보기, 앉기, 점프, 낙하 포즈가 세로로 늘어나지 않는다.

## In scope

- `src/App.tsx` 고양이 노출 조건 단순화
- `src/components/BoardCatCompanion.tsx` 비걷기 프레임 렌더링 비율 보정
- 필요 시 관련 스타일 보정

## Out of scope

- 고양이 행동 패턴 변경
- 다른 보드 UI 수정

## Risks

- 보드 전환 시 고양이 재등장 타이밍이 바뀔 수 있다.
- 포즈 정렬 기준을 잘못 잡으면 카드 위선과 발 위치가 어긋날 수 있다.

## Pass criteria

- 보드 진입 후 idle 10초 대기 없이 고양이가 바로 등장한다.
- 걷기 외 포즈도 비정상적으로 커지거나 세로로 늘어나지 않는다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
