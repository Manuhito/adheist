import React from 'react';
import { Button } from '../../shadcn/components/ui/button';
import { useTranslation } from '../../lib/useTranslation';

const SocialAccounts = ({ socialAccounts, hasUsablePassword }) => {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="pg-subtitle">{t('profile.connected_accounts', 'Connected Accounts')}</h2>
      {socialAccounts && socialAccounts.length > 0 ? (
        socialAccounts.map((account, index) => (
          <div className="mb-3" key={index}>
            {account.provider === 'google' && (
              <>
                <span className="pg-icon">
                  <img src="/static/images/socialauth/google-logo.svg" alt="Google" />
                </span>
                <span>{account.extra_data.email}</span>
              </>
            )}
            
            {account.provider === 'twitter' && (
              <>
                <span className="pg-icon">
                  <img src="/static/images/socialauth/twitter-logo.svg" alt="Twitter" />
                </span>
                <a 
                  href={account.get_profile_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  @{account.get_screen_name}
                </a>
              </>
            )}
            
            {account.provider === 'github' && (
              <>
                <span className="pg-icon">
                  <img src="/static/images/socialauth/github-logo.svg" alt="GitHub" />
                </span>
                <a 
                  href={account.get_profile_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  @{account.account.extra_data.login}
                </a>
              </>
            )}
            
            {!['google', 'twitter', 'github'].includes(account.provider) && (
              <>
                <span>{account.get_brand?.name}</span>
                <span>{account.toString()}</span>
              </>
            )}
          </div>
        ))
      ) : (
        <p className="mb-3">{t('profile.no_social_accounts', "You haven't linked any social accounts yet. Create one below.")}</p>
      )}
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="pg-button-secondary"
          onClick={() => window.location.href = '/accounts/social/connections/'}
        >
          {t('profile.manage_accounts', 'Manage Accounts')}
        </Button>
        
        {!hasUsablePassword && (
          <Button 
            variant="outline" 
            className="pg-button-secondary"
            onClick={() => window.location.href = '/accounts/password/set/'}
          >
            {t('profile.add_password', 'Add a Password')}
          </Button>
        )}
      </div>
    </>
  );
};

export default SocialAccounts;
