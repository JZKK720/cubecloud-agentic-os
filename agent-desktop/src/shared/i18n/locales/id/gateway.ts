export default {
  title: "Gateway",
  messagingGateway: "Gateway Pesan",
  platforms: "Platform",
  status: "Status",
  running: "Berjalan",
  stopped: "Berhenti",
  gatewayHint:
    "Menghubungkan Hermes ke Telegram, Discord, Slack, dan platform lainnya",
  group: {
    messaging: "Pesan",
    eastern: "Platform Asia",
    async: "Saluran asinkron",
    home: "Otomasi rumah",
  },
  runtimes: {
    title: "Runtimes",
    summary:
      "Registri runtime yang sama seperti di layar penyambutan. Setiap baris menunjukkan apakah runtime siap di mesin ini.",
    registryLabel: "Registri runtime",
    refreshAria: "Pindai ulang registri runtime",
    empty: "Belum ada runtime terpasang. Penyambutan akan memasang Hermes secara default.",
    statusReady: "Runtime siap menjalankan gateway.",
    statusUnavailable: "Runtime belum tersedia di mesin ini.",
    detected: "Terdeteksi",
    responded: "Merespons",
    scanning: "Memindai…",
    localProbesLabel: "Pemindaian gateway lokal",
    localProbesRefreshAria: "Pindai port gateway localhost",
    localProbesEmpty:
      "Tidak ada gateway lokal yang merespons. Buka penyambutan untuk memasang atau menghubungkan.",
    discoveryHint:
      "Runtime ini menyediakan permukaan penemuan yang dapat dipanggil dari layar penyambutan.",
  },
  container: {
    title: "Penemuan kontainer",
    summary:
      "Pindai Docker Desktop untuk runtime yang berpasangan (IronClaw, OpenClaw, dan penyedia lain yang memublikasikan gateway Docker).",
    sharedHint:
      "Registri yang sama dengan layar penyambutan. Pindai ulang di sini setelah memulai atau menghentikan kontainer.",
    statusLabel: "Status pemindaian Docker",
    refreshAria: "Pindai ulang runtime Docker Desktop",
    rescan: "Pindai ulang",
    empty:
      "Tidak ada runtime Docker yang terdeteksi. Pasang Docker Desktop atau mulai kontainer berpasangan.",
    scannedAt: "Pemindaian terakhir {{value}}",
  },
} as const;
