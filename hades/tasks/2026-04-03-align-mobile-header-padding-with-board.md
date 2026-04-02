# Task Template

## Goal

모바일 작업공간 헤더의 좌우 인셋을 메모 영역 라인과 맞춘다.

## User-visible outcome

- 모바일에서 헤더 카드 시작선이 아래 메모 영역 시작선과 맞아 보인다.

## In scope

- `C:\Users\junho\Documents\code\wzd.com\src\styles\main.css`의 모바일 `workspace-topbar` 마진

## Out of scope

- 데스크톱 헤더 레이아웃
- 보드 카드 내부 패딩

## Risks

- 헤더 폭이 좁아지면서 제목과 액션 버튼 간격이 답답해질 수 있다.

## Pass criteria

- `680px and below`: 작업공간 헤더 좌우 시작선이 메모 영역과 더 가깝게 맞는다
- 모바일 헤더 버튼 배치가 깨지지 않는다
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
- `/gstack-cso`
