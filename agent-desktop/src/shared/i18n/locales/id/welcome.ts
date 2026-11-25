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
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  connectRemotePanelTitle: "Hubungkan ke gateway remote",
  connectRemoteSubtitleHermes:
    "Gunakan URL runtime yang ada saat Agent Desktop harus terpasang ke gateway {{runtime}} yang sedang berjalan alih-alih menginstal secara lokal.",
  connectRemoteSubtitleOpenclaw:
    "Pasangkan ke endpoint kompatibilitas {{runtime}} yang sedang berjalan alih-alih menginstal secara lokal. Agent Desktop mengharapkan permukaan kompatibilitas HTTP OpenClaw diaktifkan.",
  connectRemoteSubtitleIronclaw:
    "Pasangkan ke gateway kontainer WASM-sandbox {{runtime}} yang sedang berjalan alih-alih menginstal secara lokal. Gunakan port gateway yang dipublikasikan (default 3231) dan permukaan operator /api/health.",
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
  runtimeLane: "Jalur runtime",
  sshHost: "Host SSH",
  sshHostPlaceholder: "192.168.1.100 atau myserver.local",
  sshPort: "Port SSH",
  sshPortPlaceholder: "22",
  sshUsername: "Nama Pengguna",
  sshUsernamePlaceholder: "user",
  sshKeyPath: "Path Kunci Privat",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "(opsional — default ke ~/.ssh/id_rsa)",
  sshRemotePort: "Port Runtime Remote",
  sshRemotePortNote: "(default {{port}})",
  sshRuntimeOpenclawNote:
    "{{runtime}} biasanya mendengarkan di {{port}} dan memerlukan permukaan kompatibilitas HTTP diaktifkan sebelum Agent Desktop dapat terpasang.",
  sshRuntimeHermesNote:
    "{{runtime}} biasanya mendengarkan di {{port}} untuk pemasangan SSH.",
  sshRuntimeIronclawNote:
    "{{runtime}} biasanya mendengarkan di {{port}} untuk pemasangan SSH dan mengharapkan gateway yang diteruskan mengekspos /api/health plus endpoint /v1 yang kompatibel dengan OpenAI.",
  sshSecretIronclawNote:
    "(opsional kecuali gateway IronClaw yang diteruskan mewajibkan GATEWAY_AUTH_TOKEN)",
  sshSecretOpenclawNote: "(wajib jika autentikasi OpenClaw diaktifkan)",
  sshSecretHermesNote: "(opsional kecuali gateway Hermes remote mewajibkan autentikasi)",
  testingSshConnection: "Menguji koneksi SSH…",
  connectViaSsh: "Hubungkan via SSH",
  sshSystemHint:
    "Menggunakan SSH sistem Anda. Pastikan Anda sudah dapat menjalankan ssh {{user}}@{{host}} tanpa kata sandi.",
  errorLocalInstallHeader: "Pemasangan lokal perlu perhatian",
  errorSshHeader: "Tunnel SSH ke {{runtime}} perlu perhatian",
  errorRemoteHeader: "Koneksi remote {{runtime}} perlu perhatian",
  retryLocalInstall: "Coba lagi pemasangan lokal",
  retrySshConnection: "Coba lagi koneksi SSH",
  retryRemoteConnection: "Coba lagi koneksi remote",
  reviewSshSettings: "Tinjau pengaturan SSH",
  reviewRemoteSettings: "Tinjau pengaturan remote",
  connectViaSshShort: "Hubungkan via SSH",
  connectToRemoteGatewayShort: "Hubungkan ke gateway remote",
  errorPleaseEnterUrl: "Silakan masukkan URL.",
  errorConnectionTestFailed: "Pengujian koneksi gagal.",
  errorHostAndUsernameRequired: "Host dan nama pengguna wajib diisi.",
  errorHostAndUsernameRequiredNoPeriod: "Host dan nama pengguna wajib diisi",
  detectedRuntimesTitle: "Kami menemukan agent yang sedang berjalan",
  detectedRuntimesHealthy:
    "Pilih runtime yang sedang berjalan untuk terhubung sekarang. Menginstal runtime lokal bersifat opsional.",
  detectedRuntimesAuth:
    "Kami menemukan runtime yang memerlukan key. Pilih salah satu untuk mengisi otomatis formulir koneksi remote.",
  authRequiredHint:
    "Runtime ini dapat dijangkau tetapi memerlukan API server key atau token gateway sebelum Agent Desktop dapat terpasang.",
} as const;
