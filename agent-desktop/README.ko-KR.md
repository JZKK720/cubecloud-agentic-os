<p align="center">
  <img width="360" alt="Cubecloud" src="build/branding/cubecloud-logo.svg" />
</p>

# Cubecloud Agent Desktop — 바이너리

> **이 문서는 데스크톱 바이너리의 설치 및 기능 문서입니다.** agentic-OS 모노레포의 README는
> [`../README.md`](../README.md)에, "이것이 무엇인지, 왜 이렇게 되어 있는지, 다음에 무엇을 봐야 하는지"의 마스터 인덱스는
> [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)에 있습니다.

Cubecloud Agent Desktop은 단일 운영자에게 **런타임 선택**, **프로바이더 선택**, **스킬**, **메모리**, **스케줄**, 그리고 **선택적 코드 인텔리전스**를 위한 단일 제어 평면을 제공하는 네이티브 Electron 데스크톱입니다. 호스팅 래퍼나 단일 벤더 CLI에 워크플로를 종속시키지 않습니다.

**최신 릴리스: [v2.10.71](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.71)** — 래퍼 폐기 이후 첫 내부 제품 빌드. asar 176.92 MB, 21,291개의 `node_modules/` 항목 포함, `verify:bundle` 7/7 PASS.

## 사용자에게 보이는 것

- 첫 실행 시의 **멀티 런타임 선택기** — Hermes(기본, 포트 8642), IronClaw(게이트웨이 핸드오프, 포트 3231), OpenClaw(선택, 포트 18789). 런타임 선택과 프로바이더 선택은 독립된 결정입니다.
- **프로바이더 계층** — 로컬 프로바이더(Ollama, LM Studio, vLLM, llama.cpp, 모든 OpenAI 호환 엔드포인트)와 원격 API(OpenAI, Anthropic, Google Gemini, Azure OpenAI, OpenRouter, 운영자의 자체 게이트웨이)에 연결.
- **Models 페이지** — `127.0.0.1`에서 실행 중인 로컬 서버를 스캔하고 Ollama / LM Studio를 원클릭으로 제안하며, 카드별 30초 프로브 간격의 헬스닷 표시.
- **채팅 화면** — SSE 스트리밍, Markdown 렌더링, 구문 강조, 토큰 사용량 푸터.
- **세션 관리** — 전문 검색(SQLite FTS5), 날짜별 그룹화된 기록, 대화 간 재개 및 검색.
- **프로필 전환** — 프로필별로 프로바이더, 세션, 상태가 분리됨.
- **Sandbox Tasks 화면**(V2.10.65) — IronClaw WASM 샌드박스 워크플로용.
- **선택적 sidecar** — CodeGraph(시맨틱 코드 인텔리전스), EverOS(메모리 + 하니스), Headroom(컨텍스트 압축) — 모두 사용자 주도 활성화, 자동 설치 없음.
- **스킬, 메모리, 스케줄, 칸반, 플랜** 화면 — 사용자가 직접 확인 가능한 JSON 레지스트리로 지원.
- **자동 업데이터** — `electron-updater`가 본 저장소의 GitHub Releases 피드를 참조.
- **i18n** — i18next로 9개 로케일 지원.

## 미리보기

아래 이미지는 모두 현재 데스크톱 빌드의 전체 페이지 캡처입니다. 갤러리는 첫 실행, 런타임 감지, 사이드바의 주요 운영자 화면을 모두 다룹니다.

