import { useTranslation } from 'react-i18next'

export default function LanguageSelector() {
  const { i18n } = useTranslation()

  return (
    <div className="flex text-sm tracking-[0.15em]" role="group" aria-label="Language">
      {['en', 'fr'].map((lng) => {
        const active = i18n.language.startsWith(lng)
        return (
          <button
            key={lng}
            lang={lng}
            aria-pressed={active}
            onClick={() => i18n.changeLanguage(lng)}
            className={`px-2 py-2 uppercase underline-offset-8 transition-colors ${active ? 'text-paper underline' : 'text-mist hover:text-paper'}`}
          >
            {lng}
          </button>
        )
      })}
    </div>
  )
}
