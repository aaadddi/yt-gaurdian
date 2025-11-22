const YTG_OVERLAY_ID = "yt_time_guardian_overlay";

// ---- Helpers ----
let ytObserver = null;


function playBeep(intense = false) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = intense ? 720 : 540;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    // audio might fail before user gesture; safe to ignore
  }
}

function pickQuote(used, limit) {
  const percent = limit > 0 ? used / limit : 0;
  const quotes = [
    "Small consistent control beats big bursts of discipline.",
    "You’re not quitting YouTube, you’re just reclaiming your time.",
    "Future you will be proud of this moment.",
    "Every minute you save here can be invested in your goals.",
    "You’re stronger than the algorithm.",
    "Less scrolling, more building."
  ];

  if (percent >= 1) {
    return "Time’s up. Give your brain the rest it deserves.";
  } else if (percent >= 0.8) {
    return "You’re close to your limit — choose wisely what you watch next.";
  } else if (percent >= 0.5) {
    return "You’re halfway there. Stay intentional, not impulsive.";
  }
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function removeOverlay() {
  const existing = document.getElementById(YTG_OVERLAY_ID);
  if (existing) existing.remove();
}

function createOverlay(innerHtml) {
  removeOverlay();

  const root = document.createElement("div");
  root.id = YTG_OVERLAY_ID;
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "2147483647";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.backdropFilter = "blur(18px)";
  root.style.background =
    "radial-gradient(circle at top, rgba(56,189,248,0.25), transparent 55%), " +
    "radial-gradient(circle at bottom, rgba(129,140,248,0.25), rgba(15,23,42,0.95))";
  root.style.animation = "ytg-fade-in 0.25s ease-out";
  root.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  root.innerHTML = `
    <style>
      @keyframes ytg-fade-in {
        from { opacity: 0; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes ytg-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }
      .ytg-card {
        width: 320px;
        max-width: 90vw;
        background: linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9));
        border-radius: 22px;
        border: 1px solid rgba(148,163,184,0.5);
        box-shadow: 0 22px 45px rgba(15,23,42,0.85);
        padding: 22px 22px 18px;
        color: #e5e7eb;
        text-align: center;
        animation: ytg-pulse 2.4s ease-in-out infinite;
      }
      .ytg-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .ytg-sub {
        font-size: 13px;
        opacity: 0.75;
        margin-bottom: 10px;
      }
      .ytg-usage {
        font-size: 14px;
        margin-bottom: 6px;
        opacity: 0.95;
      }
      .ytg-quote {
        font-size: 12px;
        opacity: 0.75;
        font-style: italic;
        margin-top: 4px;
        margin-bottom: 10px;
      }
      .ytg-buttons {
        margin-top: 10px;
        display: flex;
        justify-content: center;
        gap: 8px;
      }
      .ytg-btn {
        border-radius: 999px;
        padding: 8px 16px;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      }
      .ytg-btn-primary {
        background: linear-gradient(135deg, #38bdf8, #6366f1);
        color: white;
      }
      .ytg-btn-secondary {
        background: rgba(15,23,42,0.9);
        color: #e5e7eb;
        border: 1px solid rgba(148,163,184,0.7);
      }
      .ytg-countdown {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 4px;
      }
      .ytg-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid rgba(56,189,248,0.8);
        color: #bae6fd;
        background: rgba(15,23,42,0.9);
        margin-bottom: 6px;
      }
      .ytg-ring-wrap {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 4px auto 10px;
      }
      .ytg-ring-bg {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 20%, rgba(248,250,252,0.45), transparent 55%);
      }
      .ytg-ring {
        position: absolute;
        inset: 8px;
        border-radius: 50%;
      }
      .ytg-ring-inner {
        position: absolute;
        inset: 24px;
        border-radius: 50%;
        background: rgba(15,23,42,0.96);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 600;
      }
    </style>
    <div class="ytg-card">
      ${innerHtml}
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

// ---- UI Modes ----
function showEntryPrompt(used, limit, blocked) {

  const safeLimit = limit > 0 ? limit : 30;
  const percent = Math.max(0, Math.min(100, Math.round((used / safeLimit) * 100)));
  const quote = pickQuote(used, safeLimit);

  const modeLabel = blocked ? "limit reached" : "check-in";
  const cardHtml = `
    <div class="ytg-chip">YouTube Time Guardian · ${modeLabel}</div>
    <div class="ytg-ring-wrap">
      <div class="ytg-ring-bg"></div>
      <div class="ytg-ring" style="background:
        conic-gradient(#38bdf8 ${percent}%, rgba(30,64,175,0.35) ${percent}%);
      "></div>
      <div class="ytg-ring-inner">${percent}%</div>
    </div>
    <div class="ytg-title">${blocked ? "Time’s up for today." : "Are you sure you want YouTube?"}</div>
    <div class="ytg-sub">
      ${blocked
        ? `You’ve used ${used} / ${safeLimit} minutes today.`
        : "Pause for a second. Do you really want to open YouTube right now?"}
    </div>
    <div class="ytg-usage">${used} / ${safeLimit} minutes used today</div>
    <div class="ytg-quote">${quote}</div>
    <div class="ytg-buttons">
      ${blocked
        ? `<button class="ytg-btn ytg-btn-secondary" data-action="close">Close YouTube</button>`
        : `<button class="ytg-btn ytg-btn-secondary" data-action="back">No, take me back</button>
           <button class="ytg-btn ytg-btn-primary" data-action="continue">Yes, I’m sure</button>`}
    </div>
    ${blocked
      ? `<div class="ytg-countdown">Come back tomorrow with fresh energy.</div>`
      : `<div class="ytg-countdown">Sit with the urge for <span id="ytg-count">5</span>s before you decide.</div>`}
  `;

  const root = createOverlay(cardHtml);
  playBeep(blocked || percent >= 80);

  const countEl = root.querySelector("#ytg-count");
  let remaining = 5;
  if (!blocked && countEl) {
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        countEl.textContent = "0";
      } else {
        countEl.textContent = String(remaining);
      }
    }, 1000);
  }

  const backBtn = root.querySelector("[data-action='back']");
  const contBtn = root.querySelector("[data-action='continue']");
  const closeBtn = root.querySelector("[data-action='close']");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      try {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "https://www.google.com/";
        }
      } catch (e) {
        window.location.href = "https://www.google.com/";
      }
    });
  }

  if (contBtn) {
  contBtn.addEventListener("click", () => {
  removeOverlay();
});
  

    }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      try {
        window.location.href = "https://www.google.com/";
      } catch (e) {
        window.close();
      }
    });
  }
}

// ---- Init on each YouTube load ----
function initGuardian() {
   chrome.runtime.sendMessage({ type: "CHECK_SHOULD_BLOCK" }, (res) => {
    if (chrome.runtime.lastError) {
      return;
    }
    const used = res?.usedMinutes || 0;
    const limit = res?.dailyLimitMinutes || 30;
    const blocked = !!res?.shouldBlock;
    showEntryPrompt(used, limit, blocked);
  });
}

// listen for hard block from background when limit reached mid-session
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "BLOCK_YOUTUBE") {
    const used = message.usedMinutes || 0;
    const limit = message.dailyLimitMinutes || 30;
    showEntryPrompt(used, limit, true);
  }
  // TIME_TICK is available if we ever want to react every minute
});

// run on load
initGuardian();
