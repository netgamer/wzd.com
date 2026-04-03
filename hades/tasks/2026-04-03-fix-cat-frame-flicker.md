## Goal

보드 고양이 포즈가 바뀔 때 이미지 교체로 인한 깜빡임을 없앤다.

## User-visible outcome

- 걷기, 대기, 점프, 낙하 포즈 전환 시 0.1초 정도 사라졌다가 다시 보이는 깜빡임이 없다.

## In scope

- `src/components/BoardCatCompanion.tsx` 이미지 로드/전환 방식 개선
- 필요 시 관련 스타일 보정

## Out of scope

- 고양이 행동 패턴 변경
- 다른 보드 UI 수정

## Risks

- 프리로드 방식이 잘못되면 초기 등장 지연이나 메모리 사용이 늘 수 있다.

## Pass criteria

- 고양이 포즈 전환 시 눈에 띄는 blank frame이 없다.
- 걷기 6프레임 스프라이트 애니메이션은 유지된다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
