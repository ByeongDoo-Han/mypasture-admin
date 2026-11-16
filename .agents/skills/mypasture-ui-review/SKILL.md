---
name: mypasture-ui-review
description: Review My Pasture admin screen design or changes for table and filter usability, permission-sensitive actions, failure states, and responsive layout when UI design or independent review is requested.
---

# 관리자 화면 검토

관리자 화면의 설계·개선 검토에 사용한다. 구현 Owner와 `ui_designer` 검토자의 관계는 [저장소 규칙](../../../AGENTS.md)을 따른다. 검토 요청만 받았다면 제품 파일은 수정하지 않는다.

1. 대상 업무 흐름과 [관리자 디자인 적용 기준](../../../docs/product/admin-design-guidelines.ko.md), 실제 화면·스크린샷을 확인한다. 실행 화면이 없으면 코드에서 확인한 사실과 시각적 추정을 구분한다.
2. 검색·필터·정렬·페이지네이션·상세 편집의 연결, 정보 밀도와 읽기 순서, 좁은 화면의 겹침·가로 스크롤·터치 조작을 확인한다. 기존 UI 규칙에 맞는 조용한 레이아웃을 유지한다.
3. 로딩·빈·오류·부분 실패·재시도 상태와 회원 정지·푸시 발송·리워드 변경의 대상/결과 확인을 점검한다. UI 숨김을 서버 권한 검증으로 오인하지 않는다.
4. 발견마다 화면·상태·재현 조건, 관찰 근거, 영향, 수정 제안과 미확인 사항을 기록해 구현 Owner에게 전달한다. 수정 뒤에는 영향을 받은 흐름을 다시 확인한다.

제품 파일을 수정할 때는 작업 계약의 허용 경로와 요청 범위를 따른다. 실제 운영 데이터나 개인정보를 검토 산출물에 복사하지 않는다.
