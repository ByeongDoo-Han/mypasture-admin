# 작업 계약: MP-35 장별 성경 해설 운영 콘솔

## 목표

관리자가 승인 근거 등록부터 해설 생성, 자동 평가 확인, 수정, 게시와 반려까지 한 화면에서 수행할 수 있게 합니다.

## 담당

- Owner: admin
- Reviewers: qa-security, coordinator
- 최종 통합 담당: coordinator

## 범위

- 포함: 관리자 페이지, 타입 검증, same-origin API proxy, 위험 작업 확인
- 제외: 공개 모바일 해설 UI, 운영 데이터 실제 생성

## 허용 경로

- `src/app/**`
- `src/features/bible-commentary/**`
- `src/features/ai-models/**`
- `src/app/(protected)/ai-models/page.tsx`
- `src/components/AdminNavigation.tsx`
- `.agents/**`

## 공유 계약

- API 요청/응답: mypasture-backend#103 관리자 API
- 이벤트: 없음
- DB 변경: 없음
- 환경변수: 기존 `API_BASE_URL` 사용
- 모바일/관리자 영향: 관리자 메뉴 추가

## 완료 조건

- [x] 근거 등록·승인·폐기
- [x] 단일 장·책 단위 생성
- [x] 평가 결과·작업 실패 확인
- [x] 수정·게시·반려와 검수 사유
- [x] 장별 해설 생성·평가 모델 설정
- [x] 타입 검사와 운영 빌드

## 실행할 검증

```text
npm run typecheck
npm run build:prod
git diff --check
```

## 의존성과 위험

- 선행 작업: mypasture-backend#103
- 충돌 가능 파일: 관리자 내비게이션
- 운영 위험: 대량 생성과 게시 오조작
- 사람의 결정이 필요한 항목: 실제 근거 사용권과 신학 검수
