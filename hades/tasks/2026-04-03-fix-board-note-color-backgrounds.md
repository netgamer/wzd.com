# Task Template

## Goal

작업공간 메모 카드의 색상 배경이 실제 카드 표면에 보이도록 복구한다.

## User-visible outcome

- 새 메모와 일반 메모 카드가 선택된 색상에 맞는 배경으로 보인다.

## In scope

- `C:\Users\junho\Documents\code\wzd.com\src\styles\main.css`의 작업공간 메모 카드 배경 스타일

## Out of scope

- 이미지 카드 배경
- 랜딩 페이지 카드 색상 시스템
- 위젯 전용 카드 색상 체계

## Risks

- 링크 카드, 문서 카드 같은 특수 카드 스타일을 덮어쓸 수 있다.

## Pass criteria

- 작업공간 일반 메모 카드에 `yellow`, `mint`, `blue`, `pink` 등 색상 배경이 보인다
- 이미지 카드와 특수 카드 스타일은 유지된다
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
- `/gstack-cso`
