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
