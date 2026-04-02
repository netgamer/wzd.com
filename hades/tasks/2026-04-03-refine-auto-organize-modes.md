# Task Template

## Goal

보드 자동 정리 스타일을 `콤팩트형`과 `종류별 정리` 기준으로 실제 동작과 설명이 맞게 고친다.

## User-visible outcome

- `콤팩트형`은 낮은 컬럼을 우선 채워 스크롤을 줄이는 방향으로 정리된다.
- 세 번째 정리 스타일은 종류별 정리로 보이고, 메모와 위젯 비중에 따라 한쪽씩 묶여 정리된다.

## In scope

- `C:\Users\junho\Documents\code\wzd.com\src\App.tsx`의 자동 정리 스타일 라벨/설명
- `C:\Users\junho\Documents\code\wzd.com\src\App.tsx`의 자동 정리 컬럼 우선순위 로직

## Out of scope

- 보드 카드 디자인
- 수동 드래그 정렬 UX

## Risks

- 기존 `visual` 저장값을 쓰는 보드가 다른 방식으로 재정렬될 수 있다.

## Pass criteria

- `콤팩트형`: 낮은 컬럼 우선 정리로 여백을 줄인다
- 세 번째 스타일은 종류별 정리 문구로 보인다
- 메모가 많으면 메모 카드가 한쪽 컬럼군에, 위젯이 많으면 위젯 카드가 한쪽 컬럼군에 우선 배치된다
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
- `/gstack-cso`
