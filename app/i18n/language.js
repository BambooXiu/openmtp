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
