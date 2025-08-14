const audioFiles = {
    1: './audio/phase1.mp3',  // Q4 2025 - Inbound GoLive
    2: './audio/phase2.mp3',  // Q4 2025 - Proactive Journeys
    3: './audio/phase3.mp3',  // Q1 2026 - New Natural Voice
    4: './audio/phase4.mp3',  // Q1 2026 - Agentic AI IVR
    5: './audio/phase5.mp3',  // Q2 2026 - Outbound AI Calls
    6: './audio/phase6.mp3',  // Q3 2026 - Language Switching
    7: './audio/phase7.mp3',  // Q3 2026 - Agentic AI IVR 2
    8: './audio/phase8.mp3'   // Q4 2026 - Next Best Offer
};

const phases = {
    1: { title: "Inbound Go Live", label: "Q4 2025 - 10 Oct" },
    2: { title: "Proactive Journeys", label: "Q4 2025 - 10 Nov" },
    3: { title: "New Natural Voices", label: "Q1 2026 - Feb" },
    4: { title: "Agentic AI IVR", label: "Q1 2026 - Mar" },
    5: { title: "Outbound AI Calls", label: "Q2 2026 - Apr" },
    6: { title: "Language Switching", label: "Q3 2026" },
    7: { title: "Agentic AI IVR 2", label: "Q3 2026" },
    8: { title: "Next Best Offer In Call Context", label: "Q4 2026" }
};

let currentPhase = 1;
let callTimer;
let callSeconds = 0;
let currentAudio = null;
let isCallActive = false;
let isPushToTalkActive = false;
let spaceKeyPressed = false;

// Phase expansion handling
document.querySelectorAll('.phase-item').forEach(item => {
    item.addEventListener('click', function(e) {
        if (e.target.closest('.btn')) return; // Don't toggle when clicking buttons
        
        const phaseNumber = parseInt(this.dataset.phase);
        togglePhase(phaseNumber);
    });
});

function togglePhase(phaseNumber) {
    const phaseItem = document.querySelector(`[data-phase="${phaseNumber}"]`);
    const isCurrentlyActive = phaseItem.classList.contains('active');
    
    // Close all phases
    document.querySelectorAll('.phase-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // If it wasn't active, open it
    if (!isCurrentlyActive) {
        phaseItem.classList.add('active');
        currentPhase = phaseNumber;
    }
}

// Play button handling with local audio files
document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const phaseNumber = parseInt(this.dataset.phase);
        playLocalAudio(phaseNumber, this);
    });
});

function playLocalAudio(phaseNumber, button) {
    // If this button is currently playing, stop it
    if (button.classList.contains('playing')) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        resetPlayButton(button);
        return;
    }

    // Stop any other currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        resetAllPlayButtons();
    }

    const audioFile = audioFiles[phaseNumber];
    if (!audioFile) {
        showError(button, 'Audio file not configured for this phase');
        return;
    }

    // Create new audio element
    currentAudio = new Audio(audioFile);
    
    // Update button to show playing state
    button.classList.add('playing');
    button.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        Stop Audio
    `;

    // Handle audio events
    currentAudio.addEventListener('loadstart', () => {
        console.log(`Loading audio: ${audioFile}`);
    });

    currentAudio.addEventListener('canplaythrough', () => {
        console.log(`Audio ready to play: ${audioFile}`);
    });

    currentAudio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        showError(button, `Could not load audio file: ${audioFile.split('/').pop()}`);
        resetPlayButton(button);
    });

    currentAudio.addEventListener('ended', () => {
        resetPlayButton(button);
        currentAudio = null;
    });

    // Start playing
    currentAudio.play().catch(error => {
        console.error('Playback failed:', error);
        showError(button, 'Playback failed. Please check if the audio file exists.');
        resetPlayButton(button);
    });
}

function resetPlayButton(button) {
    button.classList.remove('playing');
    button.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
        </svg>
        Play Audio
    `;
}

