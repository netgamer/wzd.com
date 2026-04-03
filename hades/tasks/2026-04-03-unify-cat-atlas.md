## Goal

보드 고양이의 모든 주요 포즈를 한 장의 스프라이트 아틀라스로 통합해 포즈 전환 깜빡임을 없앤다.

## User-visible outcome

- 걷기, 대기, 깜빡임, 점프, 낙하 전환이 한 장의 이미지 안에서 부드럽게 바뀐다.
- 포즈가 바뀔 때 0.1초 정도 사라지는 blank frame이 없다.

## In scope

- `public/companions` 통합 스프라이트 아틀라스 생성
- `src/components/BoardCatCompanion.tsx`를 단일 아틀라스 기반 렌더링으로 전환
- 필요 시 관련 스타일 보정

## Out of scope

- 고양이 행동 패턴 변경
- 다른 보드 UI 수정

## Risks

- 프레임 인덱스 매핑을 잘못하면 포즈가 바뀔 수 있다.
- 셀 정렬이 틀리면 점프/대기 포즈 발 위치가 어긋날 수 있다.

## Pass criteria

- 걷기 `04,05,06,72,73,13`가 아틀라스 한 장에서 반복된다.
- 대기 `67/21/17/18`, 위 점프 `82`, 아래 점프/낙하 `78`도 같은 아틀라스를 쓴다.
- 포즈 전환 시 눈에 띄는 깜빡임이 없다.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
