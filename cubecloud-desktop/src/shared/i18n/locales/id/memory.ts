export default {
  title: "Memori",
  subtitle:
    "Hal yang diingat Hermes tentang Anda dan lingkungan Anda di berbagai sesi.",
  sessions: "Sesi",
  messages: "Pesan",
  memories: "Memori",
  providersTitle: "Provider",
  agentMemory: "Memori Agent",
  userProfile: "Profil Pengguna",
  entries: "{{count}} entri",
  addMemory: "Tambah Memori",
  addFailed: "Gagal menambah entri",
  updateFailed: "Gagal memperbarui entri",
  saveFailed: "Gagal menyimpan",
  entriesPlaceholder:
    "mis. Pengguna lebih suka TypeScript daripada JavaScript. Selalu gunakan strict mode.",
  userProfilePlaceholder:
    "mis. Nama: Alex. Senior developer. Lebih suka jawaban ringkas. Menggunakan macOS dengan zsh. Zona waktu: WIB.",
  noProvidersFound:
    "Tidak ada provider memori yang ditemukan di instalasi ini.",
  openProviderWebsite: "Buka situs provider",
  noMemoriesYet:
    "Belum ada memori. Hermes akan menyimpan fakta penting saat Anda chat.",
  noMemoryEntries: "Belum ada entri memori.",
  noToolsetsFound: "Tidak ada toolset ditemukan.",
  addManuallyHint:
    "Anda juga dapat menambahkan memori secara manual dengan tombol di atas.",
  userProfileHint:
    "Beri tahu Hermes tentang diri Anda - nama, peran, preferensi, dan gaya komunikasi.",
  providersHint:
    "Provider memori pluggable memberi Hermes memori jangka panjang yang lebih canggih. Memori bawaan (di atas) selalu aktif bersama provider yang dipilih.",
  providersHintActive: "Aktif: <strong>{{provider}}</strong>",
  providersHintInactive:
    "Tidak ada provider eksternal aktif - hanya memakai memori bawaan.",
  enterEnvKey: "Masukkan {{key}}",
  chars: "{{count}} karakter",
  cancel: "Batal",
  save: "Simpan",
  edit: "Edit",
  deleteConfirm: "Hapus?",
  yes: "Ya",
  no: "Tidak",
  saveProfile: "Simpan Profil",
  active: "Aktif",
  deactivate: "Nonaktifkan",
  activating: "Mengaktifkan...",
  activate: "Aktifkan",  wikiTab: "Basis Pengetahuan",  learningsTab: "Pelajaran",

  providers: {
    honcho:
      "Pemodelan pengguna lintas sesi berbasis AI dengan Q&A dialektik dan pencarian semantik",
    hindsight:
      "Memori jangka panjang dengan knowledge graph dan retrieval multi-strategi",
    mem0: "Ekstraksi fakta LLM sisi server dengan pencarian semantik dan auto-deduplication",
    retaindb: "API memori cloud dengan hybrid search dan 7 tipe memori",
    supermemory:
      "Memori jangka panjang semantik dengan profile recall dan ekstraksi entitas",
    holographic:
      "Penyimpanan fakta SQLite lokal dengan pencarian FTS5 dan trust scoring (tanpa API key)",
    openviking:
      "Memori terkelola sesi dengan retrieval bertingkat dan penjelajahan pengetahuan",
    byterover:
      "Pohon pengetahuan persisten dengan retrieval bertingkat melalui brv CLI",
  },

  // Learnings (V2 Step 10 — gstack /learn)
  learnings: {
    subtitle:
      "Pola, jebakan, dan preferensi yang bertahan antar sesi.",
    empty: "Belum ada pelajaran. Akan ditambahkan di sini saat muncul.",
    searchPlaceholder: "Cari berdasarkan kunci, keahlian, atau insight…",
    typeLabel: "Jenis",
    sourceLabel: "Sumber",
    allTypes: "Semua jenis",
    allSources: "Semua sumber",
    stats: {
      total: "{{count}} total",
      unique: "{{count}} unik",
      avgConfidence: "keyakinan rata-rata {{value}}",
      byType: "berdasarkan jenis",
      bySource: "berdasarkan sumber",
      topKeys: "kunci utama",
    },
    add: "Tambah pelajaran",
    addTitle: "Tambah sebuah pelajaran",
    keyLabel: "Kunci",
    keyPlaceholder: "mis. careful.rm-recursive",
    insightLabel: "Insight",
    insightPlaceholder: "Apa yang kita pelajari?",
    skillLabel: "Keahlian (opsional)",
    typeField: "Jenis",
    sourceField: "Sumber",
    confidenceLabel: "Keyakinan (0-1)",
    filesLabel: "Berkas (dipisah koma, opsional)",
    cancel: "Batal",
    save: "Simpan",
    export: "Ekspor sebagai Markdown",
    copied: "Disalin ke papan klip",
    copy: "Salin",
    findStale: "Cari yang usang",
    clear: "Hapus semua",
    clearConfirm:
      "Hapus semua pelajaran untuk profil ini? Tindakan ini tidak dapat dibatalkan.",
    noFile: "Belum ada learnings.jsonl.",
    noSearchResults:
      "Tidak ada pelajaran yang cocok dengan filter saat ini.",
    staleness: {
      label: "usang",
      empty: "Tidak ada pelajaran yang usang.",
    },
  },

  // Knowledge (V2 Step 14 — gbrain knowledge MCP)
  knowledge: {
    searchPlaceholder: "Cari di basis pengetahuan…",
    search: "Cari",
    list: "Daftar",
    sources: "Sumber mentah",
    synthesize: "Sintesis topik",
    topicPlaceholder: "Apa yang ingin Anda ketahui?",
    filterType: "Filter berdasarkan jenis",
    allTypes: "Semua jenis",
    open: "Buka",
    empty: "Belum ada halaman pengetahuan.",
    sourcesEmpty: "Belum ada sumber mentah yang di-ingest.",
    result: "{{count}} hasil",
    synthesisTitle: "Sintesis",
    claimsTitle: "Klaim ({{count}})",
    gapsTitle: "Kesenjangan ({{count}})",
    sourcesTitle: "Sumber ({{count}})",
    freshness: "Kesegaran: {{when}}",
    noSynthesis: "Jalankan sintesis untuk melihat jawaban lapisan otak.",
    citation: "kutip",
  },
} as const;
