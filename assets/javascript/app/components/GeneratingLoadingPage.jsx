import React from 'react';
import { Sparkles } from 'lucide-react';

const GeneratingLoadingPage = () => {
  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-4rem)] bg-white py-16">
      {/* Sparkles Animation */}
      <div className="relative">
        <div className="flex items-center justify-center w-24 h-16">
          {/* Main sparkle - center-left */}
          <Sparkles className="w-20 h-20 text-blue-500 animate-pulse" />
        </div>
      </div>

      {/* Text Container */}
      <div className="text-center max-w-md">
        {/* Main text */}
        <h1 className="text-xl font-semibold text-primary mb-4">
          Generating scroll-stopping ads...
        </h1>
        
        {/* Subtitle */}
        <p className="text-sm text-gray-400">
          Our AI is crafting high-performing ads tailored to your brand and optimized for results.
        </p>
      </div>

      {/* Loading spinner */}
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );
};

export default GeneratingLoadingPage;
