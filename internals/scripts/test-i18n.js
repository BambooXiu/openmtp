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
