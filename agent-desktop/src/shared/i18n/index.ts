import i18next, { type i18n as I18nInstance, type Resource } from "i18next";
import {
  APP_LOCALES,
  DEFAULT_ACTIVE_LOCALE,
  FALLBACK_LOCALE,
  SOURCE_LOCALE,
} from "./config";
import type { AppLocale } from "./types";
import commonEn from "./locales/en/common";
import navigationEn from "./locales/en/navigation";
import welcomeEn from "./locales/en/welcome";
import setupEn from "./locales/en/setup";
import chatEn from "./locales/en/chat";
import settingsEn from "./locales/en/settings";
import toolsEn from "./locales/en/tools";
import sessionsEn from "./locales/en/sessions";
import modelsEn from "./locales/en/models";
import providersEn from "./locales/en/providers";
import errorsEn from "./locales/en/errors";
import schedulesEn from "./locales/en/schedules";
import skillsEn from "./locales/en/skills";
import gatewayEn from "./locales/en/gateway";
import agentsEn from "./locales/en/agents";
import soulEn from "./locales/en/soul";
import memoryEn from "./locales/en/memory";
import installEn from "./locales/en/install";
import constantsEn from "./locales/en/constants";
import kanbanEn from "./locales/en/kanban";
import everosen from "./locales/en/everos";
import workspaceEn from "./locales/en/workspace";
import commonEs from "./locales/es/common";
import navigationEs from "./locales/es/navigation";
import welcomeEs from "./locales/es/welcome";
import setupEs from "./locales/es/setup";
import chatEs from "./locales/es/chat";
import settingsEs from "./locales/es/settings";
import toolsEs from "./locales/es/tools";
import sessionsEs from "./locales/es/sessions";
import modelsEs from "./locales/es/models";
import providersEs from "./locales/es/providers";
import errorsEs from "./locales/es/errors";
import schedulesEs from "./locales/es/schedules";
import skillsEs from "./locales/es/skills";
import gatewayEs from "./locales/es/gateway";
import agentsEs from "./locales/es/agents";
import soulEs from "./locales/es/soul";
import memoryEs from "./locales/es/memory";
import installEs from "./locales/es/install";
import constantsEs from "./locales/es/constants";
import everoses from "./locales/es/everos";
import commonId from "./locales/id/common";
import navigationId from "./locales/id/navigation";
import welcomeId from "./locales/id/welcome";
import setupId from "./locales/id/setup";
import chatId from "./locales/id/chat";
import settingsId from "./locales/id/settings";
import toolsId from "./locales/id/tools";
import sessionsId from "./locales/id/sessions";
import modelsId from "./locales/id/models";
import providersId from "./locales/id/providers";
import errorsId from "./locales/id/errors";
import schedulesId from "./locales/id/schedules";
import skillsId from "./locales/id/skills";
import gatewayId from "./locales/id/gateway";
import agentsId from "./locales/id/agents";
import soulId from "./locales/id/soul";
import memoryId from "./locales/id/memory";
import installId from "./locales/id/install";
import constantsId from "./locales/id/constants";
import everosid from "./locales/id/everos";
import commonZh from "./locales/zh-CN/common";
import navigationZh from "./locales/zh-CN/navigation";
import welcomeZh from "./locales/zh-CN/welcome";
import setupZh from "./locales/zh-CN/setup";
import chatZh from "./locales/zh-CN/chat";
import settingsZh from "./locales/zh-CN/settings";
import toolsZh from "./locales/zh-CN/tools";
import sessionsZh from "./locales/zh-CN/sessions";
import modelsZh from "./locales/zh-CN/models";
import providersZh from "./locales/zh-CN/providers";
import errorsZh from "./locales/zh-CN/errors";
import schedulesZh from "./locales/zh-CN/schedules";
import skillsZh from "./locales/zh-CN/skills";
import gatewayZh from "./locales/zh-CN/gateway";
import agentsZh from "./locales/zh-CN/agents";
import soulZh from "./locales/zh-CN/soul";
import memoryZh from "./locales/zh-CN/memory";
import installZh from "./locales/zh-CN/install";
import constantsZh from "./locales/zh-CN/constants";
import kanbanZh from "./locales/zh-CN/kanban";
import everoszhCN from "./locales/zh-CN/everos";
import commonZhTw from "./locales/zh-TW/common";
import navigationZhTw from "./locales/zh-TW/navigation";
import welcomeZhTw from "./locales/zh-TW/welcome";
import setupZhTw from "./locales/zh-TW/setup";
import chatZhTw from "./locales/zh-TW/chat";
import settingsZhTw from "./locales/zh-TW/settings";
import toolsZhTw from "./locales/zh-TW/tools";
import sessionsZhTw from "./locales/zh-TW/sessions";
import modelsZhTw from "./locales/zh-TW/models";
import providersZhTw from "./locales/zh-TW/providers";
import errorsZhTw from "./locales/zh-TW/errors";
import schedulesZhTw from "./locales/zh-TW/schedules";
import skillsZhTw from "./locales/zh-TW/skills";
import gatewayZhTw from "./locales/zh-TW/gateway";
import agentsZhTw from "./locales/zh-TW/agents";
import soulZhTw from "./locales/zh-TW/soul";
import memoryZhTw from "./locales/zh-TW/memory";
import installZhTw from "./locales/zh-TW/install";
import constantsZhTw from "./locales/zh-TW/constants";
import kanbanZhTw from "./locales/zh-TW/kanban";
import everoszhTW from "./locales/zh-TW/everos";
import commonJa from "./locales/ja/common";
import navigationJa from "./locales/ja/navigation";
import welcomeJa from "./locales/ja/welcome";
import setupJa from "./locales/ja/setup";
import chatJa from "./locales/ja/chat";
import settingsJa from "./locales/ja/settings";
import toolsJa from "./locales/ja/tools";
import sessionsJa from "./locales/ja/sessions";
import modelsJa from "./locales/ja/models";
import providersJa from "./locales/ja/providers";
import errorsJa from "./locales/ja/errors";
import schedulesJa from "./locales/ja/schedules";
import skillsJa from "./locales/ja/skills";
import gatewayJa from "./locales/ja/gateway";
import agentsJa from "./locales/ja/agents";
import soulJa from "./locales/ja/soul";
import memoryJa from "./locales/ja/memory";
import installJa from "./locales/ja/install";
import constantsJa from "./locales/ja/constants";
import everosja from "./locales/ja/everos";
import commonPt from "./locales/pt-BR/common";
import navigationPt from "./locales/pt-BR/navigation";
import welcomePt from "./locales/pt-BR/welcome";
import setupPt from "./locales/pt-BR/setup";
import chatPt from "./locales/pt-BR/chat";
import settingsPt from "./locales/pt-BR/settings";
import toolsPt from "./locales/pt-BR/tools";
import sessionsPt from "./locales/pt-BR/sessions";
import modelsPt from "./locales/pt-BR/models";
import providersPt from "./locales/pt-BR/providers";
import errorsPt from "./locales/pt-BR/errors";
import schedulesPt from "./locales/pt-BR/schedules";
import skillsPt from "./locales/pt-BR/skills";
import gatewayPt from "./locales/pt-BR/gateway";
import agentsPt from "./locales/pt-BR/agents";
import soulPt from "./locales/pt-BR/soul";
import memoryPt from "./locales/pt-BR/memory";
import installPt from "./locales/pt-BR/install";
import constantsPt from "./locales/pt-BR/constants";
import everosptBR from "./locales/pt-BR/everos";
import commonPtPt from "./locales/pt-PT/common";
import navigationPtPt from "./locales/pt-PT/navigation";
import welcomePtPt from "./locales/pt-PT/welcome";
import setupPtPt from "./locales/pt-PT/setup";
import chatPtPt from "./locales/pt-PT/chat";
import settingsPtPt from "./locales/pt-PT/settings";
import toolsPtPt from "./locales/pt-PT/tools";
import sessionsPtPt from "./locales/pt-PT/sessions";
import modelsPtPt from "./locales/pt-PT/models";
import providersPtPt from "./locales/pt-PT/providers";
import errorsPtPt from "./locales/pt-PT/errors";
import schedulesPtPt from "./locales/pt-PT/schedules";
import skillsPtPt from "./locales/pt-PT/skills";
import gatewayPtPt from "./locales/pt-PT/gateway";
import agentsPtPt from "./locales/pt-PT/agents";
import soulPtPt from "./locales/pt-PT/soul";
import memoryPtPt from "./locales/pt-PT/memory";
import installPtPt from "./locales/pt-PT/install";
import constantsPtPt from "./locales/pt-PT/constants";
import kanbanPtPt from "./locales/pt-PT/kanban";
import everosptPT from "./locales/pt-PT/everos";
import plansEn from "./locales/en/plans";
import plansEs from "./locales/es/plans";
import plansId from "./locales/id/plans";
import plansJa from "./locales/ja/plans";
import plansPtBr from "./locales/pt-BR/plans";
import plansPtPt from "./locales/pt-PT/plans";
import plansZhCn from "./locales/zh-CN/plans";
import plansZhTw from "./locales/zh-TW/plans";
import mcpEn from "./locales/en/mcp";
import mcpEs from "./locales/es/mcp";
import mcpId from "./locales/id/mcp";
import mcpJa from "./locales/ja/mcp";
import mcpPtBr from "./locales/pt-BR/mcp";
import mcpPtPt from "./locales/pt-PT/mcp";
import mcpZhCn from "./locales/zh-CN/mcp";
import mcpZhTw from "./locales/zh-TW/mcp";
import headroomEn from "./locales/en/headroom";
import headroomEs from "./locales/es/headroom";
import headroomId from "./locales/id/headroom";
import headroomJa from "./locales/ja/headroom";
import headroomPtBr from "./locales/pt-BR/headroom";
import headroomPtPt from "./locales/pt-PT/headroom";
import headroomZhCn from "./locales/zh-CN/headroom";
import headroomZhTw from "./locales/zh-TW/headroom";
import sandboxTasksEn from "./locales/en/sandboxTasks";
import sandboxTasksEs from "./locales/es/sandboxTasks";
import sandboxTasksId from "./locales/id/sandboxTasks";
import sandboxTasksJa from "./locales/ja/sandboxTasks";
import sandboxTasksPtBr from "./locales/pt-BR/sandboxTasks";
import sandboxTasksPtPt from "./locales/pt-PT/sandboxTasks";
import sandboxTasksZhCn from "./locales/zh-CN/sandboxTasks";
import sandboxTasksZhTw from "./locales/zh-TW/sandboxTasks";

