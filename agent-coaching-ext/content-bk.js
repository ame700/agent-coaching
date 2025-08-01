let ws = null;
let isConnected = false;

function createIconButton() {
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icon-off.png");
    icon.style.width = "45px";
    icon.style.height = "45px";
    icon.style.cursor = "pointer";
    icon.style.marginTop = "7px";
    icon.title = "Agent coaching is offline";

    icon.addEventListener("click", () => {
        if (isConnected) {
            ws.close();
        } else {
            connectWebSocket(icon);
        }
    });

    return icon;
}

let taskCount = 0;
function updateTaskCountLabel() {
    const label = document.querySelector(".agent-coaching .participant-name span");
    if (label) {
        label.textContent = `AI Coaching (${taskCount})`;
    }
}

function connectWebSocket(icon) {
    let userId = JSON.parse(localStorage.getItem("gcucc-ui-auth-token")).userId;
    const wsUrl = "ws://localhost:8081?userId=" + userId;

    ws = new WebSocket(wsUrl, []);

    ws.onopen = () => {
        console.log("WebSocket connected");
        isConnected = true;
        icon.src = chrome.runtime.getURL("icon-on.png");
        icon.title = "Agent coaching is online";
    };

    ws.onmessage = (event) => {
        console.log("Message from server:", event.data);
        let message = JSON.parse(event.data);
        if (message.type == 'message') {
            let text = message.data;
            let id = undefined;
            let type = undefined;
            if (message.data.includes("INFO") || message.data.includes("TASK")) {
                let parts = message.data.split("==");

                if (parts.length < 2) return;

                id = parts[0];
                text = parts[parts.length - 1];
                type = parts[0].split("-")[0];
            }
            showThoughtBubble(text, id, type);

        } if (message.type == 'tip') {
            let text = message.data;
            let type = undefined;
            if (message.data.includes("tip")) {
                let parts = message.data.split("==");

                if (parts.length < 2) return;

                type = parts[0];
                text = parts[parts.length - 1];
            }
            showThoughtBubble(text, id, type);

        }else if (message.type == 'action') {
            if (message.data.code == 'COMP_TASK') {
                markTaskAsDone(message.data.ref);
            } else if (message.data.code == 'UPDATE_INSIGHTS') {
                let insights = JSON.parse(message.data.ref);
                updateInsight("intent", insights.intent);
                updateInsight("emotions", insights.emotions);
            } else if (message.data.code == 'HIGH_MESSAGE') {
                highlightThoughtBubble(message.data.ref);
            } else {
                console.log("message from server with type 'action' does not supported code");
            }
        } else {
            console.log("message from server does not supported type");
        }
    };



    ws.onclose = () => {
        console.log("WebSocket closed");
        isConnected = false;
        icon.src = chrome.runtime.getURL("icon-off.png");
        icon.title = "Agent coaching is offline";
    };

    ws.onerror = (err) => {
        console.error("WebSocket error", err);
        ws.close();
    };
}

