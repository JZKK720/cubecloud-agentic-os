# Cubecloud Agentic-OS 한국�?문서（ko-KR�?
> **이식�? 감사 가능성, �?낮은 AI 운영 비용�?원하�?팀�?위한 로컬-퍼스�?에이전트 데스크톱 �?운영 모델.**
> Cubecloud�?런타�? 프로바이�? 스킬, 메모�? 스케�? 선택�?코드 인텔리전스를
> 하나�?제어 평면으로 통합하며, 사용자의 머신�?호스�?래퍼�?thin client�?만들지 않습니다.

Cubecloud Agentic-OS�?**Cubecloud Agent Desktop** �?�?운영 모델�?위한 모노레포입니�?
데스크톱 바이너리�?[`agent-desktop/`](agent-desktop/)�?있습니다.
Cubecloud 오리지�?제어 평면, 사전 실행 번들, 개발자용 스킬 생태계는
[`apps/desktop-shell/`](apps/desktop-shell/),
[`packages/platform-core/`](packages/platform-core/), [`.agents/`](.agents/)�?있습니다.

�?줄로 요약하면:

- 프롬프트, 스킬, 메모�? 런타�?선택�?파일, SQLite, 명시�?로컬 계약으로 관리합니다.
- 일상적인 반복 작업은 가능한 �?로컬에서 실행하고, 유료 원격 추론은 진정으로 가�?있는 턴에�?사용합니�?
- 런타임과 프로바이더를 전환�?�?전체 운영 모델�?다시 작성�?필요가 없습니다.
- 개발자와 운영자에�?CLI, 브라우저 �? 벤더 대시보드의 집합�?아닌 하나�?데스크톱 제어 평면�?제공합니�?

## 팀�?Cubecloud�?채택하는 이유

Cubecloud�?데스크톱 제품�?편리함을 원하면서�?스택�?대�?제어권을 포기하고 싶지 않은 팀�?위한 것입니다.

| 결과 | Cubecloud�?실현 방법 |
|---|---|
| �?번째 가�?있는 세션까지�?시간 단축 | 사전 실행 번들�?메모�?시드, 비활성화�?하네�? 비활성화�?스케�? 스타�?칸반 보드가 포함되어 있어 �?실행�?�?셸이 아닙니다. |
| 운영 비용 절감 | 로컬-퍼스�?레인�?초안 작성, 검�? 오케스트레이�? 반복�?기존 하드웨어에서 처리하며, 원격 프론티어 모델은 선택 사항으로 유지됩니�? |
| 벤더 리스�?감소 | 런타�?선택�?프로바이�?선택�?별개�?결정이므�? 모델이나 벤더 변경은 시스�?재작성이 아닌 재구�?이벤트입니다. |
| 재현 가능한 운영�?워크플로 | 스킬, 스케�? 프로바이�?정의, 상태가 호스�?블랙박스가 아닌 검�?가능한 파일, SQLite, 명시�?IPC 표면�?저장됩니다. |
| 조달 �?법무 검�?용이�?| Cubecloud 오리지�?작업은 AGPL-3.0-or-later, Apache-2.0, MIT �?선택 가능하�? 상속�?프레임워크는 MIT�?유지되고 경로 수준 출처가 명확�?문서화됩니다. |

## 로컬-퍼스트가 우위�?이유

여기�?"로컬-퍼스�?�?마케�?수사가 아니�?제어 평면�?소재, 비용 구조, 장애 검�?가능성�?대�?명확�?선택입니�?

| 판단 �?| 호스�?래퍼 기본�?| Cubecloud 로컬-퍼스�?모델 |
|---|---|---|
| 제어 평면 | 벤더 계정, 벤더 UI, 벤더 유지 루프 | 로컬 사용�?통제 하의 네이티브 데스크톱 |
| 비용 구조 | 시트 비용 + 토큰 비용 + 래퍼 경제 | 일상 작업은 가능한 �?로컬 하드웨어�?처리, 원격 비용은 진정�?가치가 있을 때만 발생 |
| 상태와 출처 | 이력�?오케스트레이�?상태가 주로 호스�?제품 내에 존재 | 프롬프트, 스킬, 스케�? 메모리가 검�?�?재현 가�?|
| 런타�?변�?| 종종 제품 전환이나 벤더 추상�?제한 수용�?의미 | 런타�?피커가 운영 표면�?안정적으�?유지하면�?기반 런타�?진화�?허용 |
| 프로바이�?변�?| 일반적으�?벤더 우선, BYOK�?부차적 | 프로바이�?레이어가 명시적이�?런타�?레이어와 분리 |
| 장애 복구 | 벤더 수정 대�?또는 제한�?로그 확인 | 로컬 상태, 로그, 설정, IPC 경계�?직접 검�?|

