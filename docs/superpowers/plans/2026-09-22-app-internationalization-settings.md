# OpenMTP 国际化底座与设置窗口中文化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可扩展到全 App 的国际化底座，并让设置窗口支持英文与简体中文即时切换和跨启动恢复。

**Architecture:** Renderer 使用单例 i18next 实例和按功能划分的 `settings` 命名空间。启动入口在 React render 前读取并归一化 `appLanguage`，通过纯 action `copyJsonFileToSettings` 注入 Redux，再初始化 i18next；运行时由顶层 App 监听 Redux 语言变化并同步 i18next。设置窗口通过 `withTranslation('settings')` 消费翻译资源，用户主动切换语言时继续复用现有 `setCommonSettings` 持久化链路。

**Tech Stack:** Electron 18、React 17、Redux 4、react-redux 5、Material UI 4、i18next 23.16.8、react-i18next 13.5.0、Yarn 1、Babel、Node `assert`。

## Global Constraints

- `i18next` 精确锁定为 `23.16.8`，`react-i18next` 精确锁定为 `13.5.0`，不得使用范围版本。
- 默认语言和回退语言均为 `en`；首期只允许 `en`、`zh-CN`。
- 本期只翻译 Settings Dialog，不翻译主界面、其他弹窗、Electron 菜单、通知或错误消息。
- `OpenMTP`、`MTP`、`Kalam`、`Legacy` 保持原文。
- bootstrap 只能 dispatch `copyJsonFileToSettings({ appLanguage })`，禁止调用 `setCommonSettings`，禁止写设置文件和上报 analytics。
- 用户主动切换语言时复用 `setCommonSettings`；启用匿名统计时接受现有 `TOOLBAR_SETTINGS_CHANGE` 行为。
- 语言归一化只发生在启动 bootstrap 和 i18n 初始化/切换边界，不修改通用 reducer 的 spread 语义。
- 英文与简体中文资源必须拥有完全相同的键集合。
- 所有面向用户的设计、计划和验证说明使用中文。

---

## 文件结构

### 新建文件

- `app/i18n/language.js`：语言常量、允许列表和归一化函数。
- `app/i18n/index.js`：i18next 实例创建、初始化和运行时切换。
- `app/i18n/bootstrap.js`：无存储副作用的启动语言编排函数。
- `app/i18n/locales/en/settings.json`：设置窗口英文资源。
- `app/i18n/locales/zh-CN/settings.json`：设置窗口简体中文资源。
- `internals/scripts/test-i18n.js`：Node `assert` 国际化专项测试、键集合检查和启动恢复回归测试。

### 修改文件

- `package.json`：固定依赖版本并增加 `test:i18n`。
- `yarn.lock`：记录精确依赖解析结果。
- `app/index.js`：在 React render 前执行语言 bootstrap。
- `app/containers/App/index.jsx`：监听 Redux 中的语言变化并同步 i18next。
- `app/containers/Settings/reducers.js`：在 `initialState` 注册 `appLanguage`。
- `app/containers/Settings/selectors.js`：增加 `makeAppLanguage`。
- `app/containers/Settings/index.jsx`：处理用户语言选择并交给 `setCommonSettings`。
- `app/containers/Settings/components/SettingsDialog.jsx`：增加语言下拉框并迁移全部可见文案。
- `app/containers/Settings/styles/index.js`：增加语言下拉框布局样式。

---

### Task 1: 固定依赖并建立国际化核心

**Files:**
- Modify: `package.json`
- Modify: `yarn.lock`
- Create: `app/i18n/language.js`
- Create: `app/i18n/index.js`
- Create: `app/i18n/locales/en/settings.json`
- Create: `app/i18n/locales/zh-CN/settings.json`
- Create: `internals/scripts/test-i18n.js`

**Interfaces:**
- Produces: `APP_LANGUAGE`、`SUPPORTED_APP_LANGUAGES`、`DEFAULT_APP_LANGUAGE`、`normalizeAppLanguage(value)`。
- Produces: `createI18n({ language, resources })`、`initializeI18n(language)`、`changeAppLanguage(language)` 和默认 i18next 单例。
- Produces: `yarn test:i18n`，后续任务继续向同一脚本增加测试。

- [ ] **Step 1: 精确安装依赖并检查版本约束**

Run:

```bash
yarn add --exact --ignore-scripts i18next@23.16.8 react-i18next@13.5.0
yarn list --pattern '^(i18next|react-i18next)$'
```

Expected: `package.json` 中两个版本均无 `^` 或 `~`；Yarn 列出 `i18next@23.16.8`、`react-i18next@13.5.0`，且没有 React/i18next peer dependency 冲突。

- [ ] **Step 2: 增加测试命令并编写第一组失败测试**

在 `package.json` 的 `scripts` 中增加：

```json
"test:i18n": "cross-env NODE_ENV=test node -r @babel/register ./internals/scripts/test-i18n.js"
```

创建 `internals/scripts/test-i18n.js`：

