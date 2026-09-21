'use strict';

function trustedSender(event, window, entryUrl) {
  return !!(window && !window.isDestroyed() && event.sender === window.webContents &&
    event.senderFrame && event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url === entryUrl);
}

module.exports = { trustedSender };