**BYOK�?조달 관리입니다. 로컬-퍼스트는 운영 모델입니�?**
BYOK가 바꾸�?것은 청구서의 수신처입니다. 로컬-퍼스트가 바꾸�?것은 �?워크플로가 애초�?얼마�?많은 유료 원격 작업�?필요�?하는가입니�?

## 누구�?위한 것인가

Cubecloud�?다음�?같은 팀�?운영자에�?특히 적합합니�?

- 보안 검�? 출처 검�? 롤백 경로가 필요�?내부 에이전트 도구�?구축하는 팀.
- 클라이언트별�?다른 에이전트 스택�?제공해야 하며 모든 배포�?동일�?호스�?래퍼�?결합하고 싶지 않은 컨설�?회사 �?플랫�?팀.
- 데스크톱�?편리함을 원하면서�?로컬 런타�?제어�?포기하고 싶지 않은 개발�?
- 빈번�?반복 작업�?로컬�?유지하고 필요�?경우에만 원격 모델�?사용하려�?비용 의식�?강한 운영�?

순수 브라우저 제품, 호스�?SaaS 제어 평면, 또는 모델 벤더가 런타�?라이프사이클 전체�?대�?관리해주길 원한다면 최적�?선택�?아닙니다.

## �?리포지토리가 제공하는 �?
�?모노레포가 제공하는 것은 데스크톱 바이너리만이 아닙니다.

- [`agent-desktop/`](agent-desktop/)은 최종 사용자에�?제공되는 완전�?Electron 데스크톱입니�?
- [`apps/desktop-shell/`](apps/desktop-shell/)은 Cubecloud 오리지�?상태 레이�?�?제어 평면 워크스페이스입니�?
- [`packages/platform-core/`](packages/platform-core/)�?공유 TypeScript 계약�?보유합니�?
- [`.agents/skills/`](.agents/skills/)에는 7개의 업스트림 리포지토리에서 적응�?34개의 일급 오픈소스 스킬�?포함되어 있으�?`~/.agents/skills/`�?미러링됩니다.
- [`docs/`](docs/)�?핸드�? 위협 모델, 런타�?계획, 법적 정책, 전환 이력�?보유합니�?

데스크톱 �?실행 �?사용자는 다음�?얻습니다:

- React 19, i18next, Vite, electron-builder�?구축�?네이티브 Electron 데스크톱.
- 멀�?런타�?피커: 현재�?Hermes, 향후 OpenClaw와 IronClaw가 추가 레인으로 계획�?
- 런타�?레이어와 분리�?프로바이�?레이�? Ollama, vLLM, llama.cpp 등의 로컬 프로바이�?또는 OpenAI 호환 원격 API�?연결 가�?
- �?실행부�?사용자에�?표시되는 3개의 스킬: `cubecloud-persona`, `cubecloud-onboarding`, `cubegraph-code-intel`.
- 메모�?시드, 하네�?플레이스홀�? 스케�?플레이스홀�? 스타�?칸반 보드�?포함�?사전 실행 운영 컨텍스트.
- 사용자가 명시적으�?활성화하�?선택�?CodeGraph �?EverOS 통합 (자동 설치되지 않음).

**하지 않는** �?

- 모델 서버가 **아닙니다**. 추론�?번들링하지 않고 런타�?�?프로바이�?프로토콜�?소비합니�?
- 호스�?IDE가 **아닙니다**. 데스크톱�?로컬 제어 표면입니�?
- 단일 벤더 래퍼가 **아닙니다**. 런타�?선택, 프로바이�?선택, 스킬 자산�?이식 가능하�?유지됩니�?

## 시장 포지셔닝

Cubecloud�?"최고�?클라우드 Copilot", "가�?강력�?단일 벤더 CLI", "가�?가벼운 데모 템플�?�?되려�?것이 아닙니다.
다른 구매자를 대상으�?합니�? 제어, 이식�? 단위 경제�?가�?중시하는 팀입니�?

| 시장 옵션 | 강점 | 제약 | Cubecloud�?위치 |
|---|---|---|---|
| Cursor, GitHub Copilot agents 등의 클라우드 IDE Copilot | 호스�?코딩 루프가 빠르�?IDE 통합�?깊음 | 상태가 기본적으�?클라우드, 시트 경제가 무겁�?제어 평면�?벤더 중심 | Cubecloud�?로컬 데스크톱 운영자를 중심�?두고 런타�? 프로바이�? 스킬 자산�?교체 가능하�?유지 |
| Claude Code, Codex CLI 등의 단일 벤더 CLI | 특정 벤더 스택에서�?터미�?네이티브 루프가 강력 | 터미�?우선 UX, 런타�?이식성이 좁음 | Cubecloud�?GUI 우선 제어 평면�?이식 가능한 런타�?프로바이�?모델�?제공 |
| 레퍼런스 리포지토리와 퀵스타�?| 학습�?데모 시작�?빠름 | 의견�?가�?운영 표면이나 장기 운영�?워크플로가 부�?| Cubecloud�?실제 데스크톱 워크플로, 핸드�? 시드�?컨텍스트, 문서화된 출처 자세�?제공 |
| BYOK 래퍼 | 조달과의 대화가 용이 | 종종 토큰 비용�?더해 래퍼 시트 경제가 추가�?| Cubecloud�?로컬-퍼스�?설계�?워크플로가 유료 원격 추론�?의존하는 정도�?감소 |