```js
const assert = require('assert');

const {
  APP_LANGUAGE,
  DEFAULT_APP_LANGUAGE,
  normalizeAppLanguage,
} = require('../../app/i18n/language');
const {
  APP_TRANSLATION_RESOURCES,
  createI18n,
} = require('../../app/i18n');
const enSettings = require('../../app/i18n/locales/en/settings.json');
const zhCnSettings = require('../../app/i18n/locales/zh-CN/settings.json');

const tests = [];

const test = (name, callback) => {
  tests.push({ name, callback });
};

const flattenKeys = (value, prefix = '') => {
  return Object.keys(value).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const item = value[key];

    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return flattenKeys(item, path);
    }

    return [path];
  });
};

test('默认语言和非法语言都归一化为英文', () => {
  assert.strictEqual(DEFAULT_APP_LANGUAGE, APP_LANGUAGE.english);
  assert.strictEqual(normalizeAppLanguage(undefined), APP_LANGUAGE.english);
  assert.strictEqual(normalizeAppLanguage('fr'), APP_LANGUAGE.english);
});

test('受支持语言保持原值', () => {
  assert.strictEqual(normalizeAppLanguage('en'), APP_LANGUAGE.english);
  assert.strictEqual(
    normalizeAppLanguage('zh-CN'),
    APP_LANGUAGE.simplifiedChinese
  );
});

test('英文和简体中文设置资源键集合一致', () => {
  assert.deepStrictEqual(
    flattenKeys(zhCnSettings).sort(),
    flattenKeys(enSettings).sort()
  );
});

test('设置标题可在英文和简体中文之间切换', async () => {
  const instance = createI18n({
    language: APP_LANGUAGE.english,
    resources: APP_TRANSLATION_RESOURCES,
  });

  assert.strictEqual(instance.t('settings:title'), 'Settings');
  await instance.changeLanguage(APP_LANGUAGE.simplifiedChinese);
  assert.strictEqual(instance.t('settings:title'), '设置');
});

test('简体中文缺少键时回退英文', () => {
  const instance = createI18n({
    language: APP_LANGUAGE.simplifiedChinese,
    resources: {
      en: {
        settings: {
          fallbackOnly: 'English fallback',
        },
      },
      'zh-CN': {
        settings: {},
      },
    },
  });

  assert.strictEqual(
    instance.t('settings:fallbackOnly'),
    'English fallback'
  );
});

const run = async () => {
  for (const { name, callback } of tests) {
    await callback();
    console.info(`PASS ${name}`);
  }

  console.info(`PASS ${tests.length} i18n tests`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 3: 运行测试并确认因国际化模块缺失而失败**

Run: `yarn test:i18n`

Expected: FAIL，错误包含 `Cannot find module '../../app/i18n/language'` 或等价的模块缺失信息；不能是依赖安装失败或 Babel 配置错误。

- [ ] **Step 4: 实现语言常量和归一化函数**

创建 `app/i18n/language.js`：

```js
export const APP_LANGUAGE = Object.freeze({
  english: 'en',
  simplifiedChinese: 'zh-CN',
});

export const SUPPORTED_APP_LANGUAGES = Object.freeze([
  APP_LANGUAGE.english,
  APP_LANGUAGE.simplifiedChinese,
]);

export const DEFAULT_APP_LANGUAGE = APP_LANGUAGE.english;

