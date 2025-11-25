import React, { useState, useEffect } from 'react';
import Bars from '../components/Bars';

const StepTwo = ({ onNext, initialData, setMascotMessageOverride }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (initialData?.promises) {
        try {
          const [screenshotData, analysisData] = await Promise.all([
            initialData.promises.screenshot,
            initialData.promises.analysis
          ]);

          if (analysisData.success) {
            setData({
              screenshot: screenshotData.success ? screenshotData.screenshot : null,
              brandData: analysisData
            });
            setLoading(false);
          } else {
            setError(analysisData.error || "Failed to analyze website");
            setLoading(false);
          }
        } catch (err) {
          console.error("Error loading step two data:", err);
          setError("An error occurred while loading data.");
          setLoading(false);
        }
      } else if (initialData?.brandData) {
        // Data already loaded (maybe revisiting step)
        setData({
          screenshot: initialData.screenshot,
          brandData: initialData.brandData
        });
        setLoading(false);
      }
    };

    loadData();
  }, [initialData]);

  useEffect(() => {
    if (setMascotMessageOverride) {
      if (loading) {
        setMascotMessageOverride("Analyzing your brand style...");
      } else if (error) {
        setMascotMessageOverride("Oops! Something went wrong.");
      } else {
        setMascotMessageOverride("Look what I found! Is this correct?");
      }
    }
  }, [loading, error, setMascotMessageOverride]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-4">
          <Bars size={64} className="text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Extracting brand assets...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="bg-destructive/10 p-8 rounded-xl border border-destructive/20 text-center max-w-md">
          <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Failed</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full py-8 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl px-4">
        {data?.screenshot && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border bg-muted/50 mb-8 group">
            <img
              src={data.screenshot}
              alt="Website Screenshot"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
              <p className="text-white font-medium">Analyzed from {initialData.url}</p>
            </div>
          </div>
        )}

        {/* Placeholder for brand data verification - User didn't ask for this yet, but screenshot is main focus */}
      </div>
    </div>
  );
};

export default StepTwo;