export const resources = {
  en: {
    translation: {
      common: commonEn,
      navigation: navigationEn,
      welcome: welcomeEn,
      setup: setupEn,
      chat: chatEn,
      settings: settingsEn,
      tools: toolsEn,
      sessions: sessionsEn,
      models: modelsEn,
      providers: providersEn,
      errors: errorsEn,
      schedules: schedulesEn,
      skills: skillsEn,
      gateway: gatewayEn,
      agents: agentsEn,
      headroom: headroomEn,
      sandboxTasks: sandboxTasksEn,
      soul: soulEn,
      memory: memoryEn,
      install: installEn,
      constants: constantsEn,
      kanban: kanbanEn,
      everos: everosen,
      workspace: workspaceEn,
      plans: plansEn,
      mcp: mcpEn,
    },
  },
  es: {
    translation: {
      common: commonEs,
      navigation: navigationEs,
      welcome: welcomeEs,
      setup: setupEs,
      chat: chatEs,
      settings: settingsEs,
      tools: toolsEs,
      sessions: sessionsEs,
      models: modelsEs,
      providers: providersEs,
      errors: errorsEs,
      schedules: schedulesEs,
      skills: skillsEs,
      headroom: headroomEs,
      sandboxTasks: sandboxTasksEs,
      gateway: gatewayEs,
      agents: agentsEs,
      soul: soulEs,
      memory: memoryEs,
      install: installEs,
      constants: constantsEs,
      everos: everoses,
      plans: plansEs,
      mcp: mcpEs,
    },
  },
  id: {
    translation: {
      common: commonId,
      navigation: navigationId,
      welcome: welcomeId,
      setup: setupId,
      chat: chatId,
      settings: settingsId,
      tools: toolsId,
      sessions: sessionsId,
      models: modelsId,
      providers: providersId,
      errors: errorsId,
      schedules: schedulesId,
      skills: skillsId,
      gateway: gatewayId,
      agents: agentsId,
      soul: soulId,
      memory: memoryId,
      install: installId,
      constants: constantsId,
      everos: everosid,
      headroom: headroomId,
      sandboxTasks: sandboxTasksId,
      plans: plansId,
      mcp: mcpId,
    },
  },
  "zh-CN": {
    translation: {
      common: commonZh,
      navigation: navigationZh,
      welcome: welcomeZh,
      setup: setupZh,
      chat: chatZh,
      settings: settingsZh,
      tools: toolsZh,
      sessions: sessionsZh,
      models: modelsZh,
      providers: providersZh,
      errors: errorsZh,
      schedules: schedulesZh,
      skills: skillsZh,
      gateway: gatewayZh,
      agents: agentsZh,
      soul: soulZh,
      memory: memoryZh,
      install: installZh,
      constants: constantsZh,
      kanban: kanbanZh,
      everos: everoszhCN,
      headroom: headroomZhCn,
      sandboxTasks: sandboxTasksZhCn,
      plans: plansZhCn,
      mcp: mcpZhCn,
    },
  },
  "zh-TW": {
    translation: {
      common: commonZhTw,
      navigation: navigationZhTw,
      welcome: welcomeZhTw,
      setup: setupZhTw,
      chat: chatZhTw,
      settings: settingsZhTw,
      tools: toolsZhTw,
      sessions: sessionsZhTw,
      models: modelsZhTw,
      providers: providersZhTw,
      errors: errorsZhTw,
      schedules: schedulesZhTw,
      skills: skillsZhTw,
      gateway: gatewayZhTw,
      agents: agentsZhTw,
      soul: soulZhTw,
      memory: memoryZhTw,
      install: installZhTw,
      constants: constantsZhTw,
      kanban: kanbanZhTw,
      everos: everoszhTW,
      plans: plansZhTw,
      mcp: mcpZhTw,
      headroom: headroomZhTw,
      sandboxTasks: sandboxTasksZhTw,
    },
  },
  "pt-BR": {
    translation: {
      common: commonPt,
      navigation: navigationPt,
      welcome: welcomePt,
      setup: setupPt,
      chat: chatPt,
      settings: settingsPt,
      tools: toolsPt,
      sessions: sessionsPt,
      models: modelsPt,
      providers: providersPt,
      errors: errorsPt,
      schedules: schedulesPt,
      skills: skillsPt,
      gateway: gatewayPt,
      agents: agentsPt,
      soul: soulPt,
      memory: memoryPt,
      install: installPt,
      constants: constantsPt,
      everos: everosptBR,
      plans: plansPtBr,
      mcp: mcpPtBr,
      headroom: headroomPtBr,
      sandboxTasks: sandboxTasksPtBr,
    },
  },
  "pt-PT": {
    translation: {
      common: commonPtPt,
      navigation: navigationPtPt,
      welcome: welcomePtPt,
      setup: setupPtPt,
      chat: chatPtPt,
      settings: settingsPtPt,
      tools: toolsPtPt,
      sessions: sessionsPtPt,
      models: modelsPtPt,
      providers: providersPtPt,
      errors: errorsPtPt,
      schedules: schedulesPtPt,
      skills: skillsPtPt,
      gateway: gatewayPtPt,
      agents: agentsPtPt,
      soul: soulPtPt,
      memory: memoryPtPt,
      install: installPtPt,
      constants: constantsPtPt,
      kanban: kanbanPtPt,
      everos: everosptPT,
      headroom: headroomPtPt,
      sandboxTasks: sandboxTasksPtPt,
      plans: plansPtPt,
      mcp: mcpPtPt,
    },
  },
  ja: {
    translation: {
      common: commonJa,
      navigation: navigationJa,
      welcome: welcomeJa,
      setup: setupJa,
      chat: chatJa,
      settings: settingsJa,
      tools: toolsJa,
      sessions: sessionsJa,
      models: modelsJa,
      providers: providersJa,
      errors: errorsJa,
      schedules: schedulesJa,
      skills: skillsJa,
      gateway: gatewayJa,
      agents: agentsJa,
      soul: soulJa,
      memory: memoryJa,
      install: installJa,
      constants: constantsJa,
      everos: everosja,
      plans: plansJa,
      mcp: mcpJa,
      headroom: headroomJa,
      sandboxTasks: sandboxTasksJa,
    },
  },
} satisfies Resource;

