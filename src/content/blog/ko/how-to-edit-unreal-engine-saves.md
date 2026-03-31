---
title: "Unreal Engine 세이브 파일 (.sav) 편집 방법 - GVAS 완벽 가이드"
description: "Unreal Engine 4/5 `.sav`를 위한 호환성 중심 가이드입니다. GVAS를 안전하게 분석하는 방법과 전용 도구로 전환해야 하는 시점을 설명합니다."
pubDate: 2026-01-05
tags: ["unreal-engine", "gvas", "guide", "palworld", "hogwarts-legacy"]
author: "Paradox"
image: "/images/blog/unreal-cover.webp"
---

> **지원 상태(2026년 2월):** 현재 웹 에디터는 **표준·비암호화 GVAS**를 우선 지원합니다. 게임별 압축/컨테이너 변형은 읽기 전용 또는 미지원일 수 있습니다.

## 소개

![Unreal Engine 세이브 에디터 인터페이스](/images/blog/unreal-content.webp)

Unreal Engine은 세계에서 가장 강력한 게임 엔진 중 하나로, AAA 스튜디오와 인디 개발자 모두가 사용합니다. **팔월드**, **호그와트 레거시**, **Satisfactory**, **Deep Rock Galactic** 같은 게임들은 모두 Unreal Engine을 사용하며 독점적인 바이너리 형식으로 세이브 데이터를 저장합니다.

Unreal Engine 세이브를 점검하고 호환 파일을 신중하게 편집하려면 이 가이드가 실전 흐름을 안내합니다. 단순 JSON/XML과 달리 UE 세이브는 전용 파서가 필요하며, 우리 웹 에디터는 표준 GVAS를 우선 처리하고 안전한 재구성이 어려운 경우 읽기 전용으로 전환합니다.

## GVAS 형식이란?

Unreal Engine은 세이브 파일에 **GVAS**(Game Variable Archive Save)라는 바이너리 직렬화 형식을 사용합니다. 이 파일들은 일반적으로 `.sav` 확장자를 가집니다.

GVAS 파일에는 다음이 포함됩니다:

*   **헤더**: 매직 바이트(`GVAS`), 세이브 게임 버전, 엔진 버전, 커스텀 버전 데이터.
*   **속성**: 타입이 있는 속성의 계층 구조 (IntProperty, StrProperty, ArrayProperty, StructProperty 등).
*   **푸터**: 선택적 체크섬 또는 패딩.

바이너리이기 때문에 `.sav` 파일을 메모장에서 단순히 열 수 없습니다. GVAS 구조를 이해하는 파서가 필요합니다.

## GVAS 세이브를 사용하는 일반적인 게임

