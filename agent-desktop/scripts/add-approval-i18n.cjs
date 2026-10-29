const fs = require("fs");
const path = require("path");

const dir = path.join("src", "shared", "i18n", "locales");

const COPY = {
  en: {
    postHocTitle: "Already ran",
    postHocHint:
      "These actions ran before the desktop could ask. They cannot be undone from here.",
  },
  es: {
    postHocTitle: "Ya se ejecutó",
    postHocHint:
      "Estas acciones se ejecutaron antes de que el escritorio pudiera preguntar. No se pueden deshacer desde aquí.",
  },
  id: {
    postHocTitle: "Sudah dijalankan",
    postHocHint:
      "Tindakan ini dijalankan sebelum desktop dapat bertanya. Tidak dapat dibatalkan dari sini.",
  },
  ja: {
    postHocTitle: "実行済み",
    postHocHint:
      "これらの操作はデスクトップが確認する前に実行されました。ここから取り消すことはできません。",
  },
  "pt-BR": {
    postHocTitle: "Já executado",
    postHocHint:
      "Estas ações foram executadas antes que o desktop pudesse perguntar. Não podem ser desfeitas aqui.",
  },
  "pt-PT": {
    postHocTitle: "Já executado",
    postHocHint:
      "Estas ações foram executadas antes de o ambiente poder perguntar. Não podem ser desfeitas aqui.",
  },
  "zh-CN": {
    postHocTitle: "已执行",
    postHocHint: "这些操作在桌面端来得及询问之前就已经执行，无法在此撤销。",
  },
  "zh-TW": {
    postHocTitle: "已執行",
    postHocHint: "這些操作在桌面端來得及詢問之前就已經執行，無法在此復原。",
  },
};

let changed = 0;
for (const [locale, keys] of Object.entries(COPY)) {
  const file = path.join(dir, locale, "chat.ts");
  if (!fs.existsSync(file)) {
    console.log(`${locale}: no chat.ts — skipped`);
    continue;
  }
  let src = fs.readFileSync(file, "utf8");
  if (src.includes("postHocTitle")) {
    console.log(`${locale}: already present`);
    continue;
  }
  // Insert the two keys right after `working: "...",` inside the approval block.
  const re = /(approval:\s*\{[\s\S]*?working:\s*"[^"]*",)/;
  if (!re.test(src)) {
    console.log(`${locale}: APPROVAL BLOCK NOT FOUND — skipped`);
    continue;
  }
  src = src.replace(
    re,
    `$1\n    postHocTitle: ${JSON.stringify(keys.postHocTitle)},\n    postHocHint: ${JSON.stringify(keys.postHocHint)},`,
  );
  fs.writeFileSync(file, src, "utf8");
  changed += 1;
  console.log(`${locale}: added`);
}
console.log(`\nfiles changed: ${changed}`);
