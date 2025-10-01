/**
 * Simple regeneratorRuntime polyfill for async/await support
 * This provides the minimal functionality needed for the admin panel
 */

if (typeof regeneratorRuntime === 'undefined') {
  // Simple regenerator runtime implementation for async/await
  window.regeneratorRuntime = {
    mark: function(fn) {
      return fn;
    },
    wrap: function(fn, mark) {
      return fn;
    },
    async: function(fn, self, args) {
      return Promise.resolve(fn.apply(self, args));
    }
  };
}