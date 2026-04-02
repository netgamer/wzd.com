## Goal

이미지 중심 메모 카드의 비선택 상태에서도 제목을 하단에 항상 보여준다.

## User-visible outcome

- 이미지만 크게 보이는 카드도 하단에서 제목을 바로 읽을 수 있다.

## In scope

- `src/App.tsx`의 이미지 카드 비선택 상태 렌더링
- `src/styles/main.css`의 이미지 카드 하단 캡션 스타일

## Out of scope

- 이미지 카드 편집 상태 레이아웃 변경
- 일반 텍스트 메모 카드 레이아웃 변경

## Risks

- 하단 캡션이 hover 본문 오버레이와 겹치면 중복 표시될 수 있다.

## Pass criteria

- `981px+`: 비선택 이미지 카드 하단에 제목이 항상 보인다.
- `980px and below`: 모바일 비선택 이미지 카드에서도 제목이 하단에 보인다.
- 이미지 카드 hover 본문 오버레이가 열릴 때 제목이 이중으로 겹쳐 보이지 않는다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
