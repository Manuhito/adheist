import React, { useState } from 'react';

const AdReferenceCard = ({ item }) => {
  const [isAdBodiesExpanded, setIsAdBodiesExpanded] = useState(false);

  if (!item) {
    return null;
  }

  // Map adLibraryData to the structure expected by the card
  const cardData = {
    title: item.company_name,
    url: item.ad_image,
    page_url: item.page_url,
    ad_creative_bodies: item.ad_creative_bodies,
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-5/6 max-w-sm">
        <div className="bg-card rounded-xl overflow-hidden shadow-sm border border-border flex flex-col p-3">
          {/* Card Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {cardData.page_url ? (
                  <img
                    src={`https://twenty-icons.com/${cardData.page_url.replace(/^https?:\/\//, '')}`}
                    alt={`${cardData.title} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = `<div class="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">${cardData.title.charAt(0).toUpperCase()}</div>`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {cardData.title ? cardData.title.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
              </div>
              <h4 className="font-medium text-sm break-words">{cardData.title}</h4>
            </div>

            {/* Ad Creative Bodies */}
            {cardData.ad_creative_bodies && (
              <div>
                <div className="relative w-0 min-w-full">
                  {!isAdBodiesExpanded && cardData.ad_creative_bodies.length > 100 ? (
                    <p className="text-xs text-foreground leading-relaxed break-words">
                      {cardData.ad_creative_bodies.substring(0, 100)}...
                      <button
                        onClick={() => setIsAdBodiesExpanded(true)}
                        className="text-gray-500 hover:text-gray-700 text-xs underline inline ml-1"
                      >
                        read more
                      </button>
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs text-foreground leading-relaxed break-words">
                        {cardData.ad_creative_bodies}
                      </p>
                      {isAdBodiesExpanded && cardData.ad_creative_bodies.length > 100 && (
                        <button
                          onClick={() => setIsAdBodiesExpanded(false)}
                          className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
                        >
                          Read less
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card Body - Image */}
          <div className="py-3 flex-1 min-h-0">
            <div className="relative w-full h-full aspect-square">
              <img
                src={cardData.url}
                alt={cardData.title}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdReferenceCard;