function injectIcon() {
    const observer = new MutationObserver(() => {
        console.log("Checking for .ul.navigation-action-bar");

        const topbar = document.querySelector(".topbar");
        const alerts = document.querySelector(".topbar .right-container");

        if (topbar && !document.getElementById("ai-bot-icon")) {
            console.log("Injecting AI bot icon");
            const icon = createIconButton();
            icon.id = "ai-bot-icon";
            topbar.insertBefore(icon, alerts);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}


function markTaskAsDone(id) {
    if (!id) return;

    const bubble = document.querySelector(`.persistent-bubble#${CSS.escape(id)}`);
    if (!bubble) {
        console.warn(`No bubble found with id: ${id}`);
        return;
    }

    // Visual feedback (checkmark + fade effect)
    bubble.style.transition = "opacity 1s ease, transform 0.5s ease, background-color 0.5s ease";
    bubble.style.backgroundColor = "#e0ffe0"; // light green to show task completed
    bubble.style.borderLeft = "5px solid green";
    bubble.style.opacity = "0.8";
    bubble.style.transform = "scale(0.98)";

    // Add ✅ icon to text if not already there
    const span = bubble.querySelector("span");
    if (span && !span.textContent.includes("✅")) {
        span.textContent += " ✅";
        span.style.textDecoration = "line-through";
        span.style.color = "#4CAF50";
    }
    taskCount = Math.max(0, taskCount - 1);
    updateTaskCountLabel();

    // Auto-remove after short delay
    setTimeout(() => {
        bubble.style.opacity = "0";
        bubble.style.transform = "scale(0.95)";
        setTimeout(() => {
            if (bubble && bubble.parentNode) {
                bubble.remove();
            }
        }, 500);
    }, 3000);
}


let bubbleTimeout = null;


function showThoughtBubble(message, id, type) {
    const icon = document.getElementById("ai-bot-icon");
    const acdInteractions = document.querySelector("ul.navigation-action-bar > li.acd-interactions");
    const isActive = acdInteractions?.classList.contains("active");

    const interactionsWrapper = document.querySelector(".left-chat-rail .interactions");
    let agentCoachingGroup = document.querySelector(".left-chat-rail .interactions .interaction-group .agent-coaching");

    injectInsightsSection(interactionsWrapper);

    // 1️⃣ Create .agent-coaching container if not present
    if (interactionsWrapper && !agentCoachingGroup) {
        const wrapper = document.createElement("div");
        wrapper.className = "interaction-group-wrapper agent-coaching";
        wrapper.style.maxHeight = "430px";
        wrapper.style.overflowY = "auto";
        wrapper.style.padding = "8px";
        wrapper.style.border = "1px solid #ccc";
        wrapper.innerHTML = `<div class="interaction-group-header">
                <div role="heading" aria-level="3" tabindex="-1" id="interactionGroupHeading" class="header-text">
                    <div id="ember3292" class="participant-name ember-view"><span aria-label="Mobile Number, United Arab Emirates">AI Coaching</span></div>
                </div>
            </div>`;
        const interactionGroup = interactionsWrapper.querySelector(".interaction-group");
        if (interactionGroup) {
            interactionGroup.appendChild(wrapper);
            agentCoachingGroup = wrapper;
        }
    }

    // 2️⃣ Always add message bubble inside agent-coaching (persistent, no close, no fadeout)
    if (agentCoachingGroup) {
        const persistentBubble = document.createElement("div");
        persistentBubble.className = "persistent-bubble";
        persistentBubble.id = id ?? '';
        persistentBubble.dataset.type = type;

        // Styling by type
        const isTask = type === "TASK";
        persistentBubble.style.background = isTask ? "#fff4b8" : "#d9f0ff"; // yellow for task, blue for info
        persistentBubble.style.borderLeft = isTask ? "5px solid orange" : "5px solid #2196f3";
        persistentBubble.style.borderRadius = "10px";
        persistentBubble.style.padding = "8px 12px";
        persistentBubble.style.boxShadow = "0px 2px 6px rgba(0, 0, 0, 0.2)";
        persistentBubble.style.fontSize = "12px";
        persistentBubble.style.maxWidth = "400px";
        persistentBubble.style.marginBottom = "8px";
        persistentBubble.style.display = "flex";
        persistentBubble.style.alignItems = "start";
        persistentBubble.style.gap = "6px";

        // Icon
        const iconSpan = document.createElement("span");
        iconSpan.style.fontSize = "16px";
        iconSpan.style.marginTop = "2px";
        iconSpan.textContent = isTask ? "📌" : "ℹ️";

        // Message
        const textSpan = document.createElement("span");
        textSpan.innerHTML = message;

        // Compose
        persistentBubble.appendChild(iconSpan);
        persistentBubble.appendChild(textSpan);

        agentCoachingGroup.appendChild(persistentBubble);
        if (isTask) {
            taskCount++;
            updateTaskCountLabel();
        }
        agentCoachingGroup.scrollTop = agentCoachingGroup.scrollHeight;

        if (isTask) {
            let overlayClicked = false;
            const overlay = document.createElement("div");
            overlay.textContent = "Click to complete";
            overlay.style = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.4);
                color: white;
                display: none;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                font-weight: bold;
                font-size: 14px;
                z-index: 10;
                cursor: pointer;
            `;

            persistentBubble.style.position = "relative";
            persistentBubble.appendChild(overlay);

            persistentBubble.addEventListener("mouseenter", () => {
                if (!overlayClicked) {
                    overlay.style.display = "flex";
                    overlay.style.pointerEvents = "auto";
                }
            });

            persistentBubble.addEventListener("mouseleave", () => {
                overlay.style.display = "none";
                overlay.style.pointerEvents = "none";
            });

            persistentBubble.addEventListener("click", () => {
                overlayClicked = true;
                overlay.style.display = "none";
                overlay.style.pointerEvents = "none";
                markTaskAsDone(id);
            });
        }

    }

    // 3️⃣ If acd-interactions is NOT active, also show a floating bubble with fadeout
    if (!isActive) {
        if (icon) {
            icon.src = chrome.runtime.getURL("icon-talking.png");
            icon.title = "Talking";
        }

        let bubble = document.getElementById("ai-thought-bubble");
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.id = "ai-thought-bubble";
            bubble.style.position = "absolute";
            bubble.style.background = "#fff4b8";
            bubble.style.borderRadius = "10px";
            bubble.style.padding = "8px 12px";
            bubble.style.boxShadow = "0px 2px 6px rgba(0, 0, 0, 0.2)";
            bubble.style.fontSize = "12px";
            bubble.style.maxWidth = "400px";
            bubble.style.zIndex = 9999;
            bubble.style.transition = "opacity 0.8s ease, transform 0.8s ease";
            bubble.style.opacity = "1";
            bubble.style.pointerEvents = "auto";
            bubble.style.transform = "scale(1)";

            const span = document.createElement("span");
            span.innerHTML = message;
            bubble.appendChild(span);

            const closeBtn = document.createElement("div");
            closeBtn.textContent = "×";
            closeBtn.style.position = "absolute";
            closeBtn.style.top = "4px";
            closeBtn.style.right = "6px";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.fontWeight = "bold";
            closeBtn.style.fontSize = "14px";
            closeBtn.style.color = "#555";
            closeBtn.addEventListener("click", () => {
                bubble.remove();
                clearTimeout(bubbleTimeout);
                if (icon && isConnected) {
                    icon.src = chrome.runtime.getURL("icon-on.png");
                    icon.title = "Agent coaching is online";
                }
            });
            bubble.appendChild(closeBtn);

            const arrow = document.createElement("div");
            arrow.style.position = "absolute";
            arrow.style.top = "10px";
            arrow.style.right = "-10px"; // arrow attached to the right edge
            arrow.style.width = "0";
            arrow.style.height = "0";
            arrow.style.borderTop = "8px solid transparent";
            arrow.style.borderBottom = "8px solid transparent";
            arrow.style.borderLeft = "10px solid #fff4b8"; // ⬅ this points it right
            arrow.style.boxShadow = "-1px 1px 4px rgba(0,0,0,0.1)"; // shadow from left
            bubble.appendChild(arrow);

            document.body.appendChild(bubble);

            bubble.addEventListener("mouseenter", () => {
                clearTimeout(bubbleTimeout);
                bubble.style.opacity = "1";
                bubble.style.transform = "scale(1)";
            });

            bubble.addEventListener("mouseleave", () => {
                scheduleBubbleFadeOut(bubble);
            });
        } else {
            const span = bubble.querySelector("span");
            if (span) span.textContent = message;
        }

        const iconRect = icon.getBoundingClientRect();
        bubble.style.top = `${window.scrollY + iconRect.top}px`;
        bubble.style.left = `${window.scrollX + iconRect.left - bubble.offsetWidth - 10}px`;
        bubble.style.opacity = "1";
        bubble.style.transform = "scale(1)";

        clearTimeout(bubbleTimeout);
        scheduleBubbleFadeOut(bubble);
    }
}



function highlightThoughtBubble(id) {
    const bubble = document.querySelector(`.persistent-bubble#${CSS.escape(id)}`);
    if (!bubble) {
        console.warn("No bubble found for highlight:", id);
        return;
    }

    // Add highlight effect
    bubble.style.transition = "box-shadow 0.5s ease-in-out";
    bubble.style.boxShadow = "0 0 10px 4px rgba(255, 193, 7, 0.8)";

    // Animate pulse
    let pulseCount = 0;
    const maxPulses = 3;

    const pulse = () => {
        if (pulseCount >= maxPulses) {
            bubble.style.boxShadow = ""; // Reset
            return;
        }
        bubble.style.boxShadow = "0 0 10px 4px rgba(255, 193, 7, 0.8)";
        setTimeout(() => {
            bubble.style.boxShadow = "0 0 4px 1px rgba(255, 193, 7, 0.4)";
            setTimeout(() => {
                pulseCount++;
                pulse();
            }, 300);
        }, 300);
    };

    pulse();
}


function injectInsightsSection(interactionsWrapper) {
    if (!document.querySelector(".insights-panel")) {
        const insights = document.createElement("div");
        insights.innerHTML = `
            <div class="interaction-group-wrapper insights-panel" style="margin-bottom: 8px; padding: 10px; border: 1px solid #aaa; border-radius: 8px; background: #f9f9f9;">
                <div class="interaction-group-header" style="font-weight: bold; margin-bottom: 6px;">Insights</div>
                <div style="border-radius: 4px; padding: 10px; background-color: #deeaff;">
                    <div class="insight-row" data-key="intent" style="margin-bottom: 4px;">
                        <span style="width: 80px; display: inline-block;">Intent:</span>
                        <span class="value" style="transition: all 0.3s ease; font-weight: 600; color: #0078d7;">N/A</span>
                    </div>
                     <div class="insight-row" data-key="emotions">
                        <span style="width: 80px; display: inline-block;">Emotions:</span>
                        <span class="value" style="transition: all 0.3s ease; font-weight: 600; color: #0078d7;">N/A</span>
                    </div>
                </div>
            </div>`;
        insights.classList.add("insights-wrapper");
        const interactionGroup = interactionsWrapper.querySelector(".interaction-group");
        if (interactionGroup) {
            const children = interactionGroup.children;
            interactionGroup.appendChild(insights, children[children.length - 1]);
        }
    }
}

function updateInsight(key, newValue) {
    const row = document.querySelector(`.insights-panel .insight-row[data-key="${key}"] .value`);
    if (row && row.textContent !== newValue && newValue !== 'N/A') {
        row.style.opacity = "0.5";
        row.style.transform = "scale(1.05)";
        setTimeout(() => {
            row.textContent = newValue;
            row.style.opacity = "1";
            row.style.transform = "scale(1)";
        }, 200);
    } else {
        console.log("couldn't update Insights ," + row + " , " + row.textContent + " , " + newValue);
    }
}



function scheduleBubbleFadeOut(bubble) {
    bubbleTimeout = setTimeout(() => {
        bubble.style.opacity = "0";
        bubble.style.transform = "scale(0.95)";
        setTimeout(() => {
            if (bubble && bubble.parentNode) {
                bubble.remove();
            }
            const icon = document.getElementById("ai-bot-icon");
            if (icon && isConnected) {
                icon.src = chrome.runtime.getURL("icon-on.png");
                icon.title = "Agent coaching is online";
            }
        }, 500);
    }, 5000);
}


injectIcon();


