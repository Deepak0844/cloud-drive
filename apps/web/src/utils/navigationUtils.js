/**
 * Navigation Utilities.
 *
 * Provides a global way to navigate outside of React components
 * (e.g., in Redux middleware or utility functions).
 */

let navigate = null;

/**
 * Set the global navigator instance.
 * Call this in a top-level component (e.g., App or Routes).
 */
function setGlobalNavigator(navigateFn) {
  navigate = navigateFn;
}

/**
 * Global navigate function.
 */
function globalNavigate(to, options) {
  if (navigate) {
    navigate(to, options);
  } else {
    // Fallback to window.location if navigate is not yet initialized
    window.location.href = to;
  }
}

const Navigation = {
  setGlobalNavigator,
  globalNavigate,
};

export default Navigation;
