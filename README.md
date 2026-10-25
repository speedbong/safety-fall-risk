# 현장안전 · safety-fall-risk

건설현장의 위험을 신고하고 구역별 위험지도와 조치 이력을 확인하는 개인 개발 프로젝트입니다.

- **시작 페이지:** https://speedbong.github.io/safety-fall-risk/
- **현장안전 2.0 실행:** https://field-safety-v2.jjang99213.chatgpt.site/
- **기존 1.0 데모:** https://speedbong.github.io/safety-fall-risk/legacy-v1.html

## 현재 연결 방식

기존 GitHub Pages 주소에는 **2.0 실행 버튼**과 1.0 데모 링크를 제공합니다. 실제 2.0 앱의 로그인·API·신고 DB·사진 저장은 기존 Sites에서 실행됩니다. GitHub Pages로 서버나 데이터를 이전한 것은 아닙니다.

GitHub Pages는 정적 파일 호스팅이므로 현재 2.0의 서버 기능을 직접 실행하지 못합니다. 기존 1.0을 루트의 `legacy-v1.html`로 보존하여 `plan_6f.png` 상대 경로가 계속 작동하도록 했습니다. 1.0은 브라우저 메모리를 사용하는 기존 데모이며 2.0 데이터와 연동되지 않습니다.

**2.0 앱은 기존 비공개 접근 설정을 유지합니다.** 링크를 안다고 다른 사람이 앱을 이용할 수 있는 것은 아닙니다. 운영 신고·사진·DB 파일·환경변수·인증 토큰은 이 저장소에 포함하지 않습니다.

## 파일 구성

| 경로 | 내용 |
| --- | --- |
| `index.html` | GitHub Pages 시작 페이지 및 2.0 실행 링크 |
| `legacy-v1.html` | 반영 직전의 기존 1.0 원본 |
| `plan_6f.png` | 기존 1.0 평면도 이미지 |

## 2.0 구현 기능

로그인, 현장 선택, 작업자/관리자 화면, 신고·사진 저장, 위험 히트맵, CSV, 담당자 및 접수 → 확인 → 조치중 → 완료 이력을 제공합니다. 같은 계정에서 작업자와 관리자 화면을 전환하는 개인 개발용 앱입니다.

2.0 전체 소스는 이 공개 저장소에 아직 업로드하지 않았습니다. 향후 전체 소스를 이관하더라도 GitHub Pages만으로 서버 기능이 실행되지는 않으며, GitHub 커밋이 기존 Sites에 자동 배포되는 것도 아닙니다.

GitHub Pages 관련 설명: [GitHub 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
