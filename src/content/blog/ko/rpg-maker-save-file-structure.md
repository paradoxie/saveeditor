---
title: "RPG 만들기 세이브 파일 구조 해설 - MV, MZ, VX Ace 가이드"
description: "RPG 만들기 세이브 파일 구조를 완전 해설. .rpgsave, .rmmzsave, .rvdata2 포맷과 데이터 저장 방식을 배웁니다. 세이브 편집과 게임 개발에 최적."
pubDate: 2025-12-25
tags: ["rpg-maker", "rpgsave", "guide", "technical"]
author: "SaveEditor Team"
image: "/images/blog/rpg-maker-cover.webp"
---

## 소개

RPG 만들기는 수십 년간 게임 제작자들을 지원해 왔습니다. MV와 MZ부터 VX Ace와 이전 버전까지. 세이브를 편집하려는 플레이어든 게임을 디버깅하려는 개발자든, **RPG 만들기 세이브 파일 구조** 를 이해하는 것은 매우 중요합니다.

이 가이드에서는 RPG 만들기가 세이브 데이터를 어떻게 저장하는지, 각 속성의 의미, 그리고 무료 **RPG 만들기 세이브 에디터** 를 사용하여 안전하게 편집하는 방법을 자세히 설명합니다.

## 버전별 세이브 포맷

| 엔진 | 확장자 | 포맷 | 암호화 |
|-----|--------|------|--------|
| **RPG 만들기 MZ** | .rmmzsave | JSON (Base64) | 선택 |
| **RPG 만들기 MV** | .rpgsave | JSON (Base64 + LZString) | 선택 |
| **RPG 만들기 VX Ace** | .rvdata2 | Ruby Marshal | 없음 |

## RPG 만들기 MV/MZ 세이브 구조

MV와 MZ 세이브는 가장 일반적이고 편집하기 쉽습니다. Base64 인코딩된 JSON을 사용합니다.

### 기본 구조

```json
{
  "system": { ... },
  "switches": { ... },
  "variables": { ... },
  "actors": { ... },
  "party": { ... },
  "map": { ... },
  "player": { ... }
}
```

### 주요 속성 해설

#### 1. 파티 데이터 (`party`)
핵심 게임 상태를 포함합니다:

```json
{
  "_gold": 5000,
  "_steps": 12345,
  "_items": { "1": 10, "2": 5 },
  "_weapons": { "1": 1 },
  "_armors": { "1": 1 },
  "_actors": [1, 2, 3, 4]
}
```

- `_gold`: 파티의 돈
- `_items`: 아이템 ID → 수량 맵
- `_actors`: 파티 내 액터 ID 순서

#### 2. 액터 데이터 (`actors`)
개별 캐릭터 스탯:

```json
{
  "_hp": 500,
  "_mp": 100,
  "_level": 25,
  "_skills": [1, 2, 3, 10, 15],
  "_name": "용사",
  "_class": 1
}
```

#### 3. 스위치 (`switches`)
게임 이벤트를 제어하는 불리언 플래그:

```json
{
  "1": true,    // 예: "왕을 만남"
  "10": true    // 예: "보스 처치"
}
```

## 세이브 파일 위치

### RPG 만들기 MV/MZ (데스크톱)
```
[게임 폴더]/www/save/
[게임 폴더]/save/
```

파일명은 `file1.rpgsave`, `file2.rpgsave` 등.

### RPG 만들기 VX Ace
```
[게임 폴더]/Save/
```

파일은 `Save01.rvdata2`, `Save02.rvdata2` 등.

## RPG 만들기 세이브 편집 방법

### 방법 1: 온라인 에디터 (권장)

1. [RPG 만들기 세이브 에디터](/ko/editor/rpg-maker-mv) 열기
2. `.rpgsave` 또는 `.rmmzsave` 파일 업로드
3. 시각적 인터페이스에서 값 편집
4. 다운로드하여 원본 파일 교체

### 일반적인 편집

- **최대 골드 추가**: `party._gold` 를 원하는 금액으로 설정
- **전체 캐릭터 만렙**: 각 액터의 `_level` 을 최대로 설정
- **모든 스킬 해제**: 각 액터의 `_skills` 배열에 스킬 ID 추가

## 문제 해결

### "세이브 파일 손상" 오류
- 편집 중 JSON 구조가 손상됨
- 백업을 복원하고 작은 변경부터 시도
- 온라인 에디터를 사용하여 JSON 구문 오류 방지

### 변경 사항이 게임에 반영되지 않음
- 올바른 세이브 슬롯을 편집하고 있는지 확인
- 일부 값은 캐시됨; 맵 이동이나 재시작 필요할 수 있음
- 게임에 암호화가 활성화되어 있는지 확인

## 관련 기사

- 📖 [RPG 만들기 세이브 편집 튜토리얼](/ko/blog/how-to-edit-rpg-maker-save)
- 📂 [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained)
- 🔧 [RPG 만들기 에디터](/ko/editor/rpg-maker-mv)
- 🎭 [Ren'Py 세이브 편집 가이드](/ko/blog/renpy-save-editing-guide)

## 결론

**RPG 만들기 세이브 파일 구조** 를 이해하면 게임 디버깅, 잃어버린 진행 복구, 또는 자신만의 방식으로 게임을 즐길 수 있습니다. 골드 추가, 스탯 최대화, 콘텐츠 해제 등 무료 **RPG 만들기 세이브 에디터** 로 안전하고 쉽게 할 수 있습니다.

**편집할 준비가 되셨나요?** [RPG 만들기 세이브 에디터 열기 →](/ko/editor/rpg-maker-mv)

---

*마지막 업데이트: 2025년 12월*

### 관련 문서

- [RPG 만들기 세이브 편집 튜토리얼](/ko/blog/how-to-edit-rpg-maker-save)
- [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained)
- [GameMaker 세이브 편집 가이드](/ko/blog/gamemaker-save-editing-guide)

