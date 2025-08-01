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
        label.textContent = `AI Assistant (${taskCount})`;
    }
}

function connectWebSocket(icon) {
    let userId = JSON.parse(localStorage.getItem("gcucc-ui-auth-token")).userId;
    const wsUrl = "ws://localhost:3001?userId=" + userId;

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
            let parts = message.data.split("==");

            if (parts.length < 2) return;

            type = parts[0];
            text = parts[parts.length - 1];
            showThoughtBubble(text, undefined, type);

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
        } else if(message.type == 'transcription'){
                showTranscriptionBubble(message.data);
                console.log("message from server:transcription= " + message.data);
        }else {
            console.log("message from server does not supported type");
        }
    };

    transcriptionTimeout = null;

    function showTranscriptionBubble(transcriptionText) {
        // Find the target wrapper (.roster-card)
        const rosterCard = document.querySelector(".left-chat-rail .interactions .interaction-group-wrapper .roster-card");
        if (!rosterCard) return;

        // Remove existing transcription bubble if any
        let oldBubble = document.querySelector("#ai-transcription-bubble");
        if (oldBubble) oldBubble.remove();

        // Create the bubble
        const bubble = document.createElement("div");
        bubble.id = "ai-transcription-bubble";
        bubble.style.position = "absolute";
        bubble.style.zIndex = "1000";
        bubble.style.background = "#fff";
        bubble.style.border = "2px solid #0078d7";
        bubble.style.borderRadius = "12px";
        bubble.style.boxShadow = "0 2px 12px rgba(0,0,0,0.10)";
        bubble.style.padding = "8px 14px";
        bubble.style.fontSize = "13px";
        bubble.style.maxWidth = "340px";
        bubble.style.whiteSpace = "pre-line";
        bubble.style.opacity = "1";
        bubble.style.transition = "opacity 0.5s, transform 0.5s";
        bubble.style.pointerEvents = "none";
        bubble.innerHTML = `
            <div style="font-weight:600; margin-bottom:2px; color:#0078d7;">Live Transcription</div>
            <div class="bubble-text">${transcriptionText}</div>
            <div class="bubble-arrow"></div>
        `;

        // Arrow styling
        const arrow = bubble.querySelector(".bubble-arrow");
        arrow.style.position = "absolute";
        arrow.style.left = "-13px";
        arrow.style.top = "28px";
        arrow.style.width = "0";
        arrow.style.height = "0";
        arrow.style.borderTop = "10px solid transparent";
        arrow.style.borderBottom = "10px solid transparent";
        arrow.style.borderRight = "13px solid #fff";
        arrow.style.filter = "drop-shadow(-1px 0px 0px #0078d7)";

        // Position bubble beside roster-card
        const rect = rosterCard.getBoundingClientRect();
        bubble.style.top = (window.scrollY + rect.top + 5) + "px";
        bubble.style.left = (window.scrollX + rect.right + 16) + "px";
        bubble.style.minHeight = rect.height * 0.6 + "px";

        // Add to document
        document.body.appendChild(bubble);

        // Handle fadeout
        if (transcriptionTimeout) clearTimeout(transcriptionTimeout);
        transcriptionTimeout = setTimeout(() => {
            bubble.style.opacity = "0";
            bubble.style.transform = "translateX(20px)";
            setTimeout(() => bubble.remove(), 500);
        }, 5000);
    }



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

    const typeStyles = {
        info: { color: "#e0f7fa", border: "#00acc1", title: "💬" },
        clarify: { color: "#e0f7fa", border: "#00acc1", title: "💬" },
        empathize: { color: "#fce4ec", border: "#d81b60", title: "💓" },
        upsell: { color: "#f3e5f5", border: "#8e24aa", title: "💼" },
        escalate: { color: "#ffebee", border: "#e53935", title: "⚠️" },
        confirm: { color: "#e8f5e9", border: "#43a047", title: "✅" },
    };

    const style = typeStyles[type] || { color: "#e3f2fd", border: "#2196f3", title: "ℹ️" };


    const interactionsWrapper = document.querySelector(".left-chat-rail .interactions");
    let agentCoachingGroup = document.querySelector(".left-chat-rail .interactions .interaction-group .agent-coaching");

    injectInsightsSection(interactionsWrapper);

    // 1️⃣ Create .agent-coaching container if not present
    if (interactionsWrapper && !agentCoachingGroup) {
        const wrapper = document.createElement("div");
        wrapper.className = "interaction-group-wrapper agent-coaching";
        wrapper.style.maxHeight = "345px";
        wrapper.style.overflowY = "auto";
        wrapper.style.padding = "8px";
        wrapper.style.border = "1px solid #ccc";

        wrapper.innerHTML = `
            <div class="interaction-group-header" style="position: sticky; top: 0; background: #deeaff; z-index: 5; display: flex; justify-content: space-between; align-items: center; padding: 8px;border-radius:5px">
                <div role="heading" aria-level="3" tabindex="-1" id="interactionGroupHeading" class="header-text">
                    <div id="ember3292" class="participant-name ember-view">
                        <span aria-label="AI Assistant">AI Assistant</span>
                    </div>
                </div>
                <div style="cursor: pointer;" id="refresh-icon" title="Refresh AI Assistant">🔄</div>
            </div>`;

        const refreshIcon = wrapper.querySelector("#refresh-icon");
        refreshIcon.addEventListener("click", () => {
            refreshAssistant();
        });

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
        persistentBubble.style.background = isTask ? "#fff4b8" : style.color; // yellow for task, blue for info
        persistentBubble.style.borderLeft = isTask ? "5px solid orange" : "5px solid " + style.border;
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
        iconSpan.textContent = isTask ? "📌" : style.title;

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
}


function refreshAssistant(){
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "action", action: "TRIGGER_MODEL" }));
    } else {
        console.warn("WebSocket is not open");
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
                        <span style="width: 45px; display: inline-block;">Intent:</span>
                        <span class="value" style="transition: all 0.3s ease; font-weight: 600; color: #0078d7;">N/A</span>
                    </div>
                     <div class="insight-row" data-key="emotions">
                        <span style="width: 65px; display: inline-block;">Emotions:</span>
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


