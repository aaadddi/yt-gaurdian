function updateUI(state) {
  if (!state) return;
  const enabledCheckbox = document.getElementById("enabled");
  const limitInput = document.getElementById("limit");
  const usedSpan = document.getElementById("used");
  const msg = document.getElementById("message");
  const pill = document.getElementById("status-pill");

  enabledCheckbox.checked = !!state.isEnabled;
  limitInput.value = state.dailyLimitMinutes || 30;
  usedSpan.textContent = state.usedMinutes || 0;

  if (state.isEnabled) {
    pill.textContent = "active";
    pill.style.background = "#22c55e1a";
    pill.style.borderColor = "#22c55e66";
    pill.style.color = "#bbf7d0";
  } else {
    pill.textContent = "paused";
    pill.style.background = "#f973161a";
    pill.style.borderColor = "#f9731666";
    pill.style.color = "#fed7aa";
  }

  const used = state.usedMinutes || 0;
  const limit = state.dailyLimitMinutes || 30;
  const percent = Math.round((used / limit) * 100);

  if (percent >= 100) {
    msg.textContent = "Limit reached — YouTube should be blocked.";
  } else if (percent >= 80) {
    msg.textContent = "Very close to your daily limit. Go easy.";
  } else if (percent >= 50) {
    msg.textContent = "Past halfway. Stay intentional.";
  } else if (percent > 0) {
    msg.textContent = "Nice, you’re in control so far.";
  } else {
    msg.textContent = "Fresh start today. Use wisely.";
  }
}

function loadStatus() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (state) => {
    if (chrome.runtime.lastError) return;
    updateUI(state);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const enabledCheckbox = document.getElementById("enabled");
  const limitInput = document.getElementById("limit");
  const resetButton = document.getElementById("reset");

  loadStatus();

  enabledCheckbox.addEventListener("change", () => {
    chrome.runtime.sendMessage(
      {
        type: "SET_ENABLED",
        isEnabled: enabledCheckbox.checked
      },
      () => loadStatus()
    );
  });

  limitInput.addEventListener("change", () => {
    const val = Number(limitInput.value);
    chrome.runtime.sendMessage(
      { type: "SET_LIMIT", dailyLimitMinutes: val },
      (res) => {
        if (!res || !res.ok) {
          alert("Invalid limit. Please enter a positive number.");
        }
        loadStatus();
      }
    );
  });

  resetButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_TODAY" }, () =>
      loadStatus()
    );
  });
});
