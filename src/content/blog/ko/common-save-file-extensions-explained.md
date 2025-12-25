---
title: "게임 세이브 파일 확장자 설명 - 완벽 참조 가이드"
description: ".json, .xml, .sav, .rpgsave, .save, .dat 등 일반적인 게임 세이브 파일 형식과 편집 방법에 대한 종합 가이드입니다."
pubDate: 2025-11-28
tags: ["guide", "file-formats", "education", "reference"]
author: "SaveEditor Team"
image: "/images/blog/extensions-cover.webp"
---

## 소개

![게임 세이브 파일 확장자 설명](/images/blog/extensions-content.webp)

게임 세이브 파일은 수십 가지의 다양한 형식으로 제공되며, 각각 고유한 특성과 편집 요구 사항이 있습니다. 어떤 파일 확장자를 다루고 있는지 이해하는 것이 게임 세이브를 성공적으로 수정하는 첫 번째 단계입니다.

이 종합 가이드는 간단한 사람이 읽을 수 있는 텍스트 파일부터 복잡한 바이너리 구조까지, 접할 수 있는 모든 주요 세이브 파일 형식을 다룹니다.

## 텍스트 기반 형식 (편집 쉬움)

### JSON (.json)

**엔진**: GameMaker, Godot, Unity (커스텀), 많은 인디 게임.

JSON(JavaScript Object Notation)은 중괄호와 키-값 쌍을 사용하는 사람이 읽을 수 있는 형식입니다:

```json
{
  "playerName": "Hero",
  "gold": 5000,
  "level": 25,
  "inventory": ["sword_01", "potion_03"]
}
```

**편집 방법**: 아무 텍스트 편집기(VS Code, Notepad++)에서 열기. 값을 변경하고 저장하면 끝. 구문을 깨뜨리지 않도록 주의하세요 (쉼표 누락, 닫히지 않은 괄호).

**도구**: [아무 텍스트 편집기, 또는 우리의 제네릭 에디터](/ko/editor/gamemaker)

---

### INI (.ini)

**엔진**: GameMaker Studio, 많은 오래된 게임.

INI 파일은 대괄호 안의 섹션과 키=값 쌍을 사용합니다:

```ini
[Player]
Name=Hero
Gold=5000

[Settings]
Volume=80
Difficulty=Normal
```

**편집 방법**: 매우 간단합니다. 텍스트 편집기에서 열고, 값을 변경하고, 저장하세요.

**도구**: [아무 텍스트 편집기, 또는 우리의 GameMaker 에디터](/ko/editor/gamemaker)

---

### XML (.xml, .plist)

**엔진**: Unity (모바일 PlayerPrefs), 많은 크로스 플랫폼 게임.

XML은 중첩된 태그를 사용하여 데이터를 구조화합니다:

```xml
<PlayerPrefs>
  <pref name="Coins" type="int">9999</pref>
  <pref name="SoundEnabled" type="int">1</pref>
</PlayerPrefs>
```

**편집 방법**: 텍스트 편집기에서 편집 가능하지만 태그 구조에 주의하세요. 닫는 태그가 누락되면 파일이 손상됩니다.

**도구**: [Unity 에디터](/ko/editor/unity)

---

## 압축/인코딩 형식 (중간 난이도)

### RPG Maker (.rpgsave, .rvdata2)

**엔진**: RPG Maker MV, MZ (rpgsave), VX Ace (rvdata2).

`.rpgsave` 파일은 LZString으로 압축된 JSON 데이터입니다. `.rvdata2` 파일은 Ruby Marshal 형식을 사용합니다.

압축 해제 전에는 랜덤 문자처럼 보입니다:
```
N4IgLgpgJg5hBOBnEAuGAnGAzA9mKABMQBoRsA...
```

압축 해제 후에는 그냥 JSON입니다.

**편집 방법**: 압축 해제, 편집, 재압축을 위한 전문 도구가 필요합니다.

**도구**: [RPG Maker 에디터](/ko/editor/rpg-maker-mv)

---

### NaniNovel (.nson)

**엔진**: NaniNovel 비주얼 노벨 프레임워크를 사용하는 Unity 게임.

`.nson` 파일은 일반적으로 압축되거나 base64 인코딩된 JSON입니다.

**편집 방법**: 우리 에디터가 자동으로 인코딩을 감지하고 편집 가능한 JSON을 표시합니다.

**도구**: [NaniNovel 에디터](/ko/editor/naninovel)

---

## 바이너리 형식 (편집 어려움)

### Unreal Engine (.sav)

**엔진**: Unreal Engine 4 & 5.

GVAS (Game Variable Archive Save) 바이너리 형식을 사용합니다. 헤더, 속성 트리, 선택적 압축을 포함합니다.

대표 게임: 팔월드, 호그와트 레거시, Satisfactory, Deep Rock Galactic.

**편집 방법**: 바이너리를 JSON으로 변환하고 다시 돌리는 GVAS 파서가 필요합니다.

**도구**: [Unreal Engine 에디터](/ko/editor/unreal)

---

### Ren'Py (.save)

**엔진**: Ren'Py 비주얼 노벨 엔진.

Python의 `pickle` 모듈을 사용하여 전체 게임 상태를 직렬화합니다. 보안 위험 때문에 안전하게 수정하기 매우 어렵습니다.

대표 게임: Doki Doki Literature Club, 카타와 소녀.

**편집 방법**: 읽기 전용 보기는 안전합니다. 수정은 신중한 리피클링 또는 게임 내 콘솔 사용이 필요합니다.

