import React from 'react';
import { Button } from '../../shadcn/components/ui/button';
import { Card } from '../../shadcn/components/ui/card';

const TwoFactorAuth = ({ hasValidTotpDevice, hasVerifiedEmail }) => {
  return (
    <section className="app-card">
      <h2 className="pg-subtitle">Two-Factor Auth</h2>
      {hasValidTotpDevice ? (
        <>
          <p className="mb-3">You already have two-factor authentication enabled.</p>
          <Button 
            variant="outline" 
            className="pg-button-secondary"
            onClick={() => window.location.href = '/mfa/'}
          >
            Configure
          </Button>
        </>
      ) : (
        hasVerifiedEmail ? (
          <>
            <p className="mb-3">You do not have two-factor authentication enabled.</p>
            <Button 
              variant="outline" 
              className="pg-button-secondary"
              onClick={() => window.location.href = '/mfa/totp/activate/'}
            >
              Enable
            </Button>
          </>
        ) : (
          <>
            <p className="mb-3">To set up two-factor authentication you must first verify your email address.</p>
            <Button 
              variant="outline" 
              className="pg-button-secondary"
              onClick={() => window.location.href = '/accounts/email/'}
            >
              Verify
            </Button>
          </>
        )
      )}
    </section>
  );
};

export default TwoFactorAuth;
