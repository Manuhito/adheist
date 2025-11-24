import React from 'react';
import { createRoot } from 'react-dom/client';

const OnboardingPage = () => {
  const { currentStep } = window.__ONBOARDING_DATA__ || {};

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-sm border p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to AdHeist</h1>
        <div className="p-4 bg-muted rounded-md">
          <p className="text-lg font-medium">Current Step: {currentStep}</p>
          <p className="text-muted-foreground mt-2">Please complete the onboarding process to continue.</p>
        </div>
      </div>
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<OnboardingPage />);
  }
});