<table>
<tr>
<td width="50%" align="center"><b>환영 &amp; 첫 실행</b><br/><img width="100%" alt="환영" src="previews/welcome.png" /></td>
<td width="50%" align="center"><b>원격 게이트웨이 연결</b><br/><img width="100%" alt="원격 게이트웨이" src="previews/welcome-remote.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>SSH 터널 핸드오프</b><br/><img width="100%" alt="SSH 핸드오프" src="previews/welcome-ssh.png" /></td>
<td width="50%" align="center"><b>런타임 감지</b><br/><img width="100%" alt="런타임 감지" src="previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>채팅 (SSE 스트리밍)</b><br/><img width="100%" alt="채팅" src="previews/chat.png" /></td>
<td width="50%" align="center"><b>세션 (SQLite FTS5)</b><br/><img width="100%" alt="세션" src="previews/sessions.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>프로필</b><br/><img width="100%" alt="프로필" src="previews/agents.png" /></td>
<td width="50%" align="center"><b>페르소나 (레거시)</b><br/><img width="100%" alt="페르소나" src="previews/persona.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>플랜</b><br/><img width="100%" alt="플랜" src="previews/plans.png" /></td>
<td width="50%" align="center"><b>CodeGraph (선택적 sidecar)</b><br/><img width="100%" alt="CodeGraph" src="previews/codegraph.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>EverOS (선택적 sidecar)</b><br/><img width="100%" alt="EverOS" src="previews/everos.png" /></td>
<td width="50%" align="center"><b>Headroom (선택적 sidecar)</b><br/><img width="100%" alt="Headroom" src="previews/headroom.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Models (Ollama + LM Studio 스캔)</b><br/><img width="100%" alt="Models" src="previews/models.png" /></td>
<td width="50%" align="center"><b>프로바이더</b><br/><img width="100%" alt="프로바이더" src="previews/providers.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>스킬</b><br/><img width="100%" alt="스킬" src="previews/skills.png" /></td>
<td width="50%" align="center"><b>메모리</b><br/><img width="100%" alt="메모리" src="previews/memory.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>도구</b><br/><img width="100%" alt="도구" src="previews/tools.png" /></td>
<td width="50%" align="center"><b>워크스페이스</b><br/><img width="100%" alt="워크스페이스" src="previews/workspace.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>스케줄</b><br/><img width="100%" alt="스케줄" src="previews/schedules.png" /></td>
<td width="50%" align="center"><b>게이트웨이</b><br/><img width="100%" alt="게이트웨이" src="previews/gateway.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>MCP</b><br/><img width="100%" alt="MCP" src="previews/mcp.png" /></td>
<td width="50%" align="center"><b>설정</b><br/><img width="100%" alt="설정" src="previews/settings.png" /></td>
</tr>
</table>

## Skills 생태계 — 3계층 구성

Skills 화면은 서로 독립적인 세 개의 스킬 트리에서 가져옵니다. 각 트리는 수명 주기가 다르고, **중복은 의도적으로 존재하지 않습니다** — 대상 청중이 다르고 목적도 다릅니다.

### 1계층 — 데스크톱 내장 (28개 스킬, asar에 동봉)

이 스킬들은 첫 실행 시 **Skills → Browse** 탭에서 보입니다. 패키징된 바이너리 내부의 `agent-desktop/.agents/skills/<name>/SKILL.md`에 있어 사용자가 데스크톱을 설치하는 즉시 오프라인에서 사용할 수 있습니다.

**신규 5개 운영자 대상 스킬 (V2.10.71):**

| 스킬 | 운영자가 사용해야 할 때 |
|---|---|
| `first-5-minutes` | "처음이에요", "어디서부터 시작하죠", "방금 설치했어요" — 런타임 선택, 프로바이더 연결, 첫 채팅 실행 안내 |
| `runtime-attach` | "런타임이 연결 안 돼요", "ECONNREFUSED 127.0.0.1:8642" — attach 실패 시 확인할 5가지(Hermes / IronClaw / OpenClaw) |
| `models-page-scan` | "Models 페이지에서 내 Ollama가 안 보여요", "상태 표시등이 빨강이에요" — 루프백 스캔, 상태 프로브, LAN 옵트인 |
| `sidecar-setup` | "CodeGraph / EverOS / Headroom 어떻게 설치하나요" — 3개의 선택형 sidecar, 프로필별 옵트인 |
| `session-search` | "X에 대한 내 채팅 찾기", "과거 세션 검색" — SQLite FTS5 패턴, 할 수 있는 것 / 없는 것 |

**기존 23개 스킬 (런타임 통합에서 유지):**

