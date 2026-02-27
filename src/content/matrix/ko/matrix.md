---
title: '호환성 매트릭스'
subtitle: '현재 지원되는 엔진 및 형식에 대한 개요입니다.'
---

## 일반 형식

| 형식 | 확장자 | 설명 |
|---|---|---|
| JSON | `.json` / `.sav` | 구조화된 텍스트. 많은 게임 엔진 및 웹 게임에서 사용됩니다. |
| XML | `.xml` | 태그 기반 텍스트 형식. 플래시 게임이나 이전 타이틀에서 흔히 볼 수 있습니다. |
| INI | `.ini` | 간단한 키-값 구성 파일. 소규모 인디 게임에서 자주 사용됩니다. |

## RPG Maker 시리즈

| 엔진 | 안정성 | 테스트된 게임 예시 | 참고 |
|---|---|---|---|
| RPG Maker MV / MZ | 🟢 높음 | Omori, OneShot, Lisa | `rpgsave` 형식은 LZString으로 압축된 JSON입니다. |
| RPG Maker XP / VX | 🔴 미지원 | To the Moon | 브라우저 측에서 안전하고 정확한 역직렬화가 어렵기 때문에 `rxdata` 및 `rvdata2` (Ruby Marshal Data)는 현재 지원되지 않습니다. |

## Ren'Py

| 엔진 | 안정성 | 참고 |
|---|---|---|
| Ren'Py | 🟡 중간 | 복잡한 Python Pickles(zlib 압축)를 파싱합니다. 변수 유형에 크게 의존하기 때문에 값의 구조를 변경하면 게임이 손상될 수 있습니다. |

## Unity

| 엔진 | 안정성 | 참고 |
|---|---|---|
| Unity PlayerPrefs | 🟢 높음 | 브라우저 기반 게임이나 PlayerPrefs를 사용하는 PC/모바일 게임. |
| Unity BinaryFormatter | 🟡 중간 | 일부 일반적인 복잡한 유형에 대한 제한적인 지원. 향후 업데이트에서 개선될 예정입니다. |

## Unreal Engine

| 엔진 / 형식 | 안정성 | 참고 |
|---|---|---|
| 표준 GVAS | 🟢 높음 | 압축되지 않은 표준 Unreal Save Game 속성을 지원합니다 (Hogwarts Legacy, Palworld 등의 게임). |
| 압축된 GVAS | 🟡 중간 | zlib 압축(예: Deep Rock Galactic)을 자동으로 감지하고 압축을 풉니다. 하지만 게임 내 세이브를 위한 안전한 재구축 보장이 아직 없기 때문에 현재 "읽기 전용" 모드로 작동합니다. |

## GameMaker

| 형식 | 안정성 | 참고 |
|---|---|---|
| INI / 일반 텍스트 | 🟢 높음 | `ds_map` 덤프나 INI 세이브 구조를 자동으로 감지하고 확장합니다. Base64로 인코딩된 경우 디코딩하여 표시합니다(예: Undertale). |

## NaniNovel (VNDS)

| 형식 | 안정성 | 참고 |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 높음 | Unity NaniNovel 엔진용 JSON 직렬화 형식입니다. |
