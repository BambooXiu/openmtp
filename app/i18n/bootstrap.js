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
