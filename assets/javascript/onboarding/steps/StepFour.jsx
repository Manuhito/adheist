import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Bars from '../components/Bars';

// Ad Copy Text Display component with Read More/Less functionality
const AdCopyTextDisplay = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 150;

  if (!text) return null;

  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText = isExpanded || !shouldTruncate
    ? text
    : text.substring(0, CHAR_LIMIT).trim();

  return (
    <div className="relative w-0 min-w-full">
      <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
        {displayText}
        {shouldTruncate && !isExpanded && (
          <>
            ...{' '}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="text-gray-500 hover:text-gray-700 text-xs underline inline"
            >
              read more
            </button>
          </>
        )}
      </p>
      {shouldTruncate && isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
        >
          Read less
        </button>
      )}
    </div>
  );
};

// Competitor Ad Card - matching ad-request-versions-page.jsx style
const CompetitorAdCard = ({ ad, isSelected, onSelect }) => {
  const getFaviconUrl = (url) => {
    try {
      if (!url) return null;
      const u = new URL(url);
      const host = u.hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch (_) {
      return null;
    }
  };

  const favicon = getFaviconUrl(ad.page_url);
  const initial = (ad.page_name || '').trim().charAt(0).toUpperCase();

  return (
    <div
      onClick={() => onSelect(ad.id)}
      className={`
        relative bg-background rounded-xl overflow-hidden border transition-all cursor-pointer group
        ${isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:shadow-md'
        }
      `}
    >
      {/* Selection Indicator */}
      <div className={`
        absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
        ${isSelected
          ? 'bg-primary text-primary-foreground scale-100 opacity-100'
          : 'bg-black/20 backdrop-blur-sm border border-white/50 opacity-0 group-hover:opacity-100 scale-90'
        }
      `}>
        <Check size={14} strokeWidth={3} />
      </div>

      {/* Brand header with avatar */}
      <div className="p-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentNode.innerHTML = `<div class="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">${initial || '?'}</div>`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                {initial || '?'}
              </div>
            )}
          </div>
          <h3 className="text-sm font-semibold truncate">{ad.page_name || 'Brand'}</h3>
        </div>

        {/* Ad Copy Text */}
        {ad.ad_copy ? (
          <div className="mt-2">
            <AdCopyTextDisplay text={ad.ad_copy} />
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">
            No ad copy available
          </div>
        )}
      </div>

      {/* Image */}
      {ad.image_url ? (
        <div className="relative aspect-square rounded-lg overflow-hidden mx-3 mb-3">
          <img
            src={ad.image_url}
            alt="Ad Creative"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isSelected ? 'opacity-30' : ''}`} />
        </div>
      ) : (
        <div className="relative aspect-square rounded-lg overflow-hidden mx-3 mb-3 bg-muted flex items-center justify-center">
          <div className="text-xs text-muted-foreground">No Image</div>
        </div>
      )}
    </div>
  );
};

const StepFour = ({ onNext, initialData, setMascotMessageOverride }) => {
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let pollingInterval = null;
    let isMounted = true;

    // Function to check competitor research status
    const checkStatus = async () => {
      try {
        const response = await fetch('/ads/api/competitor-ads/', {
          credentials: 'same-origin'
        });
        const data = await response.json();

        if (!isMounted) return;

        console.log('Competitor research status:', data);

        // Check if research is completed
        if (data.completed) {
          // Stop polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }

          if (data.success && data.ads && data.ads.length > 0) {
            setAds(data.ads);
            setIsLoading(false);
          } else {
            // Research completed but no ads found
            setError('No competitor ads were found. You can skip this step and explore ads later.');
            setIsLoading(false);
          }
        }
        // If not completed, polling continues
      } catch (e) {
        console.error('Error checking competitor research status:', e);
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 3 seconds
    pollingInterval = setInterval(checkStatus, 3000);

    return () => {
      isMounted = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (setMascotMessageOverride) {
      if (isLoading) {
        setMascotMessageOverride("Searching for ads from your competitors... This might take a moment!");
      } else if (error || ads.length === 0) {
        setMascotMessageOverride("I couldn't find any competitor ads yet. You can skip this step or try again later.");
      } else {
        setMascotMessageOverride("I found these ads from your competitors. Select one you'd like to use as inspiration!");
      }
    }
  }, [isLoading, error, ads.length, setMascotMessageOverride]);

  const handleClone = () => {
    if (selectedAdId) {
      const selectedAd = ads.find(ad => ad.id === selectedAdId);
      onNext({ ...initialData, selectedAd });
    }
  };

  const handleSkip = () => {
    onNext({ ...initialData, selectedAd: null });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-8 animate-in fade-in duration-500">
      <div className="w-full max-w-6xl px-4">
        <Card className="w-full shadow-xl bg-background/95 backdrop-blur-sm border-primary/20">
          <CardContent className="p-6 space-y-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Competitor Ads</h2>
                <p className="text-muted-foreground mt-1">
                  Select an ad to use as a reference for your campaign
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isLoading && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedAdId ? '1 ad selected' : 'No ad selected'}
                    </span>
                    {ads.length > 0 ? (
                      <Button
                        onClick={handleClone}
                        disabled={!selectedAdId}
                        className="px-8 min-w-[140px]"
                      >
                        Clone this ad
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSkip}
                        className="px-8 min-w-[140px]"
                      >
                        Skip for now
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Grid Content */}
            {isLoading ? (
              <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Bars size={48} className="text-primary" />
                  <p className="text-muted-foreground animate-pulse">Finding competitor ads...</p>
                </div>
              </div>
            ) : ads.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px] max-h-[600px] overflow-y-auto pr-2 -mr-2">
                {ads.map((ad) => (
                  <CompetitorAdCard
                    key={ad.id}
                    ad={ad}
                    isSelected={selectedAdId === ad.id}
                    onSelect={(id) => setSelectedAdId(id === selectedAdId ? null : id)}
                  />
                ))}
              </div>
            ) : (
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    {error || "No competitor ads found yet. The research might still be in progress."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can skip this step and explore ads later in the Discover section.
                  </p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StepFour;