function readKey(node: unknown, path: string): string | undefined {
  const result = path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, node);

  return typeof result === "string" ? result : undefined;
}

let locale: AppLocale = DEFAULT_ACTIVE_LOCALE;

/**
 * The shared i18next instance is created lazily so that test environments
 * (notably vitest 4 in jsdom) can import this module without triggering
 * i18next's Proxy-based `init` race that leaves `.config` undefined.
 *
 * Consumers (e.g. `I18nProvider`, `<I18nextProvider>`, `setLocale`)
 * access this object synchronously, so we wrap the real instance in a
 * Proxy that defers construction until the first property read or call.
 */
let cachedI18n: I18nInstance | undefined;

// react-i18next 15 reads `i18n.reportNamespaces.addUsedNamespaces?.()` in
// useTranslation. i18next 25 does not set `reportNamespaces` on the
// instance, so we return a no-op shim when the underlying instance
// doesn't expose one. This keeps useTranslation from throwing and is
// safe in production because nothing in this codebase subscribes to
// used-namespace reports.
const noopAddUsedNamespaces = (): void => {};
const noopReportNamespaces = { addUsedNamespaces: noopAddUsedNamespaces };

function getSharedI18n(): I18nInstance {
  if (cachedI18n) return cachedI18n;

  const instance = i18next.createInstance();
  // `initImmediate: false` plus preloaded `resources` makes the synchronous
  // init() resolve before the next microtask. We still keep it lazy so that
  // importing this module never blocks on i18next's internal state machine
  // (which is what bit us in vitest 4 + jsdom).
  void instance.init({
    lng: locale,
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: APP_LOCALES,
    defaultNS: "translation",
    ns: ["translation"],
    interpolation: {
      escapeValue: false,
    },
    resources,
    initImmediate: false,
  });

  cachedI18n = instance;
  return instance;
}

