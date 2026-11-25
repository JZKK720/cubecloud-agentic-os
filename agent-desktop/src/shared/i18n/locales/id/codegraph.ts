// String layar CodeGraph.

export default {
  eyebrow: "Kecerdasan kode",
  title: "CodeGraph",
  summary:
    "Indeks sebuah repositori sekali, lalu ajukan pertanyaan struktural tentangnya. CodeGraph menelusuri AST untuk memetakan titik masuk, impor, dan rantai pemanggilan agar agent dapat menalar kode yang belum dibacanya baris demi baris.",
  runtime: "Runtime lokal",
  repos: {
    title: "Repositori yang diindeks",
    empty:
      "Belum ada repositori yang diindeks. Tambahkan repositori di bawah untuk membangun grafnya.",
  },
  addRepo: "Tambah repositori",
  files: "file",
  nodes: "node",
  edges: "edge",
  cli: {
    installed: "CLI terpasang",
    version: "Versi",
    missingTitle: "CodeGraph CLI tidak ditemukan",
    missingBody:
      "Instal CodeGraph CLI untuk mengindeks repositori, atau arahkan Hermes ke indeks yang sudah ada. Desktop tidak akan menginstalnya untuk Anda.",
    install: "Instal CodeGraph CLI",
    setupHermes: "Konfigurasikan Hermes",
  },
  contextBundle: "Bundel konteks",
  contextBundleHint:
    "Jelaskan arsitektur atau jalur kode yang Anda perlukan konteksnya. CodeGraph mengumpulkan file dan edge yang relevan menjadi satu lampiran yang dapat Anda jatuhkan ke Chat.",
  promptPlaceholder:
    "Ringkas arsitektur, hot path, dan titik ekstensi yang mungkin untuk …",
  build: "Bangun bundel",
  building: "Membangun…",
  embeddedSearch: "Pencarian tertanam",
  embeddedSearchHint:
    "Kueri indeks langsung dari shell. Hasil diurutkan berdasarkan kedekatan graf, bukan sekadar kecocokan teks.",
  embeddedSdkVersion: "Versi SDK",
  embeddedProjectOpen: "Proyek terbuka",
  embeddedOpenProject: "Buka proyek",
  embeddedSearchPlaceholder: "Ajukan pertanyaan struktural, mis. di mana auth ditegakkan?",
  embeddedSearchCta: "Cari graf",
} as const;
