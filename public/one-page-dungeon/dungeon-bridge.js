// Dungeon Generator Bridge
// Intercepts PNG saves and sends them to parent window

(function () {
  'use strict';

  // Store original saveAs function
  const originalSaveAs = window.saveAs;

  // Override saveAs to intercept PNG saves
  window.saveAs = function (blob, filename, options) {
    // Check if this is a PNG file
    if (blob.type === 'image/png' || (filename && filename.endsWith('.png'))) {
      // Convert blob to data URL
      const reader = new FileReader();
      reader.onloadend = function () {
        const imageData = reader.result;

        // Send to parent window
        if (window.parent !== window) {
          window.parent.postMessage(
            {
              type: 'DUNGEON_PNG_GENERATED',
              data: {
                imageData: imageData,
                filename: filename,
                timestamp: Date.now(),
              },
            },
            '*',
          );
        }
      };
      reader.readAsDataURL(blob);

      // Also allow the original save to proceed
      if (originalSaveAs) {
        originalSaveAs.call(window, blob, filename, options);
      }
    } else {
      // Not a PNG, use original saveAs
      if (originalSaveAs) {
        originalSaveAs.call(window, blob, filename, options);
      }
    }
  };

  console.log(
    'Dungeon Generator Bridge loaded - PNG saves will be intercepted',
  );
})();
