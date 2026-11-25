export default {
  "eyebrow": "Memori",
  "title": "EverOS",
  "summary": "EverOS adalah landasan memori jangka panjang yang ditenagai oleh server EverCore yang di-host sendiri. Arahkan shell ke URL dasar EverOS Anda untuk mengingat apa yang pengguna katakan di sesi sebelumnya.",
  "notWired": {
    "title": "Belum terhubung",
    "body": "Integrasi EverOS sedang ditambahkan. Spesifikasi backend sudah diimplementasikan di main; layar ini akan aktif setelah preload bridge selesai.",
    "addHarness": "Add harness (coming soon)"
  },
  "scope": {
    "label": "Cakupan",
    "hint": "Konsol ini hanya membaca dan menulis cakupan aplikasi agentic-os di EverOS. Cakupan lain (workspace, aplikasi lain) tidak pernah disentuh."
  },
  "health": {
    "title": "Backend",
    "reachable": "Terjangkau",
    "unreachable": "Tidak terjangkau",
    "probing": "Memeriksa…",
    "scannedAt": "Terakhir diperiksa"
  },
  "config": {
    "title": "Koneksi",
    "body": "EverOS berjalan di http://localhost:8000 secara bawaan. Shell akan mengarah ke URL dasar yang dikonfigurasi saat pengguna meminta memori.",
    "baseUrl": "URL dasar",
    "apiKey": "Kunci API",
    "userId": "ID Pengguna",
    "groupId": "ID Grup",
    "topK": "Top K",
    "method": "Metode pengambilan",
    "save": "Simpan",
    "edit": "Konfigurasi",
    "cancel": "Tutup"
  },
  "add": {
    "title": "Ingat",
    "body": "Tulis fakta yang harus disimpan agen. Disimpan ke pengguna/grup yang dikonfigurasi.",
    "placeholder": "mis. Pengguna lebih suka mode gelap dan jawaban ringkas.",
    "cta": "Simpan",
    "sending": "Menyimpan…",
    "success": "{{count}} memori disimpan.",
    "failed": "Gagal menyimpan: {{error}}"
  },
  "search": {
    "title": "Ingatkan",
    "body": "Pencarian hibrid atas memori episodik pengguna.",
    "placeholder": "Apa yang disukai pengguna?",
    "cta": "Cari",
    "searching": "Mencari…",
    "empty": "Belum ada memori yang cocok."
  },
  "recent": {
    "title": "Terkini",
    "empty": "Belum ada memori yang disimpan."
  },
  "setup": {
    "title": "Jalankan secara lokal",
    "body": "EverOS adalah layanan Python dengan Postgres + Milvus. Jalankan dengan Docker Compose dan runner berbasis uv.",
    "healthCheck": "Pastikan layanan hidup:"
  },
  "error": {
    "searchFailed": "Pencarian gagal.",
    "recentFailed": "Tidak dapat memuat memori terkini."
  },
  "sidecar": {
    "title": "Sidecar lokal",
    "body": "EverOS tidak berjalan di {{baseUrl}}. Mulai sidecar untuk menyimpan memori di mesin ini.",
    "reason": "Alasan",
    "lastError": "Error terakhir",
    "pid": "PID",
    "port": "Port",
    "crashCount": "Crash",
    "uptime": "Waktu aktif",
    "start": "Mulai sidecar",
    "stop": "Hentikan sidecar",
    "restart": "Mulai ulang",
    "refreshLogs": "Muat ulang log",
    "logsSummary": "Log ({{count}} baris)",
    "clearLogs": "Bersihkan log"
  },
  "windowsNote": {
    "title": "Catatan Windows",
    "body": "EverOS lokal terkelola mungkin masih memerlukan WSL atau host remote di Windows. Jika sidecar lokal gagal dimulai, tetap gunakan layar ini dengan base URL EverOS yang di-host di WSL atau remote."
  }
};