전략�?포인트는 간단합니�? 많은 경쟁사가 **벤더 깊이**�?최적화합니다. Cubecloud�?**운영�?제어**�?최적화합니다.

## 프로덕션 지�?팀�?위해

Cubecloud가 말하�?"프로덕션 대�?이란 "호스�?SaaS와 영업 대시보�?가 아니�?핵심 운영 표면�?명시적이�?검�?가능하�?교체 가능하다는 것을 의미합니�?

- **명시�?신뢰 경계.** 렌더러는 샌드박스화되�? IPC 채널은 명시적으�?정의되며, 아웃바운�?네트워킹은 기본적으�?옵트�? 인바운드 네트워킹은 사용�?지�?포트에서 옵트인입니다. [`SECURITY.md`](SECURITY.md) �?[`THREAT_MODEL.md`](THREAT_MODEL.md) 참조.
- **예측 가능한 상태.** 프로�? 세션, 프로바이�?정의, 메모�? 스케�? 칸반 상태가 불투명한 호스�?워크플로 레이어가 아닌 영구적인 로컬 상태�?저장됩니다.
- **교체 가능한 종속�?** 런타�?선택�?프로바이�?선택�?분리되어 있어 팀�?전체 사용�?워크플로�?붕괴시키지 않고 마이그레이션, 스테이징, 롤백�?�?있습니다.
- **선택�?사이드카�?선택적으�?유지.** CodeGraph와 EverOS�?필요�?�?시스템을 확장하지�?필수적인 숨겨�?플랫�?종속성이 되지 않습니다.
- **버전 관리된 방법�?** 34�?스킬 생태계는 문서화되�?출처가 추적되며 업스트림 스킬 프로세스에서 상속�?red-baseline 규율�?지원됩니다.
- **명확�?법적 표면.** 리포지토리�?경로 수준 출처, 상표 자세, 상업�?재라이선�?정책, 상속 프레임워크의 MIT carve-out�?�?곳에�?문서화합니다. [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) �?[`docs/legal/`](docs/legal/) 참조.

이것�?엔터프라이즈 스토리입니다: "우리�?믿으세요"가 아니�?"스택�?검사하세요".

## 아키텍처 개요

데스크톱 경험은 6개의 협력하는 능력면으�?구성됩니�?

- **상태 레이�?* - [`apps/desktop-shell/src/main/agentControlPlane.ts`](apps/desktop-shell/src/main/agentControlPlane.ts)가 프로�? 세션, 모델, 프로바이�? 스킬, 메모�? 스케�? 칸반 상태�?관�?
- **런타�?오케스트레이�?* - [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](docs/RUNTIME_ORCHESTRATION_PLAN.md)가 현재 Hermes 레인�?다음 OpenClaw / IronClaw 레인�?설명.
- **프로바이�?레이�?* - [`apps/desktop-shell/src/main/providerDiscovery.ts`](apps/desktop-shell/src/main/providerDiscovery.ts)가 모델 프로바이�?선택�?런타�?선택�?분리.
- **스킬 하네�?* - [`agent-desktop/src/main/skills-harness.ts`](agent-desktop/src/main/skills-harness.ts)가 발신 요청 주위�?스킬 레이어를 적용.
- **CodeGraph 표면** - [`docs/CODEGRAPH-RUNTIME.md`](docs/CODEGRAPH-RUNTIME.md)가 선택�?시맨�?코드 인텔리전�?경로�?설명.
- **EverOS 사이드카** - [`docs/EVEROS-SIDECAR.md`](docs/EVEROS-SIDECAR.md)가 선택�?메모�?�?하네�?사이드카�?라이프사이클�?설명.

## 시작하기

- **�?기여�?** [`docs/HANDBOOK.md`](docs/HANDBOOK.md) 섹션 1, 2, 3, 5�?읽으세요.
- **데스크톱 평가�?** 먼저 [`agent-desktop/README.md`](agent-desktop/README.md)�?읽은 �?[`docs/HANDBOOK.md`](docs/HANDBOOK.md) 섹션 1, 3, 10�?읽으세요.
- **리뷰�?또는 릴리�?담당�?** [`docs/HANDBOOK.md`](docs/HANDBOOK.md) 섹션 1, 3, 4, 6, 9, 10, 11�?순서대�?읽으세요.

