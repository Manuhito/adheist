import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Mascot from './components/Mascot';
import StepOne from './steps/StepOne';
import StepTwo from './steps/StepTwo';

const OnboardingPage = () => {
  const { currentStep: initialStep, user } = window.__ONBOARDING_DATA__ || {};
  // Use local state for immediate feedback, though ideally we sync with server
  const [currentStep, setCurrentStep] = useState(initialStep || 'STEP_1');
  const [formData, setFormData] = useState({});
  const [mascotMessageOverride, setMascotMessageOverride] = useState(null);

  const handleStepOneNext = (data) => {
    console.log('Step 1 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep('STEP_2');
  };

  const handleStepTwoNext = (data) => {
    console.log('Step 2 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));
    // setCurrentStep('STEP_3'); 
  };

  const getMascotMessage = () => {
    switch (currentStep) {
      case 'STEP_1':
        return `Hi ${user?.firstName ? user.firstName : 'there'}! To get started, I need your brand's website URL.`;
      case 'STEP_2':
        return "Great! Now tell me more about your products.";
      default:
        return "We're making great progress!";
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'STEP_1':
        return (
          <StepOne
            onNext={handleStepOneNext}
            initialData={formData}
            user={user}
            setMascotMessageOverride={setMascotMessageOverride}
          />
        );
      case 'STEP_2':
        return (
          <StepTwo
            onNext={handleStepTwoNext}
            initialData={formData}
            setMascotMessageOverride={setMascotMessageOverride}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4">
            <div className="text-center p-8 bg-card rounded-lg border shadow-sm">
              <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
              <p className="text-muted-foreground">
                Step: {currentStep} is under construction.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-background/50 flex flex-col relative">
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col relative z-10">
        {renderStep()}
      </main>

      {/* Mascot Layer */}
      <Mascot message={mascotMessageOverride || getMascotMessage()} />
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
