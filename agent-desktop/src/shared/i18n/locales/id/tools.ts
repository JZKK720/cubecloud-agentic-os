export default {
  title: "Alat",
  subtitle:
    "Aktifkan atau nonaktifkan toolset yang dapat digunakan agent selama percakapan",
  empty: "Tidak ada toolset tersedia",
  emptyHint: "Toolset akan muncul di sini setelah gateway berjalan.",
  web: {
    label: "Pencarian Web",
    description: "Cari di web dan ekstrak konten dari URL",
  },
  browser: {
    label: "Browser",
    description: "Jelajahi, klik, ketik, dan berinteraksi dengan halaman web",
  },
  terminal: {
    label: "Terminal",
    description: "Jalankan perintah dan skrip shell",
  },
  file: {
    label: "Operasi File",
    description: "Baca, tulis, cari, dan kelola file",
  },
  code_execution: {
    label: "Eksekusi Kode",
    description: "Jalankan kode Python dan shell secara langsung",
  },
  vision: { label: "Vision", description: "Analisis gambar dan konten visual" },
  image_gen: {
    label: "Pembuatan Gambar",
    description: "Buat gambar dengan DALL-E dan model lainnya",
  },
  tts: {
    label: "Teks ke Ucapan",
    description: "Ubah teks menjadi audio suara",
  },
  skills: {
    label: "Skill",
    description: "Buat, kelola, dan jalankan skill yang dapat digunakan ulang",
  },
  memory: {
    label: "Memori",
    description: "Simpan dan panggil kembali pengetahuan persisten",
  },
  session_search: {
    label: "Pencarian Sesi",
    description: "Cari di seluruh percakapan sebelumnya",
  },
  clarify: {
    label: "Pertanyaan Klarifikasi",
    description: "Minta klarifikasi dari pengguna saat diperlukan",
  },
  delegation: {
    label: "Delegasi",
    description: "Buat sub-agent untuk tugas paralel",
  },
  cronjob: {
    label: "Cron Job",
    description: "Buat dan kelola tugas terjadwal",
  },
  moa: {
    label: "Campuran Agen",
    description: "Koordinasikan beberapa model AI bersama-sama",
  },
  todo: {
    label: "Perencanaan Tugas",
    description: "Buat dan kelola daftar tugas untuk pekerjaan kompleks",
  },
  file_to_markdown: {
    label: "Berkas ke Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  workspace: {
    subtitle:
      "Kain kerja percakapan — sesi, file, dan kain runner yang menggerakkan adapter CLI. Lampirkan saat Anda ingin konsol mengaturnya.",
    start: "Mulai",
    stop: "Hentikan",
    probing: "Memeriksa…",
    reachable: "Dapat dijangkau",
    unreachable: "AI Workspace tidak dapat dijangkau di",
    attachedAt: "Terpasang pada",
  },
  mcpServers: "Server MCP",
  mcpDescription:
    "Server Model Context Protocol yang dikonfigurasi di config.yaml. Kelola melalui <code>hermes mcp add/remove</code> di terminal.",
  http: "HTTP",
  stdio: "stdio",
  disabled: "nonaktif",
  // V2.10.77 — Panel alat
  panels: {
    laya: {
      subtitle:
        "Mesin keputusan System-1 lokal — keputusan choice/score dengan confidence dan abstain bertipe, diekspos ke konsol melalui MCP.",
      ready: "Siap",
      broken: "Terpasang tetapi pemeriksaan versi gagal",
    },
    weknora: {
      subtitle:
        "Platform pengetahuan RAG perusahaan opsional. Hanya retrieval di sisi konsol; server WeKnora Anda yang memiliki datanya.",
      reachable: "Dapat dijangkau",
      unreachable: "Tidak dapat dijangkau",
    },
    governance: {
      title: "Tata kelola workspace",
      subtitle:
        "Registry kebijakan, tugas terjadwal, dan berbagi dari AI Workspace — tampilan tata kelola konsol. Verdict persetujuan diberikan oleh Anda, ke endpoint resolve workspace.",
      visible: "Terlihat",
      unavailable: "Permukaan tata kelola tidak dapat dijangkau",
    },
    openviking: {
      subtitle:
        "Basis data konteks agen opsional — resource, memori, dan skill dalam satu filesystem viking:// yang dapat dijelajahi (interop-only; inti AGPL).",
      reachable: "Dapat dijangkau",
      unreachable: "Tidak dapat dijangkau",
    },
    gbrain: {
      title: "GBrain (Memori Persisten)",
      subtitle:
        "Otak pengetahuan pribadi native Postgres dengan 30+ alat MCP — pencarian hibrida, sintesis, graf pengetahuan dan siklus mimpi. Local-first via PGLite (tanpa konfigurasi, tanpa Docker). Lapisan memori yang membuat agen Anda berhenti amnesia.",
      healthy: "Sehat",
      unhealthy: "Tidak sehat",
      notInstalled:
        'GBrain belum terpasang. Pasang dengan: <code>bun install -g github:garrytan/gbrain</code> lalu inisialisasi dengan <code>gbrain init --pglite --no-embedding</code>.',
    },
    wigolo: {
      title: "Wigolo (Intelijensi Web Lokal)",
      subtitle:
        'Intelijensi web local-first — cari, ambil, crawl, ekstrak, dan riset. 10 alat MCP, tanpa kunci API untuk alat inti. Pelengkap lokal gratis untuk Firecrawl (berbayar). Tersedia sebagai server MCP di layar MCP.',
      hint: 'Tambahkan via layar MCP: cari "wigolo". Tidak perlu pemasangan — npx mengunduh saat pertama dijalankan.',
    },
    watchSkill: {
      title: "Watch-Skill (Intelijensi Video)",
      subtitle:
        "Intelijensi video untuk agen — tonton, ingat, verifikasi. 23 alat MCP untuk analisis video, transkripsi, OCR, dan THE LOOP (verifikasi browser/UI). Tersedia sebagai server MCP di layar MCP.",
      hint: 'Tambahkan via layar MCP: cari "watch-skill". Pasang dengan: <code>uv tool install watch-skill</code> (Python 3.13+).',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "Otomatisasi browser berbasis LLM melalui Chrome DevTools Protocol. Agen membuka halaman, klik, ketik, isi formulir, ekstrak data, dan QA-test situs web. browser-harness adalah konektor CDP ringan; browser-use adalah otak agen.",
      installed: "Terpasang",
      doctorOk: " — doctor: OK",
      doctorIssues: " — doctor: masalah ditemukan",
      doctorNotRun: " — doctor: belum dijalankan",
      hint: 'Tambahkan browser-use sebagai server MCP: cari "browser-use" di layar MCP. Set BU_CDP_URL di Pengaturan untuk menghubungkan ke Chrome via CDP.',
      notInstalled:
        'Browser Harness belum terpasang. Pasang dengan: <code>uv tool install browser-harness</code> (Python 3.12+). Lalu aktifkan debugging jarak jauh di Chrome via <code>chrome://inspect/#remote-debugging</code>.',
    },
    officecli: {
      title: "OfficeCLI (Otomasi Dokumen Office)",
      subtitle:
        "Buat, baca, edit, dan render dokumen Word (.docx), Excel (.xlsx), dan PowerPoint (.pptx) — tanpa perlu memasang Office. Biner tunggal dengan rendering HTML/PNG bawaan, 350+ rumus Excel, penggabungan template, dan pivot table. Pelengkap sisi-tulis untuk konversi sisi-baca markitdown.",
      installed: "Terpasang",
      hint: 'Tambahkan sebagai server MCP: cari "officecli" di layar MCP. Agen dapat membuat, mengedit, dan merender dokumen Office via CLI atau MCP.',
      notInstalled:
        'OfficeCLI belum terpasang. Pasang dengan: <code>npm install -g @officecli/officecli</code> atau unduh dari <code>https://github.com/iOfficeAI/OfficeCLI</code>. Biner tunggal, tanpa .NET runtime.',
      run: {
        title: "Jalankan perintah dokumen",
        fileLabel: "Path dokumen",
        filePlaceholder: "Path absolut ke file .docx, .xlsx atau .pptx",
        verbLabel: "Perintah",
        argsLabel: "Argumen",
        argsPlaceholder: "Argumen tambahan, mis. --page 1-3 (opsional)",
        submit: "Jalankan",
        running: "Menjalankan…",
        outputLabel: "Keluaran",
        emptyHint: "Masukkan path di dalam folder rumah atau temp Anda. Path di luar folder itu ditolak.",
        notInstalled: "OfficeCLI belum terpasang, jadi tidak ada yang bisa dijalankan.",
      },
      view: {
        button: "Lihat sebagai lembar sebar",
        loading: "Memuat pratinjau…",
        loadingUniver: "Memuat Univer…",
      },
    },
    graphify: {
      title: "Graphify (Graf Pengetahuan Konseptual)",
      subtitle:
        "Ubah folder apa pun (kode, dokumen, makalah, gambar) menjadi graf pengetahuan konseptual yang dapat dinavigasi dengan deteksi komunitas. Menemukan koneksi antar-dokumen yang tidak terpikirkan. Melengkapi CodeGraph (struktur AST kode) dengan graf konseptual semantik. Menghasilkan HTML interaktif, JSON GraphRAG, dan laporan audit.",
      installed: "Terpasang",
      hint: 'Tambahkan sebagai server MCP: cari "graphify" di layar MCP. Jalankan <code>graphify &lt;path&gt;</code> untuk membangun graf, lalu kueri dengan <code>graphify query "&lt;pertanyaan&gt;"</code>.',
      notInstalled:
        "Graphify belum terpasang. Pasang dengan: <code>uv tool install 'graphifyy[mcp]'</code> (Python 3.12+).",
    },
  },
  agentReachTitle: "Kapabilitas Internet (Agent-Reach)",
  agentReachSubtitle:
    "Agent-Reach memberi agen runtime Anda akses internet — Twitter, Reddit, YouTube, GitHub, RSS, pencarian web, dan lainnya. Instal di mesin gateway dengan: python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "Muat ulang",
  agentReachScanning: "Memindai...",
  agentReachInstalled: "Terpasang",
  agentReachNotInstalled:
    "Agent-Reach belum terpasang. Agen runtime tidak memiliki alat kapabilitas internet.",
  managedApps: {
    title: "Aplikasi terkelola",
    subtitle:
      "Setiap aplikasi yang dapat dipasangkan desktop, beserta status yang dilaporkan adapternya. Hanya baca: desktop mencerminkan layanan ini, tidak mengelolanya.",
    refresh: "Muat ulang",
    loading: "Membaca daftar…",
    empty: "Tidak ada aplikasi terkelola yang terdaftar.",
    needsSetup: "perlu pengaturan",
    needsAuth: "perlu pengaturan",
    unavailable: "Daftar aplikasi terkelola tidak tersedia di build ini.",
  },
} as const;