**도구**: [Ren'Py 뷰어](/ko/editor/renpy) (읽기 전용)

---

### 일반 바이너리 (.dat, .sav, .bin)

**엔진**: 커스텀 엔진, 오래된 게임.

이 파일들은 표준 형식이 없습니다. 다음을 포함할 수 있습니다:
*   고정 크기 레코드 (예: 골드 4바이트, 레벨 4바이트)
*   명확한 패턴이 없는 다양하게 구조화된 데이터
*   압축 또는 암호화

**편집 방법**: 헥스 편집기(HxD, 010 Editor) 사용. 패턴을 찾으세요. 종종 게임별 지식이나 커뮤니티 연구가 필요합니다.

**도구**: 헥스 편집기 (웹 기반 아님)

---

## 플랫폼별 형식

### Windows 레지스트리 (PlayerPrefs)

Windows의 Unity 게임은 종종 PlayerPrefs를 레지스트리에 저장합니다:
```
HKEY_CURRENT_USER\Software\[회사명]\[제품명]
```

값은 해시 기반 키 이름과 바이너리 데이터로 저장됩니다.

**편집 방법**: `regedit` 또는 PlayerPrefs 전용 도구 사용.

---

### iOS/macOS .plist

Apple 플랫폼에서 사용하는 Property List 파일. XML 또는 바이너리 형식일 수 있습니다.

**편집 방법**: XML이면 텍스트 편집기 사용. 바이너리면 `plutil`로 변환: `plutil -convert xml1 file.plist`

---

### SQLite (.db, .sqlite)

일부 게임은 SQLite 데이터베이스를 사용합니다.

**편집 방법**: DB Browser for SQLite 또는 유사한 도구 사용.

---

## 빠른 참조 표

| 확장자 | 형식 유형 | 난이도 | 우리 도구 |
|---|---|---|---|
| `.json` | 텍스트 (JSON) | 쉬움 | [GameMaker](/ko/editor/gamemaker) |
| `.ini` | 텍스트 (INI) | 쉬움 | [GameMaker](/ko/editor/gamemaker) |
| `.xml` | 텍스트 (XML) | 쉬움 | [Unity](/ko/editor/unity) |
| `.plist` | 텍스트/바이너리 | 쉬움-중간 | [Unity](/ko/editor/unity) |
| `.rpgsave` | 압축 JSON | 중간 | [RPG Maker](/ko/editor/rpg-maker-mv) |
| `.nson` | 인코딩 JSON | 중간 | [NaniNovel](/ko/editor/naninovel) |
| `.sav` (UE) | 바이너리 (GVAS) | 어려움 | [Unreal](/ko/editor/unreal) |
| `.save` (Ren'Py) | 바이너리 (Pickle) | 매우 어려움 | [뷰어 전용](/ko/editor/renpy) |
| `.dat`, `.bin` | 커스텀 바이너리 | 매우 어려움 | 헥스 편집기 |

## 자주 묻는 질문

**Q: 내 세이브 파일이 무슨 형식인지 어떻게 알 수 있나요?**
A: 텍스트 편집기에서 열어보세요. 읽을 수 있는 텍스트/JSON/XML이 보이면 텍스트 기반입니다. 깨진 문자가 보이면 바이너리입니다.

**Q: 내 게임 형식이 여기에 나열되어 있지 않으면 어떻게 하나요?**
A: 우리의 제네릭 에디터에서 열어보세요 – 형식을 자동 감지할 수 있습니다. 그렇지 않으면 게임별 커뮤니티를 참조하세요.

**Q: 모든 세이브 파일을 편집할 수 있나요?**
A: 대부분은 기술적으로 편집 가능하지만, 일부는 암호화, 체크섬 또는 서버 측 검증을 사용해 실용적이지 않습니다.

**Q: 세이브 편집은 합법인가요?**
A: 본인 소유의 싱글 플레이어 게임 파일의 경우, 네. 온라인/경쟁 게임을 수정하면 서비스 약관을 위반할 수 있습니다.

## 결론

세이브 파일 형식을 이해하는 것이 절반의 싸움입니다. 간단한 JSON, 압축된 RPG Maker 데이터, 또는 복잡한 Unreal GVAS 파일 중 무엇을 다루고 있는지 알게 되면, 올바른 도구와 접근 방식을 선택할 수 있습니다.

우리의 Save Editor Online은 대부분의 일반 형식을 자동으로 지원합니다 – 파일을 업로드하기만 하면 나머지는 저희가 처리합니다!

## 관련 리소스

- 📖 [RPG Maker 세이브 편집 가이드](/ko/blog/how-to-edit-rpg-maker-save)
- 📖 [Unity 세이브 편집 가이드](/ko/blog/how-to-edit-unity-saves)
- 📖 [Unreal Engine 세이브 가이드](/ko/blog/how-to-edit-unreal-engine-saves)
- 📖 [Ren'Py 세이브 편집 가이드](/ko/blog/renpy-save-editing-guide)
- 📖 [GameMaker 세이브 편집 가이드](/ko/blog/gamemaker-save-editing-guide)
- 📖 [NaniNovel 세이브 편집 가이드](/ko/blog/naninovel-save-editing-guide)

---

*마지막 업데이트: 2025년 12월*

### 편집 시작

- [RPG Maker 에디터](/ko/editor/rpg-maker-mv)
- [Unity 에디터](/ko/editor/unity)
- [Unreal Engine 에디터](/ko/editor/unreal)
- [Ren'Py 뷰어](/ko/editor/renpy)
- [GameMaker 에디터](/ko/editor/gamemaker)
- [NaniNovel 에디터](/ko/editor/naninovel)