| 카테고리 | 스킬 |
|---|---|
| 런타임 패턴 | `hermes-agent`, `hermes-imports`, `openclaw-persona-forge` |
| 엔지니어링 관행 | `karpathy-guidelines`, `careful`, `continuous-learning-v2`, `learn`, `eval-harness`, `freeze` |
| Electron 전용 | `electron-pro`, `windows-desktop-e2e` |
| 디자인과 품질 | `design-taste-frontend` |
| 워크플로 | `plan-tune`, `wiki-conventions`, `kanban-task-shape`, `diff-overlay-writer` |
| 메타 하네스 | `agent-harness-construction`, `autonomous-agent-harness`, `agentic-engineering` |
| 도구 | `markitdown-mcp`, `office-hours`, `investigate` |

사용자는 이 중 어느 것이든 한 번의 클릭으로 설치할 수 있습니다. 신규 5개 운영자 대상 스킬은 Browse 탭에서 `source: "bundled-desktop"` 플래그와 frontmatter의 `source: "cubecloud"` 태그로 표시되어, 데스크톱을 위해 작성된 것인지 상류에서 가져온 것인지를 운영자가 구분할 수 있습니다.

### 2계층 — Hermes 내장 (런타임 설치 시 추가됨)

Hermes 런타임이 설치되면(첫 실행 로컬 설치), 데스크톱은 hermes-agent 리포지토리에 동봉된 스킬을 발견합니다. 위치는 `<HERMES_REPO>/skills/<category>/<name>/SKILL.md`입니다. 이 스킬들은 Skills → Browse 탭에서 데스크톱 내장 항목과 함께 표시되며 `source: "bundled"` 태그가 붙습니다. 개수는 Hermes 버전에 따라 달라지며, 런타임 설치 후 보통 100개 이상이 됩니다.

### 3계층 — Monorepo 개발자용 ({{SKILLS_TOTAL}}개 스킬, 소스 전용)

루트 `.agents/skills/`에는 {{SKILLS_REPOS}}개 상류 리포지토리에서 적합된 {{SKILLS_TOTAL}}개의 스킬이 있습니다. 이것들은 **바이너리에 동봉되지 않습니다** — 이 monorepo 안에서 Copilot / Claude Code / 다른 에이전트를 돌리는 컨트리뷰터를 위해 소스 트리 안에 존재합니다. 데스크톱은 그것들을 보지 못하며, 이는 엔드 사용자가 아닌 컨트리뷰터 대상입니다.