export const normalizeAppLanguage = (language) => {
  return SUPPORTED_APP_LANGUAGES.includes(language)
    ? language
    : DEFAULT_APP_LANGUAGE;
};
```

- [ ] **Step 5: 创建完整英文资源**

创建 `app/i18n/locales/en/settings.json`：

```json
{
  "title": "Settings",
  "tabs": {
    "general": "General",
    "fileManager": "File Manager",
    "updates": "Updates",
    "privacy": "Privacy"
  },
  "common": {
    "enabled": "Enabled",
    "disabled": "Disabled",
    "close": "Close",
    "devices": {
      "computer": "Computer",
      "phone": "Phone"
    }
  },
  "general": {
    "language": {
      "label": "Language",
      "options": {
        "english": "English",
        "simplifiedChinese": "简体中文"
      }
    },
    "theme": {
      "label": "Theme",
      "options": {
        "light": "Light",
        "dark": "Dark",
        "auto": "Auto"
      }
    },
    "mtpMode": "MTP Mode",
    "usbHotplug": "Enable auto device detection (USB Hotplug)"
  },
  "fileManager": {
    "showHiddenFiles": "Show hidden files",
    "viewAsGrid": "View as grid",
    "overallProgress": "Display overall progress on the file transfer screen",
    "transferTo": "To {{device}}",
    "onboarding": {
      "toggleHint": "Use the toggles to enable or disable an item.",
      "scrollHint": "Scroll down for more Settings."
    },
    "overallProgressNote": "Note: To fetch the total transfer information, the files need to be processed first. It may take a few seconds to a few minutes depending on the total number of files to be copied.",
    "showDirectoriesFirst": "Show directories first",
    "showStatusBar": "Show status bar",
    "showLocalPane": "Show Local Disk pane",
    "localPaneDragNote": "Note: You can drag files from the Finder into the Mobile pane but not the other way around.",
    "showLocalPaneOnLeft": "Show Local Disk pane on the left side"
  },
  "updates": {
    "autoCheck": "Automatically check for updates",
    "autoDownload": "Automatically download the new updates when available (recommended)",
    "betaChannel": "Enable beta update channel",
    "betaWarning": "Early access preview of the upcoming features but might result in crashes."
  },
  "privacy": {
    "analytics": "Enable anonymous usage statistics gathering",
    "description": "We do not gather any kind of personal information and neither do we sell your data. We use this information only to improve the User Experience and squash some bugs.",
    "learnMore": "Learn more..."
  }
}
```

- [ ] **Step 6: 创建键集合完全一致的简体中文资源**

创建 `app/i18n/locales/zh-CN/settings.json`：

```json
{
  "title": "设置",
  "tabs": {
    "general": "常规",
    "fileManager": "文件管理",
    "updates": "更新",
    "privacy": "隐私"
  },
  "common": {
    "enabled": "已启用",
    "disabled": "已禁用",
    "close": "关闭",
    "devices": {
      "computer": "电脑",
      "phone": "手机"
    }
  },
  "general": {
    "language": {
      "label": "语言",
      "options": {
        "english": "English",
        "simplifiedChinese": "简体中文"
      }
    },
    "theme": {
      "label": "主题",
      "options": {
        "light": "浅色",
        "dark": "深色",
        "auto": "跟随系统"
      }
    },
    "mtpMode": "MTP 模式",
    "usbHotplug": "启用设备自动检测（USB 热插拔）"
  },
  "fileManager": {
    "showHiddenFiles": "显示隐藏文件",
    "viewAsGrid": "使用网格视图",
    "overallProgress": "在文件传输界面显示总进度",
    "transferTo": "传输到{{device}}",
    "onboarding": {
      "toggleHint": "使用开关启用或禁用选项。",
      "scrollHint": "向下滚动可查看更多设置。"
    },
    "overallProgressNote": "注意：要获取完整的传输信息，需要先处理文件。根据待复制文件总数，此过程可能需要几秒到几分钟。",
    "showDirectoriesFirst": "优先显示文件夹",
    "showStatusBar": "显示状态栏",
    "showLocalPane": "显示本地磁盘面板",
    "localPaneDragNote": "注意：你可以将文件从“访达”拖入手机面板，但不能反向拖动。",
    "showLocalPaneOnLeft": "在左侧显示本地磁盘面板"
  },
  "updates": {
    "autoCheck": "自动检查更新",
    "autoDownload": "有新版本时自动下载更新（推荐）",
    "betaChannel": "启用测试版更新通道",
    "betaWarning": "可提前体验即将发布的功能，但可能导致应用崩溃。"
  },
  "privacy": {
    "analytics": "启用匿名使用情况统计",
    "description": "我们不会收集任何个人信息，也不会出售你的数据。我们仅使用这些信息来改善用户体验并修复问题。",
    "learnMore": "了解更多..."
  }
}
```

- [ ] **Step 7: 实现同步初始化的 i18next 单例和测试实例工厂**

创建 `app/i18n/index.js`：

```js
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import enSettings from './locales/en/settings.json';
import zhCnSettings from './locales/zh-CN/settings.json';
import {
  APP_LANGUAGE,
  DEFAULT_APP_LANGUAGE,
  SUPPORTED_APP_LANGUAGES,
  normalizeAppLanguage,
} from './language';

export const APP_TRANSLATION_RESOURCES = Object.freeze({
  [APP_LANGUAGE.english]: {
    settings: enSettings,
  },
  [APP_LANGUAGE.simplifiedChinese]: {
    settings: zhCnSettings,
  },
});

