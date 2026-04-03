## Goal

작업공간 보드 좌하단에 캣 리모콘을 추가해 사용자가 고양이에게 즉시 명령을 내릴 수 있게 한다.

## User-visible outcome

- 작업공간 보드 좌하단에 `캣 리모콘` 버튼 모음이 보인다.
- `왼쪽 점프`, `오른쪽 점프`, `앉아`, `아래 보기`, `깜빡`, `떨어져`를 누르면 고양이가 해당 동작을 수행한다.
- 수동 명령이 끝나면 고양이는 다시 기존 자동 이동 루프로 복귀한다.

## In scope

- `src/components/BoardCatCompanion.tsx`의 수동 명령 주입
- `src/App.tsx`의 리모콘 상태와 버튼 UI
- `src/styles/main.css`의 좌하단 리모콘 스타일

## Out of scope

- 고양이 프레임 파일 변경
- 고양이 기본 자동 이동 규칙 변경
- 랜딩/읽기 전용/홈 보드에 리모콘 노출

## Risks

- 수동 명령이 자동 상태 머신과 충돌해 포즈가 꼬일 수 있음
- 모바일 하단 리모콘이 다른 floating UI와 겹칠 수 있음

## Pass criteria

- `981px+`: 작업공간 보드 좌하단에 캣 리모콘이 보이고 각 버튼이 즉시 동작한다.
- `980px and below`: 모바일 작업공간에서도 리모콘이 보이며 버튼을 눌러도 보드 상호작용이 막히지 않는다.
- 수동 명령이 끝나면 고양이가 다시 기존 걷기/대기/점프 자동 루프로 돌아간다.
- 홈/랜딩/읽기 전용 보드에서는 캣 리모콘이 보이지 않는다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
