import React from 'react';
import { Button } from '../../shadcn/components/ui/button';
import { Card } from '../../shadcn/components/ui/card';
import { useTranslation } from '../../lib/useTranslation';

const TwoFactorAuth = ({ hasValidTotpDevice, hasVerifiedEmail }) => {
  const { t } = useTranslation();
  return (
    <section className="app-card">
      <h2 className="pg-subtitle">{t('profile.two_factor', 'Two-Factor Auth')}</h2>
      {hasValidTotpDevice ? (
        <>
          <p className="mb-3">{t('profile.2fa_enabled', 'You already have two-factor authentication enabled.')}</p>
          <Button 
            variant="outline" 
            className="pg-button-secondary"
            onClick={() => window.location.href = '/mfa/'}
          >
            {t('profile.configure', 'Configure')}
          </Button>
        </>
      ) : (
        hasVerifiedEmail ? (
          <>
            <p className="mb-3">{t('profile.2fa_disabled', 'You do not have two-factor authentication enabled.')}</p>
            <Button 
              variant="outline" 
              className="pg-button-secondary"
              onClick={() => window.location.href = '/mfa/totp/activate/'}
            >
              {t('profile.enable', 'Enable')}
            </Button>
          </>
        ) : (
          <>
            <p className="mb-3">{t('profile.verify_email_for_2fa', 'To set up two-factor authentication you must first verify your email address.')}</p>
            <Button 
              variant="outline" 
              className="pg-button-secondary"
              onClick={() => window.location.href = '/accounts/email/'}
            >
              {t('profile.verify', 'Verify')}
            </Button>
          </>
        )
      )}
    </section>
  );
};

export default TwoFactorAuth;
