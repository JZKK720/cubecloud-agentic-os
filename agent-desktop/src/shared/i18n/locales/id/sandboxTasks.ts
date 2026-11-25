// String layar Sandbox Tasks.

export default {
  title: "Sandbox Tasks",
  subtitle:
    "Kirim tugas ke gateway IronClaw WASM-sandbox. Pemanggilan alat dieksekusi dalam kontainer sandbox yang terisolasi.",
  gatewayUrl: "URL Gateway IronClaw",
  bearerToken: "Bearer token (opsional)",
  connect: "Hubungkan",
  probing: "Memeriksa...",
  connected: "Terhubung",
  notConnected: "Tidak terhubung",
  model: "Model",
  contextFolder: "Folder konteks (opsional)",
  taskDescription: "Jelaskan tugasnya",
  sendToSandbox: "Kirim ke Sandbox",
  dispatching: "Mengirim...",
  completed: "Selesai",
  failed: "Gagal",
  reply: "Balasan",
  toolCalls: "Pemanggilan alat (WASM sandbox)",
  tokenRequiredHint:
    "Gateway dapat dijangkau. Tambahkan token gateway dan hubungkan kembali untuk memuat model.",
} as const;
