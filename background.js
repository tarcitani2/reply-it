chrome.action.onClicked.addListener(async () => {
  const extensionUrl = chrome.runtime.getURL("index.html");
  const tabs = await chrome.tabs.query({ url: extensionUrl });
  if (tabs.length > 0) {
    // Foca na aba existente
    chrome.tabs.update(tabs[0].id, { active: true });
    chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: extensionUrl });
  }
});
