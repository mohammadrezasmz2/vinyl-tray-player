'use strict';

// Closing Vinyl's window normally hides it in the tray. During a Windows
// shutdown, restart or logoff, the OS must be allowed to close it instead.
function installWindowLifecycle(win, app) {
  let isQuitting = false;
  let quitRequested = false;
  const markQuitting = () => { isQuitting = true; };
  const requestQuit = () => {
    if (quitRequested) return;
    quitRequested = true;
    markQuitting();
    app.quit();
  };

  win.on('close', event => {
    if (isQuitting) return;
    event.preventDefault();
    win.hide();
  });

  // On Windows, app's 'before-quit' is NOT emitted for shutdown/logoff.
  // Mark the window as closing as soon as Windows queries the session end,
  // then request a clean exit once shutdown is committed.
  win.on('query-session-end', markQuitting);
  win.on('session-end', requestQuit);
  app.on('before-quit', markQuitting);

  return { requestQuit };
}

module.exports = { installWindowLifecycle };