## 리포지토리 레이아웃

```
cubecloud-agentic-os/
├── README.md                     �?모노레포 README
├── LICENSE                       Cubecloud 오리지�?작업: AGPL-3.0-or-later / Apache-2.0 / MIT
├── NOTICE                        서드파티 귀�?카탈로그
├── BRANDING_AND_LICENSE.md       라이선스, 출처, 버전 전환 이력
├── CONTRIBUTING.md               DCO 1.1 기여 계약
├── SECURITY.md                   보안 정책 �?보고 방법
├── THREAT_MODEL.md               로컬-퍼스�?위협 모델
├── README.i18n.md                번역 인벤토리 매니페스�?├── .agents/                      ~/.agents/skills/�?미러링되�?34개의 오픈소스 스킬
├── .github/                      에이전트 지�? 워크플로 스킬, 자동�?├── apps/
�?  └── desktop-shell/            Cubecloud 오리지�?제어 평면 워크스페이스
├── packages/
�?  └── platform-core/            공유 TypeScript 계약
├── docs/
�?  ├── HANDBOOK.md               마스�?핸드�?�?  ├── RETIRED_AND_LEGACY.md     활성 / 미러 / 스크래치패드 �?�?  ├── handbook/                 아키텍처, 개발, 운영 장문 문서
�?  └── legal/                    EULA, 상표, 상업�?라이선스 정책
├── scripts/
�?  ├── sync-docs.ps1             하드링크 �?정션 재생�?스크립트
�?  └── v2.10.20-readme-combined-pdf.cjs
└── agent-desktop/            사용자에�?제공되는 Electron 데스크톱
```

## 라이선스

Cubecloud 오리지�?작업은 **AGPL-3.0-or-later, Apache-2.0, MIT** �?선택 가능합니다.
AGPL-3.0-or-later가 기본 라이선스입니�? Apache-2.0�?MIT�?조직 정책�?이미 이러�?라이선스�?중심으로 하는 다운스트�?소비자를 위한 호환�?옵션입니�?
상속�?`hermes-desktop` 프레임워�?코드�?업스트림 MIT 조건�?유지합니�?

경로 수준 내역은 [`LICENSE`](LICENSE), [`NOTICE`](NOTICE),
[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md), [`docs/legal/`](docs/legal/)�?참조하세�?

## 기여

인바운드 기여�?**DCO 1.1** 서명 모델�?따릅니다. 모든 커밋�?`Signed-off-by:` 줄이 포함되어�?합니�?
자세�?내용은 [`CONTRIBUTING.md`](CONTRIBUTING.md)�?참조하세�?

스킬 레이어는 주요 기여�?워크플로 표면입니�? 새로�?스킬은 일반적으�?`gbrain-skillify`,
`ecc-skill-scout`, `po-write-a-skill`, `sp-write-skill`�?거치�? �?동작�?유지�?가치가 있음�?증명하는 red-baseline 테스트를 동반합니�?

버그�?기능 요청�?있으�?[이슈�?생성](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new)하세�?
보안 문제�?[`SECURITY.md`](SECURITY.md)�?따르�? 공개 이슈�?자격 증명, API �? 비공�?로그�?게시하지 마세�?

## 번역

모노레포�?현재 다음 간체 중국�?문서�?제공합니�?

- [`README.zh-CN.md`](README.zh-CN.md)
- [`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md)
- [`SECURITY.zh-CN.md`](SECURITY.zh-CN.md)
- [`THREAT_MODEL.zh-CN.md`](THREAT_MODEL.zh-CN.md)
- [`docs/HANDBOOK.zh-CN.md`](docs/HANDBOOK.zh-CN.md)
- [`docs/handbook/`](docs/handbook/) 아래 zh-CN 장문 문서

번역 인벤토리�?[`README.i18n.md`](README.i18n.md)�?있습니다.
영중 통합 README PDF�?[`docs/Cubecloud-README-en-zh.pdf`](docs/Cubecloud-README-en-zh.pdf)�?있습니다.

바이너리 대�?번역은 계속 `agent-desktop/` 아래�?있습니다.
모노레포�?일본어나 한국어를 추가하거�?기존 zh-CN 텍스트를 개선하려�?[`README.i18n.md`](README.i18n.md)�?워크플로�?따르세요.

---

> **참고:** �?한국�?번역은 기계 번역 출발점입니다. 한국�?원어�?검토자�?환영합니�?
> 번역 개선이나 수정은 [`README.i18n.md`](README.i18n.md) 워크플로�?따라 PR�?생성�?주세�?
