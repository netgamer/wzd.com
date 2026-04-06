# Task Template

## Goal

링크트리 대체용 템플릿 보드를 스타터 보드 목록에 추가한다.

## User-visible outcome

- 템플릿 보드 목록에서 개인 링크 페이지 용도의 보드를 바로 선택할 수 있다.

## In scope

- `src/App.tsx`의 스타터 보드 정의와 섹션 매핑

## Out of scope

- 랜딩 페이지 수정
- 새로운 위젯 타입 추가

## Risks

- 기존 메모 보드 섹션 카드 수가 늘어나 레이아웃이 답답해질 수 있다.
- 링크트리 느낌이 약하면 기존 꿀팁 링크 보드와 차이가 모호할 수 있다.

## Pass criteria

- `981px+`: 메모 보드 섹션에서 링크트리 대체용 템플릿 카드가 보인다.
- 해당 템플릿은 프로필, 대표 링크, 공지/문의용 카드가 포함된 개인 링크 허브 성격을 가진다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
