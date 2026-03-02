import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CaretLeft } from '@phosphor-icons/react';

/** Link/button to return to the previous page (e.g. from account, voices, system, accessibility). */
export default function BackToSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mono-ui text-[11px] md:text-[12px] text-forest hover:text-primary flex items-center gap-2 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      data-testid="back-to-settings"
    >
      <CaretLeft weight="bold" className="w-4 h-4" />
      <span>{t('settings.back_to_settings')}</span>
    </button>
  );
}
