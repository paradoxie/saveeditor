---
title: "NaniNovel 세이브 편집 가이드: .nson 파일 완전 해설"
description: "NaniNovel 비주얼 노벨 세이브 파일(.nson) 편집 방법을 배우세요. NSON 형식 구조, 압축 알고리즘, 변수 수정, 문제 해결 팁까지 완벽 가이드."
pubDate: 2025-12-08
tags: ["naninovel", "visual-novel", "guide", "tutorial", "nson"]
author: "SaveEditor Team"
image: "/images/blog/naninovel-cover.webp"
---

## NaniNovel 세이브 파일 소개

![NaniNovel 세이브 에디터 인터페이스](/images/blog/naninovel-content.webp)

[NaniNovel](https://naninovel.com/)은 Unity 기반의 강력한 비주얼 노벨 엔진으로, 인디 개발자와 스튜디오 사이에서 큰 인기를 얻고 있습니다. 일반적인 Unity 세이브와 달리, NaniNovel은 게임 상태를 저장하기 위해 독자적인 **NSON 형식**(`.nson` 파일)을 사용하므로 전문적인 처리가 필요합니다.

이 가이드에서는 파일 형식 이해부터 안전한 게임 진행 수정까지, NaniNovel 세이브 파일 편집에 필요한 모든 것을 알려드립니다.

## NSON 파일 형식 이해하기

NaniNovel의 NSON 형식은 기본적으로 **압축된 JSON 데이터**입니다:

### 기술적 구조

```
┌─────────────────────────────────┐
│     Raw DEFLATE 압축            │
│     (zlib 헤더 없음)             │
├─────────────────────────────────┤
│                                 │
│        JSON 게임 상태            │
│    - 글로벌 변수                 │
│    - 스크립트 위치               │
│    - 선택 기록                   │
│    - 해금된 콘텐츠               │
│                                 │
└─────────────────────────────────┘
```

### 주요 특징

1. **Raw DEFLATE 압축**: 표준 zlib과 달리 헤더 없는 Raw DEFLATE 사용
2. **JSON 코어**: 기본 데이터는 표준 JSON 형식으로, 압축 해제 후 읽기 가능
3. **UTF-8 인코딩**: 모든 텍스트는 UTF-8 형식으로 저장
4. **암호화 없음**: NaniNovel은 기본적으로 세이브 파일을 암호화하지 않음

## NaniNovel 세이브 내용

NSON 파일을 압축 해제하면 다음을 포함하는 구조화된 JSON 객체를 찾을 수 있습니다:

### 글로벌 상태 변수

```json
{
  "GlobalState": {
    "variableMap": {
      "g_affection_sarah": 85,
      "g_story_chapter": 3,
      "g_ending_unlocked": true,
      "g_coins": 1500
    }
  }
}
```

### 스크립트 실행 상태

- **현재 스크립트**: 실행 중인 스크립트 파일
- **스크립트 라인**: 내러티브 내 정확한 위치
- **롤백 히스토리**: 되돌리기 기능을 위한 이전 상태 스택

### 플레이어 선택

- **선택 기록**: 모든 플레이어 결정의 기록
- **분기 플래그**: 어떤 스토리 분기를 방문했는지
- **해금된 갤러리**: 해금된 CG 이미지와 보너스

## 단계별 편집 가이드

### 1단계: 세이브 파일 찾기

NaniNovel 세이브 파일은 일반적으로 다음 위치에 저장됩니다:

**Windows:**
```
%AppData%\..\LocalLow\[회사명]\[게임명]\Saves\
```

**macOS:**
```
~/Library/Application Support/[회사명]/[게임명]/Saves/
```

### 2단계: 백업 만들기

수정 전에 **항상 세이브 파일을 백업**하세요:

```bash
cp GlobalSaveSlot.nson GlobalSaveSlot.nson.backup
```

### 3단계: 에디터에 업로드

1. [NaniNovel 세이브 에디터](/ko/editor/naninovel)로 이동
2. `.nson` 파일을 업로드 영역에 드래그 앤 드롭
3. 자동 압축 해제 및 파싱 대기

에디터가 JSON 구조를 탐색하기 쉬운 트리 뷰로 표시합니다.

### 4단계: 값 수정

일반적인 수정 사항:

#### 호감도/친밀도 포인트 수정

```json
"g_affection_character1": 50  →  "g_affection_character1": 100
```

#### 모든 엔딩 해금

```json
"g_ending_a_unlocked": false  →  "g_ending_a_unlocked": true
```

#### 게임 내 화폐 추가

```json
"g_coins": 100  →  "g_coins": 99999
```

### 5단계: 다운로드 및 교체

1. **수정된 세이브 다운로드** 클릭
2. 원본 파일을 수정된 버전으로 교체
3. 게임을 실행하여 변경 사항 확인

## 여러 세이브 형식

| 형식 | 확장자 | 압축 | 지원 |
|------|--------|------|------|
| NSON (기본) | `.nson` | Raw DEFLATE | ✅ 완전 지원 |
| JSON (디버그) | `.json` | 없음 | ✅ 완전 지원 |
| Base64 JSON | `.json` | Base64 | ✅ 완전 지원 |
| Gzip JSON | `.json` | Gzip | ✅ 완전 지원 |

## 문제 해결

### 세이브 파일이 로드되지 않음

**해결책**:
1. 올바른 세이브 슬롯을 편집하고 있는지 확인
2. JSON 구문이 유효한지 확인
3. 백업에서 복원 후 다시 시도

### 변경 사항이 반영되지 않음

**가능한 원인**:
1. **클라우드 세이브 충돌**: Steam/Unity 클라우드 동기화 비활성화
2. **잘못된 파일**: NaniNovel은 글로벌용과 슬롯용으로 별도 파일 사용

## 관련 도구

- [Unity PlayerPrefs 에디터](/ko/editor/unity) – 표준 Unity 세이브용
- [Ren'Py 세이브 뷰어](/ko/editor/renpy) – Python 기반 비주얼 노벨용
- [세이브 파일 확장자 가이드](/blog/ko/common-save-file-extensions-explained)

## 결론

NaniNovel의 NSON 형식은 압축을 사용하지만, 구조를 이해하면 기본적으로 접근 가능합니다. 저희 온라인 에디터가 압축 해제와 재압축의 기술적 복잡성을 처리하여, 원하는 변경에 집중할 수 있게 해드립니다.

항상 세이브를 백업하고, 문제가 발생하거나 제안 사항이 있으면 [문의하기](/ko/contact)로 연락주세요!

## 관련 리소스

- 📖 [NaniNovel 공식 문서](https://naninovel.com/guide/) - 공식 문서
- 🎮 [DDLC 게임 페이지](/ko/games/ddlc) - 또 다른 인기 비주얼 노벨
- 📂 [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained) - 다양한 형식 이해하기
- 🔧 [NaniNovel 에디터](/ko/editor/naninovel) - 이 가이드에서 사용한 도구
- 🎭 [Ren'Py 세이브 가이드](/ko/blog/renpy-save-editing-guide) - Python 기반 비주얼 노벨 엔진

---

*마지막 업데이트: 2025년 12월*

### 관련 문서

- [Unity PlayerPrefs 에디터](/ko/editor/unity)
- [Ren'Py 세이브 뷰어](/ko/editor/renpy)
- [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained)

