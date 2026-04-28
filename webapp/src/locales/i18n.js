
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './en/translation.json';
import esTranslations from './es/translation.json';

// Inicializar i18next con una configuración base
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    es: { translation: esTranslations },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
