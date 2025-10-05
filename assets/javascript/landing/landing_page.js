function initializeLandingPageTabs() {
  const tabButtonsContainer = document.querySelector('[data-tab-buttons]');
  const tabContentContainer = document.querySelector('[data-tab-content]');

  if (!tabButtonsContainer || !tabContentContainer) return;

  const buttons = Array.from(tabButtonsContainer.querySelectorAll('button'));
  const panels = Array.from(tabContentContainer.querySelectorAll('[data-tab-panel]'));

  function switchTab(tabId) {
    // Update button styles
    buttons.forEach(button => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle('bg-white', isActive);
      button.classList.toggle('shadow-sm', isActive);
    });

    // Show/hide panels
    panels.forEach(panel => {
      const isPanelActive = panel.dataset.tabPanel === tabId;
      panel.classList.toggle('hidden', !isPanelActive);
    });
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Set initial state based on the first button
  if (buttons.length > 0) {
    // Don't switchTab on init, just style the buttons, since the HTML is already correct
    buttons.forEach(button => {
      const isActive = button.dataset.tab === 'generation';
      button.classList.toggle('bg-white', isActive);
      button.classList.toggle('shadow-sm', isActive);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  function checkAndMount() {
    if (window.baseLayoutReady) {
      initializeLandingPageTabs();
    } else {
      setTimeout(checkAndMount, 50);
    }
  }
  checkAndMount();
});
