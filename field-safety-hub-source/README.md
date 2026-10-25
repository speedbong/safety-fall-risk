# Field Safety Hub · 현장안전 허브 2.0

GitHub Pages에서 실행하는 위험 신고·히트맵·조치관리 웹앱입니다. React/TypeScript 화면은 정적 파일로 배포하고, 이메일 로그인과 신고·사진 저장은 Supabase를 사용합니다. GPT/Sites 서버로 이동하거나 해당 서버 API를 호출하지 않습니다.

## 현재 상태

화면, Supabase 클라이언트, DB 스키마, 사진 접근 정책, 조치 RPC와 로컬 검증이 준비되어 있습니다. `public/config.js`의 프로젝트 URL과 Publishable key가 비어 있으면 서버 연결 준비 화면을 표시하며 신고나 로그인을 수행하지 않습니다. 실제 Supabase 프로젝트 설정과 연결 검증을 완료해야 사용할 수 있습니다.

## 구현 범위

- 이메일 로그인·가입·비밀번호 재설정
- 현장 선택, 같은 계정의 작업자/관리자 화면 전환
- 1~6층·34개 구역·위험유형·사진 신고
- 계정별 서버 저장, 위험 히트맵·유형 통계·검색·CSV
- 담당자 지정, 접수 → 확인 → 조치중 → 완료, 조치 이력·사진
- 샘플 8건 추가·샘플만 삭제, QR 출입·식권 데모
- 상대 경로 기반 배포 및 홈 화면 설치용 매니페스트

작업자와 관리자는 **같은 계정에서 전환하는 화면**입니다. 현장별 여러 사람의 역할·권한 관리는 포함하지 않습니다. 같은 계정의 여러 기기는 같은 서버 데이터를 읽지만 다른 계정의 데이터는 분리됩니다. 위치는 수동 선택이며 실제 UWB 측정은 포함하지 않습니다.

## 개발

Node.js 22.13 이상을 사용합니다. 모든 패키지 버전과 lockfile을 고정했습니다.

```sh
npm ci
npm run check
npm test
npm run build
```

Supabase SDK 2.116.0의 UMD 파일과 MIT 라이선스는 `public/vendor/`에 보관합니다. npm 원본 아티팩트와 파일 해시는 `public/vendor/versions.json`에 기록되어 있습니다. 실행 중 외부 CDN에서 코드를 다운로드하지 않습니다.

## Supabase 연결

1. 사용할 프로젝트에서 `supabase/schema.sql`을 검토한 뒤 실행합니다. 동일 SQL은 Supabase CLI로 생성한 `supabase/migrations/` 파일에도 보관되어 있습니다.
2. `fsh_*` 테이블 RLS, `fsh_private` 스키마의 비공개 처리 함수, 공개 호출용 RPC, 비공개 `field-safety-photos` 버킷의 정책을 확인합니다. 기존에 같은 이름의 버킷이 있다면 `public=false`, 최대 5MB와 JPG/PNG/WEBP 제한을 확인합니다.
3. Supabase Auth에서 이메일 로그인을 사용하고 Site URL 및 Redirect URLs에 실제 GitHub Pages 앱 URL을 등록합니다. 예: `https://speedbong.github.io/safety-fall-risk/field-safety-hub/`.
4. `public/config.js`에 프로젝트 URL과 `sb_publishable_`로 시작하는 브라우저용 Publishable key만 넣습니다. Secret 또는 service_role 키는 넣지 않습니다.
5. 다시 빌드하고 `dist/`를 새 페이지 폴더에 배포합니다.

DB 쓰기는 인증 사용자 ID로 제한하는 트랜잭션 RPC만 허용합니다. 계정 ID를 클라이언트에서 보내도 소유자를 바꾸지 못합니다. 직접 테이블 수정은 거부합니다. 사진은 사용자 ID별 경로에 저장하며 임시 서명 URL로만 표시합니다. 원본 측위값이나 서버 권한 키는 프론트엔드에 포함하지 않습니다.

## 검증

`npm test`는 PGlite(Postgres 호환 로컬 엔진)에 인증 역할과 Storage 메타데이터를 구성하여 실제 SQL을 실행합니다. 로그인 전 차단, 계정·현장 분리, 잘못된 위치·내용·사진 거부, 중복 신고 재시도, 상태 순서·담당자·완료 내용 검사, 오래된 화면의 충돌, 조치 이력의 원자적 저장, 샘플 삭제 후 실제 신고 보존 등 40개 검사를 통과했습니다. 공개 키 및 이미지 파일 서명 검사도 포함합니다.

이 결과는 Supabase Auth/Storage HTTP 서버의 실연결 검증을 대신하지 않습니다. 실제 연결 후 이메일 로그인, 사진 업로드, 다른 기기 재조회, 비밀번호 재설정과 사용자 간 접근 차단을 추가 확인해야 합니다. 서버 설정 전에는 제품을 운영 가능 상태로 표시하지 않습니다.

## 배포와 데이터

GitHub Pages에는 `dist/`의 정적 파일을 배포합니다. `base: './'`를 사용하여 기존 홈페이지와 다른 하위 경로에서도 실행합니다. 서비스워커는 API·사진·계정 정보를 캐시하지 않고 인터넷 연결이 필요합니다.

기존 1.0 홈페이지와 GPT/Sites 2.0 데이터는 자동 변경·복사하지 않습니다. 사진 업로드 후 신고를 취소하면 참조되지 않은 파일이 남을 수 있어 운영 단계에서 별도 정리 작업이 필요합니다.