export const sharedI18n: I18nInstance = new Proxy(
  {} as I18nInstance,
  {
    get(_target, prop, receiver) {
      const instance = getSharedI18n();
      const value = Reflect.get(instance, prop, receiver);
      if (prop === "reportNamespaces" && value === undefined) {
        return noopReportNamespaces;
      }
      return typeof value === "function" ? value.bind(instance) : value;
    },
    has(_target, prop) {
      return Reflect.has(getSharedI18n(), prop);
    },
    ownKeys(_target) {
      return Reflect.ownKeys(getSharedI18n());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(getSharedI18n(), prop);
    },
  },
);

export function getLocale(): AppLocale {
  return locale;
}

export function setLocale(nextLocale: AppLocale): AppLocale {
  locale = nextLocale;
  void getSharedI18n().changeLanguage(nextLocale);
  return locale;
}

export function t(
  key: string,
  lang: AppLocale = locale,
  options?: Record<string, unknown>,
): string {
  const translated = readKey(resources[lang]?.translation, key);
  const fallback = readKey(resources[FALLBACK_LOCALE].translation, key);
  const base = translated ?? fallback ?? key;

  if (!options) return base;

  return Object.entries(options).reduce((message, [name, value]) => {
    return message.replaceAll(`{{${name}}}`, String(value));
  }, base);
}

export { APP_LOCALES, DEFAULT_ACTIVE_LOCALE, FALLBACK_LOCALE, SOURCE_LOCALE };
export type { AppLocale };
