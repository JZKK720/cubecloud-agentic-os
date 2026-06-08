// One-shot CJK locale restoration. The CJK common.ts files were
// stored as mojibake (a previous encoding round-trip collapsed
// Shift-JIS / GB18030 / Big5 into garbage UTF-8). Replace each
// known value with a clean, properly-localized string so the
// files are valid TypeScript again and the user can read the
// translations.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "src", "shared", "i18n", "locales");

const zhCN = {
  appName: "Cubecloud Agent Desktop",
  continue: "继续",
  cancel: "取消",
  retry: "重试",
  loading: "加载中…",
  loadingShort: "加载中",
  saved: "已保存",
  save: "保存",
  search: "搜索",
  searchPlaceholder: "搜索…",
  show: "显示",
  hide: "隐藏",
  delete: "删除",
  remove: "移除",
  add: "添加",
  create: "创建",
  close: "关闭",
  confirm: "确认",
  reset: "重置",
  back: "返回",
  open: "打开",
  install: "安装",
  start: "启动",
  stop: "停止",
  refresh: "刷新",
  copy: "复制",
  settings: "设置",
  provider: "提供商",
  model: "模型",
  baseUrl: "基础 URL",
  port: "端口",
  home: "主页",
  released: "已发布",
  engine: "引擎",
  desktop: "桌面",
  noResults: "未找到结果",
  noData: "暂无数据",
  optional: "可选",
  devOnly: "仅供开发者",
  updateAvailable: "更新 v{{version}}",
  downloading: "下载中 {{percent}}%",
  restartToUpdate: "重启以更新",
  updateFailed: "更新失败",
  errorTitle: "出现问题",
  errorMessage: "发生了意外错误。",
  tryAgain: "重试",
  copied: "已复制！",
};

const zhTW = {
  appName: "Cubecloud Agent Desktop",
  continue: "繼續",
  cancel: "取消",
  retry: "重試",
  loading: "載入中…",
  loadingShort: "載入中",
  saved: "已儲存",
  save: "儲存",
  search: "搜尋",
  searchPlaceholder: "搜尋…",
  show: "顯示",
  hide: "隱藏",
  delete: "刪除",
  remove: "移除",
  add: "新增",
  create: "建立",
  close: "關閉",
  confirm: "確認",
  reset: "重設",
  back: "返回",
  open: "開啟",
  install: "安裝",
  start: "啟動",
  stop: "停止",
  refresh: "重新整理",
  copy: "複製",
  settings: "設定",
  provider: "供應商",
  model: "模型",
  baseUrl: "基礎 URL",
  port: "連接埠",
  home: "首頁",
  released: "已發布",
  engine: "引擎",
  desktop: "桌面",
  noResults: "找不到結果",
  noData: "目前沒有資料",
  optional: "選用",
  devOnly: "僅供開發者使用",
  updateAvailable: "更新 v{{version}}",
  downloading: "下載中 {{percent}}%",
  restartToUpdate: "重新啟動以更新",
  updateFailed: "更新失敗",
  errorTitle: "發生問題",
  errorMessage: "發生未預期的錯誤。",
  tryAgain: "重試",
  copied: "已複製！",
};

function rewrite(locale, map) {
  const file = path.join(root, locale, "common.ts");
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)([a-zA-Z]+):\s*"([\s\S]*)$/);
    if (m && Object.prototype.hasOwnProperty.call(map, m[2])) {
      out.push(`${m[1]}${m[2]}: "${map[m[2]]}",`);
    } else {
      out.push(line);
    }
  }
  fs.writeFileSync(file, out.join("\n"), "utf-8");
  console.log(`${locale}: replaced mojibake values`);
}

rewrite("zh-CN", zhCN);
rewrite("zh-TW", zhTW);
console.log("done");
