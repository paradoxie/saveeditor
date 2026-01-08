---
title: "GameMaker 세이브 편집 가이드: INI와 JSON 파일 완벽 해설"
description: "GameMaker Studio 세이브 파일 편집을 마스터하세요. Undertale, Deltarune 등의 게임에서 INI 설정과 JSON 세이브를 수정하는 방법을 상세히 설명합니다."
pubDate: 2026-01-02
tags: ["gamemaker", "undertale", "guide", "tutorial", "ini", "json"]
author: "SaveEditor Team"
image: "/images/blog/gamemaker-cover.webp"
---

## GameMaker 세이브 파일 소개

![GameMaker 세이브 에디터 인터페이스](/images/blog/gamemaker-content.webp)

**GameMaker Studio**(GMS)는 2D 게임에서 가장 인기 있는 엔진 중 하나로, **Undertale**, **Deltarune**, **Hotline Miami**, **Hyper Light Drifter** 등 수많은 인디 히트작을 지원합니다.

표준화된 세이브 시스템을 가진 엔진과 달리, GameMaker는 개발자에게 데이터 저장 방법에 대한 완전한 자유를 줍니다. 따라서 세이브 형식은 다양하지만, 대부분은 저희 에디터가 완전히 지원하는 몇 가지 일반적인 카테고리에 속합니다.

## 일반적인 GameMaker 세이브 형식

### 1. INI 파일 (가장 일반적)

```ini
[player]
name="Frisk"
hp=20
maxhp=20
love=1
gold=50

[flags]
met_sans=1
spared_toriel=1
```

**INI 사용 게임**: Undertale (PC), Deltarune Chapter 1

### 2. JSON 파일

최신 GameMaker 게임은 더 복잡한 데이터에 JSON 사용:

```json
{
  "player": {
    "name": "Kris",
    "hp": 100,
    "items": ["healing_item", "weapon_01"]
  },
  "chapter": 2
}
```

**JSON 사용 게임**: Deltarune Chapter 2, 최신 GMS2 타이틀

## GameMaker 세이브 파일 위치

### Windows

대부분의 GameMaker 게임은 세이브를 다음 위치에 저장:

```
%LocalAppData%\[게임명]\
```

예시:
- **Undertale**: `%LocalAppData%\UNDERTALE\`
- **Deltarune**: `%LocalAppData%\DELTARUNE\`

## Undertale 세이브 편집 가이드

가장 유명한 GameMaker 게임으로서, Undertale은 특별한 관심이 필요합니다:

### 파일 구조

| 파일 | 목적 |
|------|------|
| `file0` | 메인 세이브 데이터 (확장자 없음, INI 형식) |
| `file8` | 영구 데이터 (Flowey의 기억) |
| `undertale.ini` | 시스템 데이터 (fun 값, 설정) |

### file0의 주요 변수

```ini
[General]
Name="Frisk"        ; 플레이어 이름
Love=1              ; LV (폭력의 레벨)
HP=20               ; 현재 HP
MaxHP=20            ; 최대 HP
Gold=100            ; 돈
EXP=0               ; 경험치

[Kills]
kills=0             ; 총 처치 수 (루트에 영향)
```

## 단계별 편집 가이드

### 1단계: 찾기 및 백업

1. 게임의 세이브 폴더로 이동
2. **편집 전 항상 백업 생성**

### 2단계: 에디터에 업로드

1. [GameMaker 에디터](/ko/editor/gamemaker)로 이동
2. 세이브 파일(`.ini`, `.json`) 업로드
3. 에디터가 자동으로 형식 감지

### 3단계: 수정하기

INI 파일의 경우 계층적 뷰가 표시됩니다:
- 섹션 (예: `[player]`, `[flags]`)
- 각 섹션 아래의 키-값 쌍

### 4단계: 다운로드 및 교체

1. **수정된 세이브 다운로드** 클릭
2. 원본 파일 교체
3. 게임을 실행하여 변경 사항 확인

## 문제 해결

### "세이브 데이터 손상" 오류

**원인**:
- 잘못된 INI 구문
- 데이터 유형 변경
- 필수 섹션 제거

### 변경 사항이 저장되지 않음

**가능한 문제**:
1. **Steam 클라우드**: 로컬 변경 사항 덮어쓰기
2. **읽기 전용 파일**: 파일 권한 확인

## 관련 에디터

- [Unity 세이브 에디터](/ko/editor/unity) – Unity 기반 게임용
- [RPG Maker 에디터](/ko/editor/rpg-maker-mv) – RPG Maker 타이틀용
- [Ren'Py 뷰어](/ko/editor/renpy) – 비주얼 노벨용

## 결론

GameMaker의 유연성은 세이브 편집에 만능 접근법이 없다는 것을 의미하지만, 가장 일반적인 형식(INI와 JSON)은 저희 에디터에서 잘 지원됩니다.

문제가 발생하거나 제안 사항이 있으면 [문의하기](/ko/contact)로 연락주세요!

## 관련 리소스

- 📖 [Undertale Wiki - 세이브 파일](https://undertale.fandom.com/wiki/SAVE) - Undertale 커뮤니티 문서
- 🎮 [Undertale 게임 페이지](/ko/games/undertale) - 세이브 위치 및 편집 가능 항목
- 📂 [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained) - 다양한 형식 이해하기
- 🔧 [GameMaker 에디터](/ko/editor/gamemaker) - 이 가이드에서 사용한 도구
- 🎭 [RPG Maker 세이브 편집 가이드](/ko/blog/how-to-edit-rpg-maker-save) - 또 다른 인기 인디 엔진

---

*마지막 업데이트: 2026년 1월*

### 관련 문서

- [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained)
- [RPG Maker 세이브 편집](/ko/blog/how-to-edit-rpg-maker-save)
- [Undertale 세이브 위치](/ko/games/undertale)