const configureI18n = ({ instance, language, resources }) => {
  instance.use(initReactI18next).init({
    resources,
    lng: normalizeAppLanguage(language),
    fallbackLng: DEFAULT_APP_LANGUAGE,
    supportedLngs: SUPPORTED_APP_LANGUAGES,
    ns: ['settings'],
    defaultNS: 'settings',
    initImmediate: false,
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
};

export const createI18n = ({
  language = DEFAULT_APP_LANGUAGE,
  resources = APP_TRANSLATION_RESOURCES,
} = {}) => {
  return configureI18n({
    instance: createInstance(),
    language,
    resources,
  });
};

const i18n = createInstance();

export const initializeI18n = (language) => {
  const normalizedLanguage = normalizeAppLanguage(language);

  if (!i18n.isInitialized) {
    return configureI18n({
      instance: i18n,
      language: normalizedLanguage,
      resources: APP_TRANSLATION_RESOURCES,
    });
  }

  i18n.changeLanguage(normalizedLanguage);

  return i18n;
};

export const changeAppLanguage = (language) => {
  return initializeI18n(normalizeAppLanguage(language));
};

export default i18n;
```

- [ ] **Step 8: 运行专项测试并确认全部通过**

Run: `yarn test:i18n`

Expected: PASS 5 i18n tests，退出码为 0。

- [ ] **Step 9: 提交国际化核心**

```bash
git add package.json yarn.lock app/i18n internals/scripts/test-i18n.js
git commit -m "feat: add i18n translation foundation"
```

---

### Task 2: 接入 Redux、启动恢复和运行时同步

**Files:**
- Create: `app/i18n/bootstrap.js`
- Modify: `internals/scripts/test-i18n.js`
- Modify: `app/containers/Settings/reducers.js`
- Modify: `app/containers/Settings/selectors.js`
- Modify: `app/index.js`
- Modify: `app/containers/App/index.jsx`

**Interfaces:**
- Consumes: `normalizeAppLanguage(value)`、`initializeI18n(language)`、`changeAppLanguage(language)`。
- Produces: `bootstrapAppLanguage({ storedLanguage, hydrateLanguage, initializeLanguage })`，按 hydrate → initialize 顺序同步执行并返回归一化语言。
- Produces: `initialState.appLanguage` 和 `makeAppLanguage(state)`。
- Consumes existing: `copyJsonFileToSettings({ appLanguage })`，只能作为纯 Redux hydration action 使用。

- [ ] **Step 1: 为 Redux hydration、bootstrap 顺序和第二次启动回归添加失败测试**

在 `internals/scripts/test-i18n.js` 顶部 import 区增加：

```js
const settingsReducerModule = require('../../app/containers/Settings/reducers');
const {
  actionTypes,
  copyJsonFileToSettings,
} = require('../../app/containers/Settings/actions');
const {
  bootstrapAppLanguage,
} = require('../../app/i18n/bootstrap');
```

在 `run` 定义之前增加：

```js
test('appLanguage 注册为英文默认设置并可通过纯 action 恢复', () => {
  const { default: settingsReducer, initialState } = settingsReducerModule;
  const hydrationAction = copyJsonFileToSettings({
    appLanguage: APP_LANGUAGE.simplifiedChinese,
  });

  assert.strictEqual(initialState.appLanguage, APP_LANGUAGE.english);
  assert.strictEqual(typeof hydrationAction, 'object');
  assert.strictEqual(
    hydrationAction.type,
    actionTypes.COPY_JSON_FILE_TO_SETTINGS
  );
  assert.deepStrictEqual(hydrationAction.payload, {
    appLanguage: APP_LANGUAGE.simplifiedChinese,
  });

  const hydratedState = settingsReducer(undefined, hydrationAction);
  const secondBootState = settingsReducer(hydratedState, {
    type: actionTypes.FRESH_INSTALL,
    payload: 0,
  });

  assert.strictEqual(
    secondBootState.appLanguage,
    APP_LANGUAGE.simplifiedChinese
  );
});

test('bootstrap 先注入归一化语言再初始化 i18next', () => {
  const calls = [];
  const appLanguage = bootstrapAppLanguage({
    storedLanguage: APP_LANGUAGE.simplifiedChinese,
    hydrateLanguage: (language) => calls.push(`hydrate:${language}`),
    initializeLanguage: (language) => calls.push(`initialize:${language}`),
  });

  assert.strictEqual(appLanguage, APP_LANGUAGE.simplifiedChinese);
  assert.deepStrictEqual(calls, [
    'hydrate:zh-CN',
    'initialize:zh-CN',
  ]);
});

test('bootstrap 对非法持久化语言使用英文且不执行额外副作用', () => {
  const hydratedLanguages = [];
  const initializedLanguages = [];

  const appLanguage = bootstrapAppLanguage({
    storedLanguage: 'invalid-language',
    hydrateLanguage: (language) => hydratedLanguages.push(language),
    initializeLanguage: (language) => initializedLanguages.push(language),
  });

  assert.strictEqual(appLanguage, APP_LANGUAGE.english);
  assert.deepStrictEqual(hydratedLanguages, [APP_LANGUAGE.english]);
  assert.deepStrictEqual(initializedLanguages, [APP_LANGUAGE.english]);
});
```

- [ ] **Step 2: 运行测试并确认缺少 bootstrap 或默认状态而失败**

Run: `yarn test:i18n`

Expected: FAIL，原因是 `app/i18n/bootstrap.js` 不存在，或 `initialState.appLanguage` 尚不存在。

- [ ] **Step 3: 实现无副作用 bootstrap 编排函数**

创建 `app/i18n/bootstrap.js`：

```js
import { normalizeAppLanguage } from './language';

export const bootstrapAppLanguage = ({
  storedLanguage,
  hydrateLanguage,
  initializeLanguage,
}) => {
  const appLanguage = normalizeAppLanguage(storedLanguage);

  hydrateLanguage(appLanguage);
  initializeLanguage(appLanguage);

  return appLanguage;
};
```

- [ ] **Step 4: 在 Settings 默认状态和 selector 中注册语言**

在 `app/containers/Settings/reducers.js` import 区增加：

```js
import { DEFAULT_APP_LANGUAGE } from '../../i18n/language';
```

在 `initialState` 中增加：

```js
appLanguage: DEFAULT_APP_LANGUAGE,
```

在 `app/containers/Settings/selectors.js` 的主题 selector 之前增加：

```js
export const makeAppLanguage = createSelector(make, (state) =>
  state ? state.appLanguage : initialState.appLanguage
);
```

- [ ] **Step 5: 在 React render 前明确使用纯 hydration action**

在 `app/index.js` 增加 imports：

```js
import { settingsStorage } from './helpers/storageHelper';
import { copyJsonFileToSettings } from './containers/Settings/actions';
import { initializeI18n } from './i18n';
import { bootstrapAppLanguage } from './i18n/bootstrap';
```

在 `const MOUNT_POINT` 与 `render` 之间增加：

```js
const storedSettings = settingsStorage.getItems(['appLanguage']) || {};

bootstrapAppLanguage({
  storedLanguage: storedSettings.appLanguage,
  hydrateLanguage: (appLanguage) => {
    store.dispatch(copyJsonFileToSettings({ appLanguage }));
  },
  initializeLanguage: initializeI18n,
});
```

这里不得替换成 `setCommonSettings`，不得调用 `settingsStorage.setAll()` 或 `settingsStorage.setItems()`。

- [ ] **Step 6: 让顶层 App 在 Redux 语言变化时同步 i18next**

在 `app/containers/App/index.jsx` 增加 import：

```js
import { changeAppLanguage } from '../../i18n';
```

将 Settings selector import 补充为：

```js
import {
  makeAppLanguage,
  makeAppThemeMode,
  makeAppThemeModeSettings,
  makeMtpMode,
} from '../Settings/selectors';
```

在 `componentDidMount` 后增加：

```js
componentDidUpdate(prevProps) {
  const { appLanguage } = this.props;

  if (prevProps.appLanguage !== appLanguage) {
    changeAppLanguage(appLanguage);
  }
}
```

在 `mapStateToProps` 返回值中增加：

```js
appLanguage: makeAppLanguage(state),
```

- [ ] **Step 7: 运行专项测试并确认启动恢复用例通过**

Run: `yarn test:i18n`

Expected: PASS 8 i18n tests；测试确认 hydration action 是普通对象、第二次启动状态保留 `zh-CN`、bootstrap 只调用传入的 hydrate 和 initialize 回调。

- [ ] **Step 8: 对启动链路运行定向 Lint**

Run:

```bash
yarn eslint app/index.js app/i18n app/containers/App/index.jsx app/containers/Settings/reducers.js app/containers/Settings/selectors.js internals/scripts/test-i18n.js --format=pretty
```

Expected: 0 errors。

- [ ] **Step 9: 提交启动恢复链路**

```bash
git add app/index.js app/i18n/bootstrap.js app/containers/App/index.jsx app/containers/Settings/reducers.js app/containers/Settings/selectors.js internals/scripts/test-i18n.js
git commit -m "feat: restore and synchronize app language"
```

---

### Task 3: 在设置常规页增加语言控件并即时切换

**Files:**
- Modify: `internals/scripts/test-i18n.js`
- Modify: `app/containers/Settings/index.jsx`
- Modify: `app/containers/Settings/components/SettingsDialog.jsx`
- Modify: `app/containers/Settings/styles/index.js`

**Interfaces:**
- Consumes: `APP_LANGUAGE.english`、`APP_LANGUAGE.simplifiedChinese`。
- Consumes existing: `actionSetCommonSettings({ key: 'appLanguage', value })`。
- Produces: `SettingsDialog` prop `appLanguage` 和 callback `onAppLanguageChange(event)`。
- Produces: `withTranslation('settings')` 包装后的 Settings Dialog。

- [ ] **Step 1: 增加设置窗口国际化接线的失败测试**

在 `internals/scripts/test-i18n.js` 顶部增加：

```js
const { readFileSync } = require('fs');
const { resolve } = require('path');

const settingsDialogSource = readFileSync(
  resolve(
    __dirname,
    '../../app/containers/Settings/components/SettingsDialog.jsx'
  ),
  'utf8'
);
```

在 `run` 定义之前增加：

```js
test('设置窗口接入 react-i18next 和语言选择文案', () => {
  const requiredFragments = [
    "withTranslation('settings')",
    "t('title')",
    "t('tabs.general')",
    "t('tabs.fileManager')",
    "t('tabs.updates')",
    "t('tabs.privacy')",
    "t('general.language.label')",
    "t('general.language.options.english')",
    "t('general.language.options.simplifiedChinese')",
    "t('general.theme.label')",
    "t('general.theme.options.light')",
    "t('general.theme.options.dark')",
    "t('general.theme.options.auto')",
    "t('general.mtpMode')",
    "t('general.usbHotplug')",
  ];

  requiredFragments.forEach((fragment) => {
    assert.ok(
      settingsDialogSource.includes(fragment),
      `SettingsDialog missing ${fragment}`
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认设置组件尚未接入翻译而失败**

Run: `yarn test:i18n`

Expected: FAIL，首个缺失项为 `withTranslation('settings')` 或 `t('title')`。

- [ ] **Step 3: 在 Settings 容器中持久化用户主动选择的语言**

在 `app/containers/Settings/index.jsx` 的 `_handleSetAppThemeModeChange` 之前增加：

```js
_handleAppLanguageChange = (event) => {
  this._handleSetCommonSettingsChange({
    key: 'appLanguage',
    value: event.target.value,
  });
};
```

向 `SettingsDialog` props 增加：

```jsx
onAppLanguageChange={this._handleAppLanguageChange}
```

`makeCommonSettings(state)` 已将 `appLanguage` 包含在 `parentProps` 中，不增加重复 selector。

- [ ] **Step 4: 增加 Material UI 语言下拉框依赖和样式**

在 `SettingsDialog.jsx` 增加 imports：

```js
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { withTranslation } from 'react-i18next';
import { APP_LANGUAGE } from '../../../i18n/language';
```

在 `app/containers/Settings/styles/index.js` 增加：

```js
languageControl: {
  minWidth: 200,
  marginBottom: 20,
},
```

- [ ] **Step 5: 接入 `withTranslation` 并增加语言控件**

将组件声明改为命名导出：

```js
export class SettingsDialog extends PureComponent {
```

在 props 解构中增加：

```js
appLanguage,
onAppLanguageChange,
t,
```

在 General 页 `<FormGroup>` 的 Theme 之前插入：

```jsx
<FormControl className={styles.languageControl}>
  <InputLabel id="app-language-label">
    {t('general.language.label')}
  </InputLabel>
  <Select
    labelId="app-language-label"
    id="app-language"
    value={appLanguage}
    onChange={onAppLanguageChange}
  >
    <MenuItem value={APP_LANGUAGE.english}>
      {t('general.language.options.english')}
    </MenuItem>
    <MenuItem value={APP_LANGUAGE.simplifiedChinese}>
      {t('general.language.options.simplifiedChinese')}
    </MenuItem>
  </Select>
</FormControl>
```

在文件末尾增加默认导出：

```js
export default withTranslation('settings')(SettingsDialog);
```

- [ ] **Step 6: 迁移标题、页签和 General 页文案**

按以下精确映射替换现有 JSX 文案：

```text
Settings                                      -> {t('title')}
General                                       -> t('tabs.general')
File Manager                                  -> t('tabs.fileManager')
Updates                                       -> t('tabs.updates')
Privacy                                       -> t('tabs.privacy')
Theme                                         -> {t('general.theme.label')}
Light                                         -> t('general.theme.options.light')
Dark                                          -> t('general.theme.options.dark')
Auto                                          -> t('general.theme.options.auto')
MTP Mode                                      -> {t('general.mtpMode')}
Enable auto device detection (USB Hotplug)    -> {t('general.usbHotplug')}
enableUsbHotplug ? `Enabled` : `Disabled`     -> enableUsbHotplug ? t('common.enabled') : t('common.disabled')
```

Tab 和 `FormControlLabel` 的 `label` prop 使用 `t()` 返回值；Typography 的 children 使用 `{t()}`。

- [ ] **Step 7: 运行专项测试和定向 Lint**

Run:

```bash
yarn test:i18n
yarn eslint app/containers/Settings/index.jsx app/containers/Settings/components/SettingsDialog.jsx app/containers/Settings/styles/index.js internals/scripts/test-i18n.js --format=pretty
```

Expected: 专项测试 PASS 9 i18n tests；Lint 0 errors。

- [ ] **Step 8: 提交语言控件和 General 页迁移**

```bash
git add app/containers/Settings/index.jsx app/containers/Settings/components/SettingsDialog.jsx app/containers/Settings/styles/index.js internals/scripts/test-i18n.js
git commit -m "feat: add language selector to settings"
```

---

### Task 4: 完整翻译 File Manager、Updates 和 Privacy 页

**Files:**
- Modify: `internals/scripts/test-i18n.js`
- Modify: `app/containers/Settings/components/SettingsDialog.jsx`

**Interfaces:**
- Consumes: `t(key, options)`，其中设备方向文案使用 `transferTo` 的 `device` 插值。
- Removes dependency: Settings Dialog 不再使用全局英文 `DEVICES_LABEL`。
- Produces: Settings Dialog 中除明确保留的产品名和技术名外，不再存在用户可见英文硬编码。

- [ ] **Step 1: 增加剩余三个页签翻译覆盖的失败测试**

在 `internals/scripts/test-i18n.js` 的 Settings Dialog 测试之后增加：

```js
test('设置窗口其余页签使用完整翻译键', () => {
  const requiredFragments = [
    "t('common.devices.computer')",
    "t('common.devices.phone')",
    "t('fileManager.showHiddenFiles')",
    "t('fileManager.viewAsGrid')",
    "t('fileManager.overallProgress')",
    "t('fileManager.transferTo'",
    "t('fileManager.onboarding.toggleHint')",
    "t('fileManager.onboarding.scrollHint')",
    "t('fileManager.overallProgressNote')",
    "t('fileManager.showDirectoriesFirst')",
    "t('fileManager.showStatusBar')",
    "t('fileManager.showLocalPane')",
    "t('fileManager.localPaneDragNote')",
    "t('fileManager.showLocalPaneOnLeft')",
    "t('updates.autoCheck')",
    "t('updates.autoDownload')",
    "t('updates.betaChannel')",
    "t('updates.betaWarning')",
    "t('privacy.analytics')",
    "t('privacy.description')",
    "t('privacy.learnMore')",
    "t('common.close')",
  ];

  requiredFragments.forEach((fragment) => {
    assert.ok(
      settingsDialogSource.includes(fragment),
      `SettingsDialog missing ${fragment}`
    );
  });

  assert.ok(!settingsDialogSource.includes('DEVICES_LABEL'));
});
```

- [ ] **Step 2: 运行测试并确认剩余页签仍含英文硬编码而失败**

Run: `yarn test:i18n`

Expected: FAIL，首个缺失项为 `t('common.devices.computer')` 或 `t('fileManager.showHiddenFiles')`。

- [ ] **Step 3: 移除 Settings Dialog 对英文设备常量的依赖**

删除：

```js
import { DEVICES_LABEL } from '../../../constants';
```

在 `render()` 中、布尔派生值之后增加：

```js
const computerLabel = t('common.devices.computer');
const phoneLabel = t('common.devices.phone');
```

按以下精确映射替换设备 label：

```text
DEVICES_LABEL[DEVICE_TYPE.local]             -> computerLabel
DEVICES_LABEL[DEVICE_TYPE.mtp]               -> phoneLabel
`To ${DEVICES_LABEL[DEVICE_TYPE.local]}`     -> t('fileManager.transferTo', { device: computerLabel })
`To ${DEVICES_LABEL[DEVICE_TYPE.mtp]}`       -> t('fileManager.transferTo', { device: phoneLabel })
```

- [ ] **Step 4: 迁移 File Manager 页所有可见文案**

按以下精确映射替换 Typography、提示文本和状态 label：

```text
Show hidden files                                      -> {t('fileManager.showHiddenFiles')}
View as grid                                           -> {t('fileManager.viewAsGrid')}
Display overall progress on the file transfer screen   -> {t('fileManager.overallProgress')}
Use the toggles to enable or disable an item.          -> {t('fileManager.onboarding.toggleHint')}
Scroll down for more Settings.                         -> {t('fileManager.onboarding.scrollHint')}
Note: To fetch the total transfer information, the files need to be processed first. It may take a few seconds to a few minutes depending on the total number of files to be copied. -> {t('fileManager.overallProgressNote')}
Show directories first                                 -> {t('fileManager.showDirectoriesFirst')}
Show status bar                                        -> {t('fileManager.showStatusBar')}
Show Local Disk pane                                   -> {t('fileManager.showLocalPane')}
Note: You can drag files from the Finder into the Mobile pane but not the other way around. -> {t('fileManager.localPaneDragNote')}
Show Local Disk pane on the left side                  -> {t('fileManager.showLocalPaneOnLeft')}
任意布尔状态 `Enabled` / `Disabled`                     -> t('common.enabled') / t('common.disabled')
```

保留现有 bullet `&#9679;&nbsp;`，只把 bullet 后的文字替换成翻译调用。

- [ ] **Step 5: 迁移 Updates 页所有可见文案**

按以下精确映射替换：

```text
Automatically check for updates                         -> {t('updates.autoCheck')}
Automatically download the new updates when available (recommended) -> {t('updates.autoDownload')}
Enable beta update channel                              -> {t('updates.betaChannel')}
Early access preview of the upcoming features but might result in crashes. -> {t('updates.betaWarning')}
任意布尔状态 `Enabled` / `Disabled`                      -> t('common.enabled') / t('common.disabled')
```

- [ ] **Step 6: 迁移 Privacy 页和关闭按钮**

Privacy 说明区域改为：

```jsx
<Typography variant="caption">
  {t('privacy.description')}&nbsp;
  <a
    className={styles.a}
    onClick={() => {
      ipcRenderer.send(IpcEvents.OPEN_HELP_PRIVACY_POLICY_WINDOW);
    }}
  >
    {t('privacy.learnMore')}
  </a>
</Typography>
```

其余精确映射：

```text
Enable anonymous usage statistics gathering   -> {t('privacy.analytics')}
enableAnalytics ? `Enabled` : `Disabled`       -> enableAnalytics ? t('common.enabled') : t('common.disabled')
Close                                          -> {t('common.close')}
```

- [ ] **Step 7: 运行专项测试、键集合检查和定向 Lint**

Run:

```bash
yarn test:i18n
yarn eslint app/containers/Settings/components/SettingsDialog.jsx internals/scripts/test-i18n.js --format=pretty
```

Expected: PASS 10 i18n tests；英文和中文键集合一致；Lint 0 errors。

- [ ] **Step 8: 提交设置窗口完整翻译**

```bash
git add app/containers/Settings/components/SettingsDialog.jsx internals/scripts/test-i18n.js
git commit -m "feat: translate settings dialog"
```

---

### Task 5: 全量验证和启动恢复冒烟测试

**Files:**
- Verify: `package.json`
- Verify: `yarn.lock`
- Verify: `app/i18n/language.js`
- Verify: `app/i18n/index.js`
- Verify: `app/i18n/bootstrap.js`
- Verify: `app/i18n/locales/en/settings.json`
- Verify: `app/i18n/locales/zh-CN/settings.json`
- Verify: `internals/scripts/test-i18n.js`
- Verify: `app/index.js`
- Verify: `app/containers/App/index.jsx`
- Verify: `app/containers/Settings/reducers.js`
- Verify: `app/containers/Settings/selectors.js`
- Verify: `app/containers/Settings/index.jsx`
- Verify: `app/containers/Settings/components/SettingsDialog.jsx`
- Verify: `app/containers/Settings/styles/index.js`
- Runtime data, temporary and restored: `/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json`

**Interfaces:**
- Consumes: `yarn test:i18n`、现有 `yarn lint`、`yarn build`。
- Produces: 测试、Lint、生产构建和真实 Settings Dialog 行为的验证证据。

- [ ] **Step 1: 运行所有自动验证**

Run:

```bash
yarn test:i18n
yarn lint
yarn build
git diff --check
git status --short --branch
```

Expected:

- `yarn test:i18n`：PASS 10 i18n tests。
- `yarn lint`：0 errors。
- `yarn build`：main 与 renderer webpack production build 均成功。
- `git diff --check`：无输出。
- `git status`：只包含预期改动；如果每个任务均已提交，则工作区干净且本地分支领先远端。

- [ ] **Step 2: 备份真实设置文件，禁止无备份修改**

仅当设置文件已经存在时执行 GUI 冒烟测试。Run:

```bash
test -f '/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json'
smoke_backup_dir=$(mktemp -d)
cp '/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json' "$smoke_backup_dir/settings.json"
```

Expected: `test` 退出码为 0，临时目录中存在完整备份。若原文件不存在，停止 GUI 冒烟测试并在验证报告中写明，不创建或删除用户配置文件。

- [ ] **Step 3: 启动开发版并检查即时切换**

在一个终端运行：

```bash
yarn dev
```

webpack dev server 就绪后，在另一个终端运行：

```bash
yarn start-main-dev
```

在应用内执行并记录结果：

1. 打开 Settings Dialog。
2. 在 General 页选择 `简体中文`。
3. 确认标题、四个页签、当前页选项和关闭按钮立即切换为中文。
4. 逐一打开文件管理、更新、隐私页，确认没有可见英文硬编码；`MTP`、`Kalam`、`Legacy` 保留原文。
5. 关闭并重新打开同一个 Settings Dialog，确认仍显示中文。
6. 切回 `English`，确认整个 Settings Dialog 立即恢复英文。

Expected: 每一步都不需要重启；Settings Dialog 不显示翻译键或空白文字。

- [ ] **Step 4: 验证第二次启动覆写场景仍保留中文**

关闭应用后，使用 `jq` 只在已备份的测试期间设置模拟状态：

```bash
settings_path='/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json'
settings_tmp=$(mktemp)
jq '.freshInstall = 1 | .appLanguage = "zh-CN"' "$settings_path" > "$settings_tmp"
mv "$settings_tmp" "$settings_path"
```

重新运行 `yarn start-main-dev`，关闭应用后检查：

```bash
jq '{freshInstall, appLanguage}' '/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json'
```

Expected:

```json
{
  "freshInstall": 0,
  "appLanguage": "zh-CN"
}
```

再次启动应用，打开 Settings Dialog，确认仍为中文。

- [ ] **Step 5: 无论冒烟结果如何都恢复原设置文件**

关闭应用后运行：

```bash
cp "$smoke_backup_dir/settings.json" '/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json'
cmp "$smoke_backup_dir/settings.json" '/Users/yue/Library/Application Support/io.ganeshrvel.openmtp/settings.json'
```

Expected: `cmp` 退出码为 0。保留临时备份路径到验证结束；不使用递归删除命令。

- [ ] **Step 6: 汇总交付证据**

交付说明必须包含：

- 新增的两种语言及默认/回退策略。
- bootstrap 使用的明确 action：`copyJsonFileToSettings({ appLanguage })`。
- 专项测试数量、Lint 结果和两个 production build 结果。
- GUI 即时切换、Dialog 关闭重开、第二次/第三次启动恢复结果。
- 原始用户设置文件已通过 `cmp` 确认恢复。
- 不自动 push、不创建 PR；如需发布或推送，等待用户单独授权。
