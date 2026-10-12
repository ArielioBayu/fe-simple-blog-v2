import { id, LocaleTranslations } from './id';
import { en } from './en';

export type Language = 'id' | 'en';

export const locales: Record<Language, LocaleTranslations> = {
  id,
  en,
};

export { id, en };
export type { LocaleTranslations };
