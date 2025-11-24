import React from 'react';
import { createRoot } from 'react-dom/client';
import { Alert } from '../components/ui/alert.tsx';
import { AlertCircle, X } from 'lucide-react';

const SEARCH_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SAVE_DURATION_MS = 5 * 60 * 1000;   // 5 minutes
const STORAGE_KEY = 'requestBrandProgressState';

// Local state for the current Backload progress
const initialState = {
  backloadId: null,
  pageId: null,
  hasProcessedAds: false,
  progressPhase: 'idle', // 'idle' | 'searching' | 'saving' | 'done'
  progressValue: 0,
  canCloseProgress: false,
};

let state = { ...initialState };
let eventSource = null;
let progressIntervalId = null;
let progressContainer = null;
let progressRoot = null;
let requestStateListener = null;

const RequestBrandProgressAlert = ({ phase, progress, canClose, onClose, pageId, hasAds }) => {
  let message = '';

  if (phase === 'searching') {
    message = 'Searching ads for the requested advertiser';
  } else if (phase === 'saving') {
    message = 'Saving the ads we found';
  } else if (phase === 'done') {
    if (hasAds) {
      message = 'The ads are now available';
    } else {
      message = "We couldn't extract any ads for this advertiser.";
    }
  }

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] animate-in fade-in slide-in-from-bottom-5">
      <Alert
        layout="row"
        isNotification
        variant="info"
        icon={
          <AlertCircle
            className="text-blue-500"
            size={16}
            strokeWidth={2}
          />
        }
        action={
          canClose ? (
            <button
              className="group -my-1.5 -me-2 size-8 p-0 hover:bg-transparent"
              aria-label="Close notification"
              onClick={onClose}
            >
              <X
                size={16}
                strokeWidth={2}
                className="opacity-60 transition-opacity group-hover:opacity-100"
              />
            </button>
          ) : null
        }
      >
        <div className="flex flex-col w-full">
          <p className="text-sm mb-2">{message}</p>
          {phase === 'done' && hasAds && pageId && (
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                onClick={() => {
                  window.location.href = `/ads/discover/?company=${pageId}`;
                }}
              >
                Go to discover
              </button>
            </div>
          )}
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Alert>
    </div>
  );
};

function persistState() {
  try {
    const dataToStore = {
      backloadId: state.backloadId,
      pageId: state.pageId,
      hasProcessedAds: state.hasProcessedAds,
      progressPhase: state.progressPhase,
      progressValue: state.progressValue,
      canCloseProgress: state.canCloseProgress,
    };
    if (!dataToStore.backloadId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (e) {
    // Ignore storage errors
  }
}

function loadStateFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...initialState,
      ...parsed,
    };
  } catch (e) {
    return null;
  }
}

function clearState() {
  state = { ...initialState };
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore storage errors
  }
}

function ensureProgressRoot() {
  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.id = 'request-brand-progress-container';
    document.body.appendChild(progressContainer);
    progressRoot = createRoot(progressContainer);
  }
}

function unmountProgressAlert() {
  if (progressRoot && progressContainer) {
    progressRoot.unmount();
    if (progressContainer.parentNode) {
      progressContainer.parentNode.removeChild(progressContainer);
    }
  }
  progressRoot = null;
  progressContainer = null;
}

function clearPhaseAnimation() {
  if (progressIntervalId) {
    window.clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
}

function handleProgressClose() {
  clearPhaseAnimation();
  unmountProgressAlert();
  clearState();
  if (requestStateListener) {
    requestStateListener(false);
  }
}

function renderProgressAlert() {
  if (!state.backloadId) {
    return;
  }

  ensureProgressRoot();
  if (!progressRoot) {
    return;
  }

  progressRoot.render(
    <RequestBrandProgressAlert
      phase={state.progressPhase}
      progress={state.progressValue}
      canClose={state.canCloseProgress}
      onClose={handleProgressClose}
      pageId={state.pageId}
      hasAds={state.hasProcessedAds}
    />
  );
}

function startPhaseAnimation(phase) {
  clearPhaseAnimation();

  if (phase !== 'searching' && phase !== 'saving') {
    return;
  }

  const duration = phase === 'searching' ? SEARCH_DURATION_MS : SAVE_DURATION_MS;
  const minValue = phase === 'searching' ? 0 : 50;
  const maxValue = phase === 'searching' ? 45 : 95;
  const startTime = Date.now();

  progressIntervalId = window.setInterval(() => {
    const elapsed = Date.now() - startTime;
    const fraction = Math.min(1, elapsed / duration);
    const next = minValue + (maxValue - minValue) * fraction;
    const rounded = Math.round(next);

    if (rounded > state.progressValue && state.progressValue < maxValue) {
      state.progressValue = Math.min(maxValue, rounded);
      persistState();
      renderProgressAlert();
    }

    if (state.progressValue >= maxValue) {
      clearPhaseAnimation();
    }
  }, 1000);
}

function closeEventSource() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function initSSE() {
  if (!state.backloadId || eventSource) {
    return;
  }

  eventSource = new EventSource('/ads/sse/adrequest-updates/');

  eventSource.addEventListener('backload_fetch_completed', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.backload_id === state.backloadId) {
        state.progressPhase = 'saving';
        state.progressValue = Math.max(state.progressValue, 50);
        persistState();
        startPhaseAnimation('saving');
        renderProgressAlert();
      }
    } catch (e) {
      // Ignore parse errors for unrelated events
    }
  });

  eventSource.addEventListener('backload_completed', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.backload_id === state.backloadId) {
        closeEventSource();
        clearPhaseAnimation();

        if (data.processed_count && data.processed_count > 0) {
          state.hasProcessedAds = true;
          if (data.page_id) {
            state.pageId = data.page_id;
          }
        } else {
          state.hasProcessedAds = false;
        }

        state.progressPhase = 'done';
        state.progressValue = 100;
        state.canCloseProgress = true;

        persistState();
        renderProgressAlert();

        if (requestStateListener) {
          requestStateListener(false);
        }
      }
    } catch (e) {
      // Ignore parse errors for unrelated events
    }
  });

  eventSource.onerror = () => {
    closeEventSource();
    clearPhaseAnimation();
    handleProgressClose();
  };
}

export function startRequestBrandProgress({ backloadId, pageId }) {
  if (!backloadId) {
    return;
  }

  state.backloadId = backloadId;
  state.pageId = pageId || null;
  state.hasProcessedAds = false;
  state.progressPhase = 'searching';
  state.progressValue = 0;
  state.canCloseProgress = false;

  persistState();
  renderProgressAlert();
  startPhaseAnimation('searching');
  initSSE();

  if (requestStateListener) {
    requestStateListener(true);
  }
}

export function resumeRequestBrandProgressIfNeeded() {
  const stored = loadStateFromStorage();
  if (!stored || !stored.backloadId) {
    return;
  }

  state = {
    ...state,
    ...stored,
  };

  if (requestStateListener) {
    const inProgress = !!(
      state.backloadId &&
      (state.progressPhase === 'searching' || state.progressPhase === 'saving')
    );

    requestStateListener(inProgress);
  }

  renderProgressAlert();

  if (state.progressPhase === 'searching' || state.progressPhase === 'saving') {
    startPhaseAnimation(state.progressPhase);
    initSSE();
  }
}

export function setRequestBrandStateListener(listener) {
  requestStateListener = listener;

  if (!requestStateListener) {
    return;
  }

  const inProgress = !!(
    state.backloadId &&
    (state.progressPhase === 'searching' || state.progressPhase === 'saving')
  );

  requestStateListener(inProgress);
}
