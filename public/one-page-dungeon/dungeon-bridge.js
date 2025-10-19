// Dungeon Generator Bridge
// Intercepts PNG saves and sends them to parent window

(function () {
  'use strict';

  // Wait for the page to fully load before setting up interception
  function initializeBridge() {
    // Store original functions
    const originalSaveAs = window.saveAs;
    const originalOcSavePNG = window.Oc && window.Oc.savePNG;

    // Intercept Oc.savePNG (the actual function called by dungeon generator)
    if (window.Oc && window.Oc.savePNG) {
      window.Oc.savePNG = function (canvas, filename) {
        console.log('Intercepted Oc.savePNG call:', filename);

        // Convert canvas to blob
        canvas.toBlob(function (blob) {
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
        }, 'image/png');

        // Also call original function to maintain normal behavior
        if (originalOcSavePNG) {
          originalOcSavePNG.call(window.Oc, canvas, filename);
        }
      };
    }

    // Keep the original saveAs interception as fallback
    if (window.saveAs) {
      window.saveAs = function (blob, filename, options) {
        if (
          blob.type === 'image/png' ||
          (filename && filename.endsWith('.png'))
        ) {
          const reader = new FileReader();
          reader.onloadend = function () {
            const imageData = reader.result;

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

          if (originalSaveAs) {
            originalSaveAs.call(window, blob, filename, options);
          }
        } else {
          if (originalSaveAs) {
            originalSaveAs.call(window, blob, filename, options);
          }
        }
      };
    }

    console.log(
      'Dungeon Generator Bridge loaded - PNG saves will be intercepted',
    );
  }

  // Initialize bridge after a short delay to ensure dungeon generator is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(initializeBridge, 1000); // Wait 1 second for dungeon generator to initialize
    });
  } else {
    setTimeout(initializeBridge, 1000);
  }
})();
