import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Mascot from './components/Mascot';
import StepOne from './steps/StepOne';
import StepTwo from './steps/StepTwo';
import StepThree from './steps/StepThree';
import StepFour from './steps/StepFour';
import StepFive from './steps/StepFive';
import OnboardingLoadingPage from './components/OnboardingLoadingPage';

// Helper to get CSRF token
const getCsrfToken = () => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const OnboardingPage = () => {
  const { currentStep: initialStep, user, savedData } = window.__ONBOARDING_DATA__ || {};

  // Debug: Log what we received from the backend
  console.log('OnboardingPage init:', { initialStep, savedData, fullData: window.__ONBOARDING_DATA__ });

  // Use local state for immediate feedback, though ideally we sync with server
  const [currentStep, setCurrentStep] = useState(initialStep || 'STEP_1');
  // Initialize formData with savedData if available (for page refresh scenarios)
  const [formData, setFormData] = useState(savedData || {});
  const [mascotMessageOverride, setMascotMessageOverride] = useState(null);
  const [adRequestId, setAdRequestId] = useState(null);

  const handleStepOneNext = async (data) => {
    console.log('Step 1 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));

    // Advance onboarding status in backend
    try {
      await fetch('/users/api/advance-onboarding/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });
    } catch (error) {
      console.error('Error advancing onboarding:', error);
    }

    setCurrentStep('STEP_2');
  };

  const handleStepTwoNext = async (data) => {
    console.log('Step 2 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));

    // Advance onboarding status in backend
    try {
      await fetch('/users/api/advance-onboarding/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });
    } catch (error) {
      console.error('Error advancing onboarding:', error);
    }

    setCurrentStep('STEP_3');
  };

  const handleStepThreeNext = async (data) => {
    console.log('Step 3 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));

    // Advance onboarding status in backend
    try {
      await fetch('/users/api/advance-onboarding/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });
    } catch (error) {
      console.error('Error advancing onboarding:', error);
    }

    setCurrentStep('STEP_4');
  };

  const handleStepFourNext = async (data) => {
    console.log('Step 4 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));

    // If user selected an ad, save it to the backend
    if (data.selectedAd && data.selectedAd.id) {
      try {
        const response = await fetch('/ads/api/select-competitor-ad/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({ ad_library_id: data.selectedAd.id }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('Ad selection saved, advancing to step 5');
        } else {
          console.error('Failed to save ad selection:', result.message);
        }
      } catch (error) {
        console.error('Error saving ad selection:', error);
      }
    }

    // Advance onboarding status in backend
    try {
      await fetch('/users/api/advance-onboarding/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });
    } catch (error) {
      console.error('Error advancing onboarding:', error);
    }

    setCurrentStep('STEP_5');
  };

  const handleStepFiveNext = async (data) => {
    console.log('Step 5 submitted:', data);
    setFormData(prev => ({ ...prev, ...data }));

    // Complete onboarding (advance to ONBOARDED status)
    try {
      await fetch('/users/api/advance-onboarding/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });
      // Redirect to main app after completing onboarding
      window.location.href = '/ads/discover/';
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const handleGenerate = async (data) => {
    console.log('Generate clicked:', data);

    try {
      // Call the generate onboarding ad endpoint
      const response = await fetch('/ads/api/generate-onboarding-ad/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('Ad generation started:', result);
        setAdRequestId(result.ad_request_id);
        setCurrentStep('GENERATING');
        // Onboarding status is advanced in the backend
      } else {
        console.error('Failed to start ad generation:', result.error);
        alert(result.error || 'Failed to start ad generation');
      }
    } catch (error) {
      console.error('Error starting ad generation:', error);
      alert('An error occurred while starting ad generation');
    }
  };

  const getMascotMessage = () => {
    switch (currentStep) {
      case 'STEP_1':
        return 'Lets get Started';
      case 'STEP_2':
        return "Okay, how does this look?";
      case 'STEP_3':
        return "Awesome!";
      case 'STEP_4':
        return "I found these ads from your competitors. Select one you'd like to use as inspiration!";
      case 'STEP_5':
        return "Okay, upload any images you think might help and click Generate!";
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
      case 'STEP_3':
        return (
          <StepThree
            onNext={handleStepThreeNext}
            initialData={formData}
            setMascotMessageOverride={setMascotMessageOverride}
          />
        );
      case 'STEP_4':
        return (
          <StepFour
            onNext={handleStepFourNext}
            initialData={formData}
            setMascotMessageOverride={setMascotMessageOverride}
          />
        );
      case 'STEP_5':
        return (
          <StepFive
            onNext={handleStepFiveNext}
            onGenerate={handleGenerate}
            initialData={formData}
            setMascotMessageOverride={setMascotMessageOverride}
          />
        );
      case 'GENERATING':
        return (
          <OnboardingLoadingPage adRequestId={adRequestId} />
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
    <div className="h-screen w-full bg-background/50 flex flex-col relative overflow-hidden">
      {/* Header Logo */}
      <header className="w-full flex justify-center pt-10 absolute top-0 z-20 pointer-events-none">
        <img
          src="/static/images/web/logo-brand-name.png"
          alt="AdHeist"
          className="h-12 w-auto object-contain"
        />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 pt-28 pb-8 overflow-hidden">
        {renderStep()}
      </main>

      {/* Mascot Layer - hide during GENERATING state */}
      {currentStep !== 'GENERATING' && (
        <Mascot message={mascotMessageOverride || getMascotMessage()} />
      )}
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
