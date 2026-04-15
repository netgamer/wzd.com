## Goal

브라우저에서 네트워크 속도와 지연 시간을 간단히 측정하는 인터넷 속도 위젯을 추가한다.

## User-visible outcome

- 위젯 추가 메뉴에서 인터넷 속도 위젯을 만들 수 있다.
- 위젯이 다운로드 속도, 지연 시간, 연결 타입을 보여준다.
- 사용자는 위젯 안에서 다시 측정할 수 있다.

## In scope

- `src/App.tsx` 위젯 타입, 생성, 렌더링, 상태 로딩
- `src/lib/speed.ts` 브라우저 기반 속도 측정 로직
- `src/styles/main.css` 속도 위젯 스타일

## Out of scope

- ISP 수준 정밀 속도 테스트
- 서버 사이드 속도 측정 API
- 실시간 지속 측정 백그라운드 작업

## Risks

- 브라우저/환경에 따라 측정값이 근사치일 수 있다.
- 같은 origin 자산으로 측정하므로 절대값보다 상대적인 체감 지표에 가깝다.

## Pass criteria

- 위젯 갤러리 `정보 & 유틸리티`에 인터넷 속도 위젯이 보인다.
- 위젯 추가 후 최초 측정 결과가 카드에 표시된다.
- `다시 측정`으로 수치를 새로고침할 수 있다.
- 측정 실패 시 카드가 깨지지 않고 오류 메시지를 보여준다.
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