function resetAllPlayButtons() {
    document.querySelectorAll('.btn-play').forEach(btn => {
        resetPlayButton(btn);
    });
}

function showError(button, message) {
    // Remove any existing error messages
    const existingError = button.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    button.parentNode.appendChild(errorDiv);

    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Update call button states based on call status
function updateCallButtonStates() {
    document.querySelectorAll('.btn-call').forEach(btn => {
        if (isCallActive) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = 'End current call to start a new one';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = 'Start Call';
        }
    });
}

// Update control button states based on call status
function updateControlButtonStates() {
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    const hangupBtn = document.querySelector('.control-btn.hangup');
    
    if (pushToTalkBtn && hangupBtn) {
        if (isCallActive) {
            // Enable buttons during call
            pushToTalkBtn.disabled = false;
            hangupBtn.disabled = false;
            pushToTalkBtn.style.cursor = 'pointer';
            hangupBtn.style.cursor = 'pointer';
            
            // Set focus to push-to-talk button to capture space key
            setTimeout(() => {
                if (!pushToTalkBtn.disabled) {
                    pushToTalkBtn.focus();
                    pushToTalkBtn.setAttribute('tabindex', '0');
                }
            }, 200);
        } else {
            // Disable buttons when no call
            pushToTalkBtn.disabled = true;
            hangupBtn.disabled = true;
            pushToTalkBtn.style.cursor = 'not-allowed';
            hangupBtn.style.cursor = 'not-allowed';
            pushToTalkBtn.setAttribute('tabindex', '-1');
            pushToTalkBtn.blur();
        }
    }
}


// Call button handling with OpenAI Realtime integration
document.querySelectorAll('.btn-call').forEach(btn => {
    btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        // Prevent starting new call if one is already active
        if (isCallActive) {
            return;
        }
        
        const phaseItem = this.closest('.phase-item');
        const phaseNumber = parseInt(phaseItem.dataset.phase);
        const phase = phases[phaseNumber];
        
        // Set call as active
        isCallActive = true;
        updateCallButtonStates();
        updateControlButtonStates(); // Enable control buttons
        
        // Update UI
        document.getElementById('current-step-info').textContent = `${phase.label}: ${phase.title}`;
        document.getElementById('call-overlay').classList.add('active');
        
        // Start call timer
        startCallTimer();
        
        // Clear transcription box
        const transcriptionBox = document.getElementById('transcription-box');
        transcriptionBox.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">Connecting to OpenAI Realtime API...</div>';
        
        try {
            // Initialize OpenAI Realtime for this phase
            await openAIRealtime.initialize(phaseNumber);
            
            // Update UI to show connected state
            transcriptionBox.innerHTML = '<div style="color: #4CAF50; text-align: center; margin-top: 50px;">✅ Connected! Hold SPACE to talk...</div>';
            
            // Update call status
            document.querySelector('.call-status').textContent = '🎤 Live with AI Agent';
            document.querySelector('.call-status').style.color = '#4CAF50';
            
            // Initialize push-to-talk button
            initializePushToTalk();
            
        } catch (error) {
            console.error('Failed to initialize OpenAI Realtime:', error);
            transcriptionBox.innerHTML = `<div style="color: #f44336; text-align: center; margin-top: 50px;">❌ Connection failed: ${error.message}<br><br>Please check your API configuration.</div>`;
            
            // Reset call state on error
            isCallActive = false;
            updateCallButtonStates();
            updateControlButtonStates(); // Disable control buttons
            stopCallTimer();
        }
    });
});

