import React from 'react';
import { useTranslation } from 'react-i18next';
import BackToSettings from '../components/BackToSettings';

const SubscriptionPage = () => {
  const { t } = useTranslation();

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-[rgb(var(--color-bg))] overflow-hidden" data-testid="subscription-page">
      <div className="shrink-0 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10">
        <BackToSettings />
      </div>
      <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-8">
        <div className="narvo-border bg-[rgb(var(--color-surface))]/10 p-6 md:p-10 max-w-2xl">
          <h1 className="font-display text-xl md:text-2xl font-bold text-[rgb(var(--color-text-primary))] uppercase tracking-tight mb-2">
            {t('settings.manage_plan', 'Manage Plan')}
          </h1>
          <p className="font-mono text-[12px] text-[rgb(var(--color-text-secondary))] leading-relaxed">
            {t('settings.subscription_coming_soon')}
          </p>
        </div>
      </div>
    </main>
  );
};

export default SubscriptionPage;
