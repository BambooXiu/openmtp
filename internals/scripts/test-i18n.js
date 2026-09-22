const assert = require('assert');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const {
  APP_LANGUAGE,
  DEFAULT_APP_LANGUAGE,
  normalizeAppLanguage,
} = require('../../app/i18n/language');
const { APP_TRANSLATION_RESOURCES, createI18n } = require('../../app/i18n');
const settingsReducerModule = require('../../app/containers/Settings/reducers');
const {
  actionTypes,
  copyJsonFileToSettings,
} = require('../../app/containers/Settings/actions');
const { bootstrapAppLanguage } = require('../../app/i18n/bootstrap');
const enSettings = require('../../app/i18n/locales/en/settings.json');
const zhCnSettings = require('../../app/i18n/locales/zh-CN/settings.json');

const settingsDialogSource = readFileSync(
  resolve(
    __dirname,
    '../../app/containers/Settings/components/SettingsDialog.jsx'
  ),
  'utf8'
);

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

  assert.strictEqual(instance.t('settings:fallbackOnly'), 'English fallback');
});

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
  assert.deepStrictEqual(calls, ['hydrate:zh-CN', 'initialize:zh-CN']);
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

const run = () => {
  return tests
    .reduce(
      (chain, { name, callback }) =>
        chain.then(() => callback()).then(() => console.info(`PASS ${name}`)),
      Promise.resolve()
    )
    .then(() => console.info(`PASS ${tests.length} i18n tests`));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