// Initialize push-to-talk functionality with focus management
function initializePushToTalk() {
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    
    // Update button state
    updatePushToTalkButton(false);
    updateControlButtonStates();
    
    // Remove existing listeners to prevent duplicates
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('keyup', handleKeyUp, true); // Use capture phase
    
    // Focus on push-to-talk button and prevent space from scrolling
    if (pushToTalkBtn) {
        // Remove existing event listeners to prevent duplicates
        pushToTalkBtn.removeEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.removeEventListener('keyup', preventSpaceScroll);
        
        // Add event listeners
        pushToTalkBtn.addEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.addEventListener('keyup', preventSpaceScroll);
        
        // Focus the button
        setTimeout(() => {
            pushToTalkBtn.focus();
            pushToTalkBtn.setAttribute('tabindex', '0');
        }, 100);
    }
    
    console.log('Push-to-talk initialized with keyboard listeners');
}

function preventSpaceScroll(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}


function handleKeyDown(e) {
    if (!isCallActive) return;
    
    // FIXED: Only handle if space is not already pressed
    if (e.code === 'Space' && !spaceKeyPressed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Additional prevention
        spaceKeyPressed = true;
        startPushToTalk();
        
        console.log('Space key DOWN - started push to talk');
        
        // Ensure focus stays on push-to-talk button
        const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
        if (pushToTalkBtn && !pushToTalkBtn.disabled) {
            pushToTalkBtn.focus();
        }
    }
}

function handleKeyUp(e) {
    if (!isCallActive) return;
    
    // FIXED: Handle space key release properly
    if (e.code === 'Space' && spaceKeyPressed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Additional prevention
        spaceKeyPressed = false;
        stopPushToTalk();
        
        console.log('Space key UP - stopped push to talk');
        
        // Ensure focus stays on push-to-talk button
        const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
        if (pushToTalkBtn && !pushToTalkBtn.disabled) {
            pushToTalkBtn.focus();
        }
    }
}



// Start push-to-talk
function startPushToTalk() {
    if (!isPushToTalkActive) {
        isPushToTalkActive = true;
        updatePushToTalkButton(true);
        
        // Start recording if connected to OpenAI
        if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
            openAIRealtime.startRecording();
        }
    }
}

// Stop push-to-talk
function stopPushToTalk() {
    if (isPushToTalkActive) {
        isPushToTalkActive = false;
        updatePushToTalkButton(false);
        
        // Stop recording if connected to OpenAI
        if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
            openAIRealtime.stopRecording();
            openAIRealtime.commitAudio();
        }
    }
}

// Update push-to-talk button appearance with new blue theme
function updatePushToTalkButton(isActive) {
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    if (!pushToTalkBtn) return;
    
    if (isActive) {
        pushToTalkBtn.style.background = 'rgba(76, 175, 80, 0.9)';
        pushToTalkBtn.textContent = '🎤';
        pushToTalkBtn.title = 'Recording... (Release SPACE to stop)';
        pushToTalkBtn.classList.add('recording');
    } else {
        pushToTalkBtn.style.background = 'rgba(33, 150, 243, 0.9)';
        pushToTalkBtn.textContent = '🎤';
        pushToTalkBtn.title = 'Hold SPACE to talk';
        pushToTalkBtn.classList.remove('recording');
    }
}

// Close call overlay with proper cleanup
document.getElementById('close-call').addEventListener('click', function() {
    closeCallOverlay();
});

// Close overlay when clicking outside
document.getElementById('call-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCallOverlay();
    }
});

// Function to properly close call overlay and cleanup
function closeCallOverlay() {
    console.log('Closing call overlay...');
    
    // Reset call state
    isCallActive = false;
    isPushToTalkActive = false;
    spaceKeyPressed = false; // IMPORTANT: Reset this flag
    
    // Update all button states
    updateCallButtonStates();
    updateControlButtonStates(); // Disable control buttons
    
    document.getElementById('call-overlay').classList.remove('active');
    
    // Disconnect OpenAI Realtime if connected
    if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
        openAIRealtime.disconnect();
    }
    
    // Reset call status
    document.querySelector('.call-status').textContent = '📞 Calling Contact Center';
    document.querySelector('.call-status').style.color = '#4CAF50';
    
    // Reset push-to-talk button
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    if (pushToTalkBtn) {
        pushToTalkBtn.style.background = 'rgba(33, 150, 243, 0.9)';
        pushToTalkBtn.textContent = '🎤';
        pushToTalkBtn.classList.remove('recording');
        pushToTalkBtn.title = 'Push to Talk';
        pushToTalkBtn.blur(); // Remove focus
        pushToTalkBtn.setAttribute('tabindex', '-1');
        
        // Remove button-specific event listeners
        pushToTalkBtn.removeEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.removeEventListener('keyup', preventSpaceScroll);
    }
    
    // FIXED: Remove keyboard event listeners properly
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keyup', handleKeyUp, true);
    
    console.log('Keyboard listeners removed, space key reset');
    
    stopCallSimulation();
    stopCallTimer();
}



