import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../components/ui/button.tsx';
import { ArrowLeft } from 'lucide-react';

// Ad Copy Text Display component with Read More/Less functionality
const AdCopyTextDisplay = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 150;

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

// Version Card component
const VersionCard = ({ version, onClick, brandName, brandUrl }) => {
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
  const favicon = getFaviconUrl(brandUrl);
  const initial = (brandName || '').trim().charAt(0).toUpperCase();

  return (
    <div
      onClick={() => version.generated_image && onClick(version.id)}
      className="bg-background rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer group"
    >
      {/* Brand header with avatar */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentNode.innerHTML = `<div class=\"w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs\">${initial || '?'}</div>`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                  {initial || '?'}
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold truncate">{brandName || 'Brand'}</h3>
          </div>
          <span
            className={`text-[10px] px-2 py-[2px] rounded-full whitespace-nowrap ${version.revisions_count > 0
              ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
          >
            {version.revisions_count > 0 ? `${version.revisions_count} revision${version.revisions_count > 1 ? 's' : ''}` : 'No revisions'}
          </span>
        </div>
        {/* Ad Copy Text */}
        {version.ad_copy_text ? (
          <div className="mt-2">
            <AdCopyTextDisplay text={version.ad_copy_text} />
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="w-3 h-3 border-2 border-primary/20 dark:border-primary/30 border-t-primary dark:border-t-primary rounded-full animate-spin"></div>
            Generating copy...
          </div>
        )}
      </div>

      {/* Image */}
      {version.generated_image ? (
        <div className="relative aspect-square rounded-lg overflow-hidden mx-3 mb-3">
          <img
            src={version.generated_image}
            alt="Generated Ad"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ) : (
        <div className="relative aspect-square rounded-lg overflow-hidden mx-3 mb-3 bg-muted flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary/20 dark:border-primary/30 border-t-primary dark:border-t-primary rounded-full animate-spin"></div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Generating...</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom header component
const AdRequestVersionsHeader = ({ brandName, backUrl }) => {
  const handleContinueToLibrary = () => {
    window.location.href = '/ads/discover/';
  };

  const handleBack = () => {
    window.location.href = backUrl;
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {brandName}
        </h1>
      </div>
      <Button
        onClick={handleContinueToLibrary}
        className="text-sm"
      >
        Continue to library
      </Button>
    </div>
  );
};

const AdRequestVersionsPage = () => {
  const data = window.__AD_REQUEST_VERSIONS_DATA__ || {};
  const [versions, setVersions] = useState(data.versions || []);
  const [pendingIds, setPendingIds] = useState(() =>
    (data.versions || []).filter(v => !v.generated_image || !v.ad_copy_text).map(v => v.id)
  );

  // Set custom header when component mounts
  React.useEffect(() => {
    if (window.setAppHeader) {
      const brandName = data.brand_name || 'Ad Versions';
      const backUrl = data.back_url || '/ads/my-ads/';
      window.setAppHeader(<AdRequestVersionsHeader brandName={brandName} backUrl={backUrl} />);
    }

    // Cleanup header when component unmounts
    return () => {
      if (window.clearAppHeader) {
        window.clearAppHeader();
      }
    };
  }, [data.brand_name, data.back_url]);

  // Poll versions that are still generating until they have images
  React.useEffect(() => {
    if (!pendingIds || pendingIds.length === 0) return;
    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const results = await Promise.all(
          pendingIds.map(async (id) => {
            try {
              const resp = await fetch(`/ads/api/version/${id}/`, { credentials: 'same-origin' });
              if (!resp.ok) return null;
              const data = await resp.json();
              return data;
            } catch (_) {
              return null;
            }
          })
        );

        if (cancelled) return;

        const updatesById = {};
        results.forEach((res) => {
          if (res && (res.generated_image || res.ad_copy_text)) {
            updatesById[res.id] = res;
          }
        });

        // A version is completed only when BOTH image and copy exist
        const completed = results
          .filter((res) => res && res.generated_image && !!res.ad_copy_text)
          .map((res) => res.id);
        if (completed.length > 0) {
          // Update versions state with new images/text
          setVersions((prev) =>
            prev.map((v) => {
              const upd = updatesById[v.id];
              return upd
                ? { ...v, generated_image: upd.generated_image, ad_copy_text: upd.ad_copy_text ?? v.ad_copy_text }
                : v;
            })
          );

          // Remove completed ids from pending list
          setPendingIds((prev) => prev.filter((id) => !completed.includes(id)));
        }
      } catch (_) {
        // Ignore polling errors; next tick will retry
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingIds]);

  const handleVersionClick = (versionId) => {
    window.location.href = `/ads/generated/versions/${versionId}/`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Grid of version cards */}
      <div className="flex flex-wrap justify-center gap-6">
        {versions.map((version) => (
          <div
            key={version.id}
            className="w-full sm:flex-[0_0_calc((100%_-_48px)/3)]"
          >
            <VersionCard
              version={version}
              onClick={handleVersionClick}
              brandName={data.brand_name}
              brandUrl={data.brand_url}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {versions.length === 0 && (
        <div className="mt-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No versions available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This ad request doesn't have any primary versions yet.
          </p>
        </div>
      )}
    </div>
  );
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for sidebar layout to be ready
  const checkSidebarReady = () => {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<AdRequestVersionsPage />);
      }
    } else {
      setTimeout(checkSidebarReady, 50);
    }
  };

  checkSidebarReady();
});

export default AdRequestVersionsPage;
