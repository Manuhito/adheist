import React from 'react';
import ProfileForm from './components/ProfileForm';
import TwoFactorAuth from './components/TwoFactorAuth';
import SocialAccounts from './components/SocialAccounts';
import { useTranslation } from '../lib/useTranslation';

const ProfilePage = () => {
  const { t } = useTranslation();
  // Get profile data from the window object
  const profileData = window.__PROFILE_DATA__ || null;

  if (!profileData) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
        {t('profile.error_no_data', 'Error: Profile data not available')}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <section className="app-card">
        <ProfileForm 
          userData={profileData.user} 
          formData={profileData.form}
          currentTz={profileData.current_tz}
          now={profileData.now}
        />
      </section>
      
      <TwoFactorAuth 
        hasValidTotpDevice={profileData.user_has_valid_totp_device}
        hasVerifiedEmail={profileData.user.has_verified_email}
      />
      
      <section className="app-card">
        <SocialAccounts 
          socialAccounts={profileData.social_accounts}
          hasUsablePassword={profileData.user.has_usable_password}
        />
      </section>
    </div>
  );
};

export default ProfilePage;
