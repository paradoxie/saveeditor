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
| RPG Maker XP / VX / VX Ace | 🟡 제한적 안정 | To the Moon, LISA: The Painful | `.rxdata`, `.rvdata`, `.rvdata2`의 골드, 아이템, 변수, 스위치, 액터 값 같은 일반 필드를 제한적으로 편집할 수 있습니다. 커스텀 Ruby 객체와 구조 변경은 차단됩니다. |

## Ren'Py

| 엔진 | 안정성 | 참고 |
|---|---|---|
| Ren'Py | 🟡 제한적 안정 | `.save`를 볼 수 있고 `persistent` 안의 단순 문자열, 숫자, 불리언만 저장할 수 있습니다. 복잡한 객체, persistent 밖의 상태, 구조 변경은 차단됩니다. |

## Unity

| 엔진 | 안정성 | 참고 |
|---|---|---|
| Unity PlayerPrefs | 🟢 높음 | 브라우저 기반 게임이나 PlayerPrefs를 사용하는 PC/모바일 게임. |
| Unity BinaryFormatter | 🟡 중간 | 일부 일반적인 복잡한 유형에 대한 제한적인 지원. 향후 업데이트에서 개선될 예정입니다. |

## Unreal Engine

| 엔진 / 형식 | 안정성 | 참고 |
|---|---|---|
| 표준 GVAS | 🟢 높음 | 압축되지 않은 표준 Unreal Save Game 속성을 지원합니다 (Hogwarts Legacy, Palworld 등의 게임). |
| gzip/zlib 래핑 GVAS | 🟢 높음 | 래퍼 해제, 편집, 원래 래퍼로 재압축할 수 있습니다. 그 외 커스텀 컨테이너는 별도 읽기 전용 또는 실패 사유로 표시됩니다. |

## GameMaker

| 형식 | 안정성 | 참고 |
|---|---|---|
| INI / 일반 텍스트 | 🟢 높음 | `ds_map` 덤프나 INI 세이브 구조를 자동으로 감지하고 확장합니다. Base64로 인코딩된 경우 디코딩하여 표시합니다(예: Undertale). |

## NaniNovel (VNDS)

| 형식 | 안정성 | 참고 |
|---|---|---|
| Nanonovel Save (`.nson`) | 🟢 높음 | Unity NaniNovel 엔진용 JSON 직렬화 형식입니다. |
