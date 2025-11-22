const DEFAULT_LIMIT_MINUTES = 30;
const TRACKING_ALARM_NAME = "YT_TIME_GUARDIAN_TICK";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function ensureState(callback) {
  chrome.storage.sync.get(
    ["dailyLimitMinutes", "isEnabled", "todayDate", "usedMinutes"],
    (data) => {
      let {
        dailyLimitMinutes,
        isEnabled,
        todayDate,
        usedMinutes
      } = data;

      if (typeof dailyLimitMinutes !== "number") {
        dailyLimitMinutes = DEFAULT_LIMIT_MINUTES;
      }
      if (typeof isEnabled !== "boolean") {
        isEnabled = true;
      }
      const today = getTodayString();
      if (todayDate !== today) {
        todayDate = today;
        usedMinutes = 0;
      }
      if (typeof usedMinutes !== "number") {
        usedMinutes = 0;
      }

      const newState = {
        dailyLimitMinutes,
        isEnabled,
        todayDate,
        usedMinutes
      };

      chrome.storage.sync.set(newState, () => callback(newState));
    }
  );
}

function startAlarm() {
  chrome.alarms.create(TRACKING_ALARM_NAME, {
    periodInMinutes: 1
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureState(() => {});
  startAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  startAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== TRACKING_ALARM_NAME) return;

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) return;
    const url = tab.url;
    const isYouTube =
      /^https?:\/\/(www\.)?youtube\.com/.test(url) ||
      /^https?:\/\/m\.youtube\.com/.test(url);
    if (!isYouTube) return;

    ensureState((state) => {
      if (!state.isEnabled) return;

      const usedMinutes = (state.usedMinutes || 0) + 1;
      const todayDate = getTodayString();

      const newState = {
        dailyLimitMinutes: state.dailyLimitMinutes,
        isEnabled: state.isEnabled,
        todayDate,
        usedMinutes
      };

      chrome.storage.sync.set(newState, () => {
        if (usedMinutes >= state.dailyLimitMinutes) {
          // attempt to ensure content script is present, then block
          try {
            chrome.scripting.executeScript(
              {
                target: { tabId: tab.id },
                files: ["content.js"]
              },
              () => {
                chrome.tabs.sendMessage(tab.id, {
                  type: "BLOCK_YOUTUBE",
                  usedMinutes,
                  dailyLimitMinutes: state.dailyLimitMinutes
                });
              }
            );
          } catch (e) {
            chrome.tabs.sendMessage(tab.id, {
              type: "BLOCK_YOUTUBE",
              usedMinutes,
              dailyLimitMinutes: state.dailyLimitMinutes
            });
          }
        } else {
          // soft tick if we ever want to react in content
          chrome.tabs.sendMessage(tab.id, {
            type: "TIME_TICK",
            usedMinutes,
            dailyLimitMinutes: state.dailyLimitMinutes
          });
        }
      });
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    ensureState((state) => {
      sendResponse(state);
    });
    return true;
  }

  if (message.type === "SET_LIMIT") {
    const newLimit = Number(message.dailyLimitMinutes);
    if (!Number.isFinite(newLimit) || newLimit <= 0) {
      sendResponse({ ok: false, error: "Invalid limit" });
      return;
    }
    chrome.storage.sync.set({ dailyLimitMinutes: newLimit }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "SET_ENABLED") {
    chrome.storage.sync.set({ isEnabled: Boolean(message.isEnabled) }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "RESET_TODAY") {
    const today = getTodayString();
    chrome.storage.sync.set({ todayDate: today, usedMinutes: 0 }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "CHECK_SHOULD_BLOCK") {
    ensureState((state) => {
      const shouldBlock =
        state.isEnabled && state.usedMinutes >= state.dailyLimitMinutes;
      sendResponse({
        shouldBlock,
        usedMinutes: state.usedMinutes,
        dailyLimitMinutes: state.dailyLimitMinutes
      });
    });
    return true;
  }
});
