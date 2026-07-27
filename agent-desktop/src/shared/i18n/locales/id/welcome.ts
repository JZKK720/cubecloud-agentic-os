export default {
  flowTitle: "Siapkan gateway Anda",
  subtitle:
    "Asisten AI yang terus berkembang dan berjalan lokal di mesin Anda. Privat, kuat, dan selalu belajar.",
  installIssueTitle: "Masalah Instalasi",
  installLocalRuntime: "Pasang runtime lokal",
  getStarted: "Mulai",
  retryInstall: "Ulangi Instalasi",
  terminalTitle: "Atau instal {{runtime}} dengan satu perintah:",
  terminalInstallHint: "Instal melalui terminal, lalu kembali ke sini:",
  recheck: "Saya sudah menginstalnya - periksa lagi",
  switchToLocal: "Beralih ke mode lokal",
  installSizeHint: "Ini akan menginstal komponen yang diperlukan (~2 GB)",
  lanePickerHint:
    // V2.10.61 — rewritten to drop the false-promise "below"
    // Docker handoff reference (the panel is not rendered in
    // Welcome.tsx). The Docker Desktop attach panel is a clean
    // V2.10.62 candidate; until then, the lane picker points
    // users at the remote panel as the truthful IronClaw path.
    "Ini adalah jalur gateway langsung. {{ironclaw}} tersedia sebagai runtime kontainer — pilih dari panel remote untuk memasang ke port yang diterbitkan.",
  copyInstallCommand: "Salin perintah instalasi",
  dividerOr: "atau",
  connectRemote: "Hubungkan ke runtime remote",
  connectRemoteTitle: "Hubungkan ke runtime remote",
  connectRemoteSubtitle:
    "Masukkan URL server API yang kompatibel dengan Cubecloud.",
  remoteServerUrl: "URL Server",
  remoteApiKey: "API Key (opsional)",
  remoteApiKeyPlaceholder: "Bearer token (API_SERVER_KEY)",
  testingConnection: "Menguji",
  connect: "Hubungkan",
  remoteHint:
    "Biarkan key kosong jika server menerima request tanpa autentikasi (misalnya melalui SSH tunnel ke localhost).",
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM, and more are configured in the next step.",
  dockerScanCopy:
    "Untuk container gateway ({{runtimes}}) yang sudah ada. Lanjutkan dengan instalasi lokal default di bawah ini jika belum ada yang berjalan.",
  dockerScanning: "Memindai Docker Desktop untuk container gateway {{runtime}}...",
  dockerEmpty:
    "Tidak ada gateway ({{runtimes}}) yang siap dihubungkan. Mulai container, publikasikan port lokalnya, lalu pindai ulang.",
  localGatewayCopy: "If a localhost gateway is already running, Agent Desktop can use it directly. This probe also checks the default OpenClaw loopback port.",
  localGatewayEmpty: "No live localhost gateway responded on {{ports}}. Install the local {{runtime}} only if no other gateway is reachable.",
  designDials: {
    title: "Design Dials",
    subtitle:
      "Three knobs that nudge the agent's tone. Changes apply to this profile only and can be tuned later from Settings.",
    varianceLabel: "Variance",
    varianceHint:
      "How expressive the phrasing is. 0 = dry and literal, 100 = metaphorical and colorful.",
    motionLabel: "Motion",
    motionHint:
      "How structured the response is. 0 = flowing essay, 100 = heavy bullet / step list.",
    densityLabel: "Density",
    densityHint:
      "How much information per paragraph. 0 = airy and short, 100 = tightly packed.",
    reset: "Setel ulang ke default",
    saved: "Tersimpan.",
  },
  // V2.10.77 — Judul + subjudul panel SSH
  connectSshPanelTitle: "Hubungkan via SSH",
  connectSshSubtitleHermes:
    "Teruskan gateway {{runtime}} yang ada via SSH tanpa mengekspos port yang dipublikasikan secara langsung.",
  connectSshSubtitleOpenclaw:
    "Teruskan gateway {{runtime}} yang ada via SSH. Kompatibilitas HTTP harus diaktifkan di gateway jarak jauh.",
  connectSshSubtitleIronclaw:
    "Teruskan gateway {{runtime}} yang ada via SSH tanpa mengekspos port kontainer yang dipublikasikan secara langsung.",
} as const;