function startCallTimer() {
    callSeconds = 0; // Start from 23 seconds as shown in design
    const timerElement = document.getElementById('call-timer');
    
    callTimer = setInterval(() => {
        callSeconds++;
        const minutes = Math.floor(callSeconds / 60);
        const seconds = callSeconds % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
        document.getElementById('call-timer').textContent = '00:00';
    }
}

function stopCallSimulation() {
    const transcriptionBox = document.getElementById('transcription-box');
    if (transcriptionBox.dataset.intervalId) {
        clearInterval(transcriptionBox.dataset.intervalId);
    }
    transcriptionBox.innerHTML = `
        <div class="transcription-placeholder">
            Transcription will appear here during the call...
            <br><br>
            <em>Real-time speech recognition and text conversion ready</em>
        </div>
    `;
}

function scrollToActivePhase(phaseNumber) {
    const phasesSection = document.querySelector('.phases-section');
    const activePhase = document.querySelector(`[data-phase="${phaseNumber}"]`);
    
    if (phasesSection && activePhase) {
        // Calculate the position to center the active phase with the call overlay
        const sectionRect = phasesSection.getBoundingClientRect();
        const phaseRect = activePhase.getBoundingClientRect();
        const callOverlayTop = 200; // Same as CSS top value
        
        // Calculate scroll position to align phase with call overlay
        const targetScrollTop = phasesSection.scrollTop + (phaseRect.top - sectionRect.top) - (callOverlayTop - sectionRect.top);
        
        phasesSection.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }
}

// Initialize control button states on page load (disabled by default)
document.addEventListener('DOMContentLoaded', function() {
    updateCallButtonStates();
    updateControlButtonStates(); // Disable control buttons initially
    
    // Set up control button event listeners
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    const hangupBtn = document.querySelector('.control-btn.hangup');
    
    if (pushToTalkBtn) {
        pushToTalkBtn.addEventListener('mousedown', function(e) {
            if (!isCallActive || this.disabled) return;
            e.preventDefault();
            startPushToTalk();
        });

        pushToTalkBtn.addEventListener('mouseup', function(e) {
            if (!isCallActive || this.disabled) return;
            e.preventDefault();
            stopPushToTalk();
        });

        pushToTalkBtn.addEventListener('mouseleave', function(e) {
            if (!isCallActive || this.disabled) return;
            e.preventDefault();
            stopPushToTalk();
        });
        
        // Prevent space from scrolling when button has focus - separate handler
        pushToTalkBtn.addEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.addEventListener('keyup', preventSpaceScroll);
    }
    
    if (hangupBtn) {
        hangupBtn.addEventListener('click', function() {
            if (!this.disabled) {
                closeCallOverlay();
            }
        });
    }
    
    console.log('DOM loaded, event listeners set up');
});

// FIXED: Window beforeunload cleanup
window.addEventListener('beforeunload', function() {
    if (currentAudio) {
        currentAudio.pause();
    }
    
    // Reset state flags
    isCallActive = false;
    isPushToTalkActive = false;
    spaceKeyPressed = false;
    
    // Remove keyboard event listeners
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keyup', handleKeyUp, true);
    
    console.log('Page unload cleanup completed');
});