스킬별 전체 내역은 monorepo README의 ["What ships in this repo"](../README.md#what-ships-in-this-repo)에 있습니다.

## 설치

최신 안정 설치 프로그램은 **v2.10.71**입니다. 게시 위치:
<https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.71>.
이전 릴리스는
[Releases 페이지](https://github.com/JZKK720/cubecloud-agentic-os/releases)에
나열되어 있습니다. v0.6.0 및 v0.6.1은 이제 폐기된 `apps/desktop-shell/`
래퍼 트리에서 빌드되었으므로 프리릴리스로 표시되어 있습니다. **v2.10.71
이상을 사용하세요.**

### Windows

[v2.10.71 릴리스](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.71)에서
`cubecloud-agent-desktop-2.10.71-setup.exe`를 다운로드하여 실행하세요.
NSIS 설치 프로그램은 사용자당 원클릭 방식이며, Windows "프로그램 및
기능"에 `cubecloud-agent-desktop`을 등록합니다.

> **Windows 사용자 참고:** 설치 프로그램은 코드 서명되어 있지 않습니다.
> Windows SmartScreen이 첫 실행 시 경고를 표시합니다. **자세한 정보** →
> **실행**을 클릭하세요. 코드 서명은 알려진 후속 작업입니다. 기업
> 인증서가 포함된 OEM 빌드 경로는
> [`../docs/legal/COMMERCIAL_LICENSE.md`](../docs/legal/COMMERCIAL_LICENSE.md)를
> 참조하세요.

설치 프로그램이 필요하지 않다면 `cubecloud-agent-desktop-2.10.71-portable.exe`를
다운로드하세요. 설치 단계 없이 실행되는 단일 파일 포터블입니다.

### macOS / Linux

`electron-builder`는 macOS(`.dmg`) 및 Linux(`.deb`, `.rpm`,
`.AppImage`, `.snap`) 타겟을 생성할 수 있지만, 본 저장소의 CI 빌드
파이프라인은 현재 Windows 아티팩트만 게시합니다. 멀티 플랫폼 CI는
후속 작업이며, App Store Connect, 코드 서명, Linux 스토어 자격
증명을 저장소 설정에 추가해야 합니다.

## 작동 방식

첫 실행 시 앱은 다음을 수행합니다:

1. 에이전트를 **로컬**로 실행할지(`127.0.0.1:<port>`에서 런타임 시작),
   HTTPS를 통해 **원격** 게이트웨이에 연결할지, **SSH 터널**로 포워딩할지
   묻습니다.
2. **로컬 모드:** 선택한 런타임이 이미 실행 중인지 확인하고, 실행 중이
   아니면 의존성 해결 및 진행 상황 추적과 함께 공식 설치 프로그램을
   실행합니다.
3. **원격 / SSH 모드:** 게이트웨이 URL을 묻고, HTTPS로 `/v1/models`
   엔드포인트를 검증한 다음 로컬 설치를 건너뜁니다.
4. **프로바이더**(로컬 모델 엔드포인트 또는 원격 API)를 묻고, 자격
   증명을 프로필별 자격 증명 풀에 저장합니다.
5. 설정이 완료되면 메인 워크스페이스를 시작합니다.

로컬 모드에서 채팅 요청은 SSE 스트리밍으로 `http://127.0.0.1:8642`
(Hermes) 또는 `http://127.0.0.1:3231` (IronClaw)로 전송됩니다. 원격
모드에서는 동일한 스트리밍 프로토콜로 구성된 원격 URL과 통신합니다.
렌더러는 스트림을 실시간으로 파싱하여 도구 진행 상황, Markdown
콘텐츠, 토큰 사용량을 순차적으로 렌더링합니다.

## 지원되는 런타임 및 프로바이더

### 런타임 프로바이더 (3종)

| 런타임 | 역할 | 기본 포트 | 통합 모드 |
|---|---|---|---|
| **Hermes** | 기본 코어 런타임 | 8642 | `native-core` |
| **IronClaw** | WASM 샌드박스 게이트웨이 핸드오프 레인 | 3231 | `optional-bridge` |
| **OpenClaw** | 선택적 미래 레인 | 18789 | `optional-runtime` |

Hermes와 IronClaw가 현재 레인입니다. OpenClaw는 런타임 선택기에
연결되어 있지만 선택적 연결 대상으로 제공됩니다.

### 프로바이더 유형 (루프백 및 원격)

- **로컬 / 루프백:** Ollama, LM Studio, vLLM, llama.cpp, 그리고
  `127.0.0.1`에서 실행되는 기타 모든 OpenAI 호환 엔드포인트.
  Models 페이지(V2.10.60)가 이를 스캔하여 원클릭 제안을 표시합니다.
- **원격 (HTTPS):** OpenAI, Anthropic, Google Gemini, Azure OpenAI,
  OpenRouter, 그리고 운영자가 구성한 기타 모든 OpenAI 호환 API.

로컬 서버 검색은 기본적으로 루프백 전용입니다. LAN 호스트를
포함하려면 렌더러의 `scanLocalServers` 호출에 `extraHosts` 인자를
전달하여 활성화합니다.

## 선택적 sidecar (사용자 주도, 내장 없음)

- **CodeGraph** (`pip install codegraph` + `codegraph init`) — 시맨틱
  코드 인텔리전스 경로. 자세한 내용은
  [`../docs/CODEGRAPH-RUNTIME.md`](../docs/CODEGRAPH-RUNTIME.md).
- **EverOS** (`pip install everos`) — 메모리 + 하니스 sidecar.
  자세한 내용은 [`../docs/EVEROS-SIDECAR.md`](../docs/EVEROS-SIDECAR.md).
- **Headroom** (`pip install headroom-ai`) — 컨텍스트 압축 프록시.
  자세한 내용은
  [`../docs/agent-skills-bundle/HEADROOM.md`](../docs/agent-skills-bundle/HEADROOM.md)
  및 저장소 내장 워크플로 스킬
  [`../.github/skills/headroom-workflow/`](../.github/skills/headroom-workflow/).

이들은 모두 선택 사항입니다. 사이드카 없이도 데스크톱은 완전히
동작합니다. 통합은 사용자 단위로 opt-in입니다.

## 개발

### 사전 요구 사항

- Node.js 22 (`.github/workflows/ci.yml`에 고정된 버전)
- npm 10+ (Node 22에 포함)
- Windows 10/11 — NSIS / 포터블 빌드 타겟용
- Unix 계열 셸 — 개발 모드 (macOS, Linux, WSL에서 동작)

### 의존성 설치

```bash
cd agent-desktop
npm install
```

설치는 데스크톱 실행에 필요한 930개의 런타임 패키지를
`agent-desktop/node_modules/`에 채웁니다. 이는 **독립 실행형
설치**이며, 모노레포 루트는 데스크톱의 `node_modules/`를 관리하지
않습니다.

### 개발 모드 시작

```bash
cd agent-desktop
npm run dev
```

`electron-vite dev`가 핫 리로드가 적용된 Vite 렌더러, 자동 재시작되는
Electron 메인 프로세스, preload 브리지를 시작합니다.

### 포커스 테스트 실행

```bash
cd agent-desktop
npm run test
```

전체 스위트는 약 95개의 Vitest 파일입니다. CI는 릴리스를 게이트하는
3개의 포커스 테스트(`App.gateway.dom.test.tsx`,
`App.kanban.dom.test.tsx`, `runtimeSessions.test.ts`)를 실행합니다.

### Windows 설치 프로그램 빌드

```bash
cd agent-desktop
npm run build:win
```

`electron-builder`가 `agent-desktop/dist/` 아래에 NSIS 설치 프로그램과
포터블 실행 파일을 생성합니다. Windows가 필요합니다.

### 패키지된 asar 검증

```bash
cd agent-desktop
npm run verify:bundle
```

`release-bundle.test.ts` 스위트를 실행하여 asar에 예상되는
`node_modules/`, `out/main/index.js`, `out/preload/index.js` 항목과
`BrowserWindow` / `createWindow` / `whenReady` 참조의 존재를 검증합니다.

## 다음에 볼 곳

- **agentic-OS 모노레포 README** — [`../README.md`](../README.md)
- **마스터 핸드북** — [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)
  (1-스크린 투어)
- **장문의 주제별 심화 문서** — [`../docs/handbook/`](../docs/handbook/)
  (아키텍처, 개발, 운영)
- **라이선스 / 브랜드** — [`../LICENSE`](../LICENSE) 및
  [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
- **활성 / 스크래치패드 / 미러 인덱스** —
  [`../docs/RETIRED_AND_LEGACY.md`](../docs/RETIRED_AND_LEGACY.md)
- **스킬 생태계** — [`../.agents/skills/README.md`](../.agents/skills/README.md)
  ({{SKILLS_UPSTREAM}}개 스킬, `~/.agents/skills/`로 미러)
- **런타임 오케스트레이션 심화** —
  [`../docs/handbook/ARCHITECTURE.md`](../docs/handbook/ARCHITECTURE.md#runtime-orchestration-deep)
- **Hermes / IronClaw / OpenClaw 연결 smoke** —
  [`../docs/hermes-agent-attach.smoke.md`](../docs/hermes-agent-attach.smoke.md)
  및 [`../docs/ironclaw-attach.smoke.md`](../docs/ironclaw-attach.smoke.md)

## 라이선스

Cubecloud 자체 저작물은 **AGPL-3.0-or-later, Apache-2.0, MIT** 중
자유롭게 선택하는 듀얼 라이선스입니다. Cubecloud 자체 모듈을 호스팅하는
상속된 `hermes-desktop` 프레임워크 코드는 하드 MIT로 유지됩니다.
경로별 분류와 버전별 전환 기록은 [`../LICENSE`](../LICENSE) 및
[`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)를 참조하세요.
