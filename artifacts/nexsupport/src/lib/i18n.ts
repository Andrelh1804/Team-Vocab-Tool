import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en";
import pt from "@/locales/pt";

const savedLang = localStorage.getItem("nexsupport-lang") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Persist language selection
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("nexsupport-lang", lng);
});

export default i18n;