| 게임 | 세이브 위치 | 참고 |
|---|---|---|
| **팔월드** | `%LocalAppData%\Pal\Saved\SaveGames\` | 복잡한 중첩 구조 |
| **호그와트 레거시** | `%LocalAppData%\Hogwarts Legacy\Saved\SaveGames\` | 표준 UE5 형식 |
| **Satisfactory** | `%LocalAppData%\FactoryGame\Saved\SaveGames\` | 매우 큰 파일 |
| **Deep Rock Galactic** | `%LocalAppData%\FSD\Saved\SaveGames\` | 플레이어 진행 상황 |
| **It Takes Two** | Steam 클라우드 폴더 | 협동 세이브 데이터 |

## 1단계: 세이브 파일 찾기

대부분의 Unreal Engine 게임은 다음 위치에 세이브를 저장합니다:

```
%LocalAppData%\[게임명]\Saved\SaveGames\
```

예를 들어, 팔월드 세이브는:
```
C:\Users\[사용자명]\AppData\Local\Pal\Saved\SaveGames\[SteamID]\
```

`Level.sav`, `Players\[플레이어ID].sav` 등의 파일을 찾을 수 있습니다.

## 2단계: 백업 생성

**중요**: 편집 전에 항상 `.sav` 파일을 복사하세요. 바이너리 파일은 용서가 없습니다 – 한 바이트만 잘못되어도 전체 세이브가 손상될 수 있습니다.

`Backups`라는 폴더를 만들고 진행하기 전에 세이브 파일을 그곳에 복사하세요.

## 3단계: 온라인 에디터에 업로드

1.  우리의 [Unreal Engine 세이브 에디터](/ko/editor/unreal)로 이동합니다.
2.  `.sav` 파일을 드래그 앤 드롭합니다.
3.  GVAS 파서가 파일을 처리할 때까지 기다립니다.

우리 에디터는 표준 GVAS를 우선 파싱하여 가능할 때 JSON 트리로 보여줍니다. 게임별 압축/컨테이너 형식은 읽기 전용으로 전환될 수 있습니다.

## 4단계: 속성 탐색 및 편집

파싱 후 모든 속성의 계층적 뷰가 표시됩니다:

### 찾아볼 일반적인 속성:

*   **Inventory (인벤토리)**: 일반적으로 아이템 ID와 수량을 포함하는 ArrayProperty.
*   **PlayerStats (플레이어 스탯)**: 체력, 스태미나, 레벨 등이 있는 StructProperty.
*   **Currency/Money (화폐/돈)**: `Gold`, `Credits`, `Money` 같은 이름의 IntProperty.
*   **Unlocks (잠금 해제)**: 잠금 해제된 아이템/능력을 추적하는 BoolProperty 또는 ArrayProperty.

속성을 클릭하여 값을 확장하고 편집합니다. 숫자 속성의 경우 숫자를 변경하면 됩니다. 문자열의 경우 텍스트 값을 수정할 수 있습니다.

### 예시: 팔월드 팰 데이터 편집

팔월드는 포획된 팰을 복잡한 중첩 구조로 저장합니다. 팰을 수정하려면:

1.  `CharacterSaveParameterMap`으로 이동합니다.
2.  내부 ID로 해당 팰을 찾습니다.
3.  속성을 확장하여 레벨, 스탯, 스킬을 찾습니다.
4.  원하는 대로 값을 수정합니다.

## 5단계: 다운로드 및 교체

1.  에디터가 편집 가능한 호환 모드일 때만 **수정된 세이브 다운로드**를 클릭합니다.
2.  도구가 변경 사항으로 GVAS 재구성을 시도합니다.
3.  읽기 전용 모드라면 게임 전용 도구를 사용하세요.
4.  백업 검증 후에만 원본 파일을 교체하세요.

## 문제 해결

### 에디터에 "GVAS 파싱 실패"가 표시됩니다
*   일부 게임은 커스텀 압축이나 암호화로 수정된 GVAS 형식을 사용합니다.
*   가능하다면 해당 게임의 커뮤니티 전용 도구를 시도해 보세요.

### 편집 후 세이브가 손상되었습니다
*   백업을 복원하세요.
*   속성 이름이나 타입이 아닌 값만 변경했는지 확인하세요.
*   일부 게임은 체크섬을 재계산합니다; 변조된 세이브를 거부할 수 있습니다.

### 로드 후 값이 리셋됩니다
*   게임에 서버 측 검증이 있을 수 있습니다 (멀티플레이어 모드에서 흔함).
*   일부 값은 로드 시 다른 값에서 파생됩니다 (예: 레벨에서 최대 HP).

## 대안 도구

온라인 에디터가 특정 게임을 지원하지 않는 경우, 다음 대안을 고려하세요:

*   **uesave-rs**: `.sav`를 `.json`으로 변환하고 다시 돌릴 수 있는 Rust 기반 명령줄 도구.
*   **Palworld Save Tools**: 팔월드 세이브 전용 커뮤니티 도구.
*   **UAssetGUI**: 다른 Unreal Engine 에셋 파일 편집용.

## 자주 묻는 질문

**Q: 이것이 안전한가요?**
A: 네. 모든 파싱은 브라우저에서 이루어집니다. 파일은 절대 어떤 서버에도 업로드되지 않습니다.

**Q: 멀티플레이어 세이브에서 작동하나요?**
A: 본인이 호스트인 협동 세이브의 경우, 종종 가능합니다. 전용 서버 게임의 경우, 세이브는 보통 서버 측에 있어 접근할 수 없습니다.

**Q: 플랫폼 간 세이브를 전송할 수 있나요?**
A: GVAS 형식은 크로스 플랫폼이지만, 게임이 플랫폼별 데이터를 포함할 수 있습니다. 전송은 가능하지만 보장되지 않습니다.

**Q: 게임이 커스텀 세이브 형식을 사용하면 어떻게 하나요?**
A: 표준 GVAS가 아니면, 게임별 모딩 도구가 필요할 수 있습니다.

## 결론

Unreal Engine 세이브 편집에서는 GVAS 호환 경계를 이해하는 것이 핵심입니다. 표준 GVAS는 웹 에디터에서 처리하고, 컨테이너/재구성 불가 변형은 게임 전용 도구로 전환하는 것이 안전합니다.

기억하세요: 항상 세이브를 백업하고, 멀티플레이어/경쟁 게임에서 불공정하게 편집하지 마시고, 즐거운 모딩 되세요!

## 관련 리소스

- 📖 [Palworld 세이브 편집 가이드](/ko/blog/palworld-save-editing-guide) - 전용 Palworld 튜토리얼
- 📖 [uesave-rs on GitHub](https://github.com/trumank/uesave-rs) - 오픈소스 GVAS 파서
- 📂 [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained) - 다양한 형식 이해하기
- 🔧 [Unreal 에디터](/ko/editor/unreal) - 이 가이드에서 사용한 도구

---

*마지막 업데이트: 2026년 1월*

### 관련 문서

- [Palworld 세이브 편집 가이드](/ko/blog/palworld-save-editing-guide)
- [일반 세이브 파일 확장자 설명](/ko/blog/common-save-file-extensions-explained)
