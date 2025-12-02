import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Bars from '../components/Bars';

// Ad Copy Text Display component with Read More/Less functionality (matching discover-page MediaItem)
const AdCopyTextDisplay = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 80; // Same as MediaItem in discover-page

  if (!text) return null;

  const shouldTruncate = text.length > CHAR_LIMIT;

  return (
    <div className="relative w-0 min-w-full">
      {!isExpanded && shouldTruncate ? (
        <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
          {text.substring(0, CHAR_LIMIT)}...{' '}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="text-gray-500 hover:text-gray-700 text-xs underline inline"
          >
            read more
          </button>
        </p>
      ) : (
        <div>
          <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-line">
            {text}
          </p>
          {isExpanded && shouldTruncate && (
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
      )}
    </div>
  );
};

// Competitor Ad Card - matching discover-page MediaItem style
const CompetitorAdCard = ({ ad, isSelected, onSelect }) => {
  const initial = (ad.page_name || '').trim().charAt(0).toUpperCase();

  // Get avatar URL using twenty-icons service (same as discover-page)
  const getAvatarUrl = (pageUrl) => {
    if (!pageUrl) return null;
    return `https://twenty-icons.com/${pageUrl.replace(/^https?:\/\//, '')}`;
  };

  const avatarUrl = getAvatarUrl(ad.page_url);

  return (
    <div
      onClick={() => onSelect(ad.id)}
      className={`bg-background rounded-xl overflow-hidden border transition-colors cursor-pointer group ${isSelected ? 'border-primary' : 'border-border hover:border-primary/50'
        }`}
    >
      {/* Header - matching MediaItem style */}
      <div className="p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${ad.page_name} logo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `<div class="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">${initial || '?'}</div>`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                {initial || '?'}
              </div>
            )}
          </div>
          <h3 className="text-sm font-semibold break-words line-clamp-2 flex-1">{ad.page_name || 'Brand'}</h3>
        </div>

        {/* Ad Copy Text - use ad_creative_bodies if available, fallback to ad_copy */}
        {(ad.ad_creative_bodies || ad.ad_copy) && (
          <div className="mt-2">
            <AdCopyTextDisplay text={ad.ad_creative_bodies || ad.ad_copy} />
          </div>
        )}
      </div>

      {/* Image Content - matching MediaItem style */}
      <div className="relative aspect-square rounded-lg overflow-hidden mx-3">
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt="Ad Creative"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No Image</span>
          </div>
        )}

        {/* Selection indicator - matching MediaItem style */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="bg-background rounded-full p-1">
              <Check className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Bottom padding for image margin */}
      <div className="pb-3" />
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
    if (!setMascotMessageOverride) return;

    const timeouts = [];

    if (isLoading) {
      // Loading competitors: show two messages sequentially, then keep last
      const loadingMessages = [
        "Okay, one last thing..",
        "We are going to build your first ad!"
      ];
      setMascotMessageOverride(loadingMessages[0]);

      timeouts.push(
        setTimeout(() => {
          setMascotMessageOverride(loadingMessages[1]);
        }, 5000)
      );
    } else if (error || ads.length === 0) {
      // Research finished but no ads / error
      setMascotMessageOverride("I couldn't find any competitor ads yet. You can skip this step or try again later.");
    } else if (selectedAdId) {
      // User has picked an ad
      setMascotMessageOverride("Nice Pick!");
    } else {
      // Ads loaded successfully: show two messages sequentially, then keep last
      const loadedMessages = [
        "I found some ads that may be relevant to your niche...",
        "Pick a reference ad to get started"
      ];
      setMascotMessageOverride(loadedMessages[0]);

      timeouts.push(
        setTimeout(() => {
          setMascotMessageOverride(loadedMessages[1]);
        }, 5000)
      );
    }

    return () => {
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [isLoading, error, ads.length, selectedAdId, setMascotMessageOverride]);

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
    <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
      <div className="w-full max-w-6xl mx-auto px-4 flex flex-col h-full overflow-hidden">
        <Card className="w-full shadow-none bg-transparent backdrop-blur-none border-none flex flex-col h-full overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full overflow-hidden">

            {/* Header Section - fixed height */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 pb-4">
              <div>
                <h2 className="text-2xl font-bold">Competitor Ads</h2>
                <p className="text-muted-foreground mt-1">
                  Select an ad to use as a reference for your campaign
                </p>
              </div>
            </div>

            {/* Grid Content - scrollable container */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Bars size={48} className="text-primary" />
                    <p className="text-muted-foreground animate-pulse">Finding competitor ads...</p>
                  </div>
                </div>
              ) : ads.length > 0 ? (
                <div className="h-full overflow-y-auto pr-2 -mr-2 bg-transparent">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ads.map((ad) => (
                      <CompetitorAdCard
                        key={ad.id}
                        ad={ad}
                        isSelected={selectedAdId === ad.id}
                        onSelect={(id) => setSelectedAdId(id === selectedAdId ? null : id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
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
            </div>
            {/* Footer actions: Clone / Skip */}
            <div className="flex justify-end pt-4 flex-shrink-0">
              {!isLoading && (
                <>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StepFour;
