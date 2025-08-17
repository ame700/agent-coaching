let currentPhase = 1;
let currentOption = null;
let callTimer;
let callSeconds = 0;
let currentAudio = null;
let isCallActive = false;
let isPushToTalkActive = false;
let spaceKeyPressed = false;
let isVideoMode = false;
let isAudioPlaying = false;
let audioProgressInterval = null;
let visualizerInterval = null;
let isPaused = false;

// Phase renderer instance
let phaseRenderer = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDynamicPhases();
    initializeDefaultVisualizer();
    updateCallButtonStates();
    updateControlButtonStates();
    setupEventListeners();
});

// Initialize dynamic phase rendering
function initializeDynamicPhases() {
    // Create phase renderer and render all phases
    phaseRenderer = new PhaseRenderer();
    phaseRenderer.init('#phases-container');
    
    // Set current phase and option
    currentPhase = 1;
    const firstPhaseConfig = phaseConfigs[1];
    if (firstPhaseConfig && firstPhaseConfig.hasMultipleJourneys) {
        currentOption = Object.keys(firstPhaseConfig.options)[0];
    } else {
        currentOption = 'default';
    }
    
    console.log('Dynamic phases initialized successfully');
}

function initializeDefaultVisualizer() {
    document.getElementById('visualizer-title').textContent = 'Audio Visualizer';
    document.getElementById('visualizer-subtitle').textContent = 'Select a phase and click "Play Audio" to start';
    
    // Create static visualizer bars
    createVisualizerBars();
    
    // Set static heights for default state
    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach((bar, index) => {
        const height = 20 + (Math.sin(index * 0.5) * 15); // Static wave pattern
        bar.style.height = height + 'px';
        bar.style.background = 'linear-gradient(to top, #1a365d, #4CAF50)';
    });
    
    // Disable control buttons initially
    document.getElementById('pause-audio').disabled = true;
    document.getElementById('stop-audio').disabled = true;
}

// Setup all event listeners
function setupEventListeners() {
    // Phase expansion handling - use event delegation
    document.addEventListener('click', function(e) {
        const phaseItem = e.target.closest('.phase-item');
        if (!phaseItem) return;
        
        // Don't toggle if clicking on buttons or selects
        if (e.target.closest('.btn') || e.target.closest('select')) return;
        
        const phaseNumber = parseInt(phaseItem.dataset.phase);
        togglePhase(phaseNumber);
    });

    // Option change handling - use event delegation
    document.addEventListener('change', function(e) {
        if (e.target.matches('select[data-phase]')) {
            const phase = parseInt(e.target.dataset.phase);
            const option = e.target.value;
            currentOption = option;
            console.log(`Selected option ${option} for phase ${phase}`);
        }
    });

    // Button click handling - use event delegation
    document.addEventListener('click', function(e) {
        const button = e.target.closest('.btn');
        if (!button) return;
        
        e.stopPropagation();
        const phaseNumber = parseInt(button.dataset.phase);
        
        if (button.classList.contains('btn-play')) {
            playAudio(phaseNumber, button);
        } else if (button.classList.contains('btn-call')) {
            if (!isCallActive) {
                startCall(phaseNumber);
            }
        } else if (button.classList.contains('btn-video')) {
            playVideo(phaseNumber);
        }
    });

    // Audio visualizer controls
    document.getElementById('pause-audio').addEventListener('click', function() {
        if (currentAudio && isAudioPlaying) {
            if (isPaused) {
                // Resume
                currentAudio.play();
                this.textContent = '⏸️';
                isPaused = false;
                resumeVisualizer();
            } else {
                // Pause
                currentAudio.pause();
                this.textContent = '▶️';
                isPaused = true;
                pauseVisualizer();
            }
        }
    });

    document.getElementById('stop-audio').addEventListener('click', function() {
        stopCurrentAudio();
        resetToDefaultVisualizer();
    });

    // Control buttons
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    const hangupBtn = document.querySelector('.control-btn.hangup');
    
    if (pushToTalkBtn) {
        pushToTalkBtn.addEventListener('mousedown', function(e) {
            if (!isCallActive || this.disabled || isVideoMode) return;
            e.preventDefault();
            startPushToTalk();
        });

        pushToTalkBtn.addEventListener('mouseup', function(e) {
            if (!isCallActive || this.disabled || isVideoMode) return;
            e.preventDefault();
            stopPushToTalk();
        });

        pushToTalkBtn.addEventListener('mouseleave', function(e) {
            if (!isCallActive || this.disabled || isVideoMode) return;
            e.preventDefault();
            stopPushToTalk();
        });
        
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

    // Close call overlay
    document.getElementById('close-call').addEventListener('click', closeCallOverlay);
    document.getElementById('call-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCallOverlay();
        }
    });

    // Window cleanup
    window.addEventListener('beforeunload', function() {
        if (currentAudio) {
            currentAudio.pause();
        }
        
        isCallActive = false;
        isPushToTalkActive = false;
        spaceKeyPressed = false;
        
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('keyup', handleKeyUp, true);
    });
}

// Phase expansion logic
function togglePhase(phaseNumber) {
    const phaseItem = document.querySelector(`[data-phase="${phaseNumber}"]`);
    if (!phaseItem) return;
    
    const isCurrentlyActive = phaseItem.classList.contains('active');
    
    document.querySelectorAll('.phase-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (!isCurrentlyActive) {
        phaseItem.classList.add('active');
        currentPhase = phaseNumber;
        
        // Update current option for the active phase
        const config = phaseConfigs[phaseNumber];
        if (config) {
            if (config.hasMultipleJourneys) {
                const select = document.querySelector(`#phase${phaseNumber}-options`);
                currentOption = select ? select.value : Object.keys(config.options)[0];
            } else {
                currentOption = 'default';
            }
        }
    }
}

// Audio playback with visualizer
function playAudio(phaseNumber, button) {
    if (button.classList.contains('playing')) {
        stopCurrentAudio();
        resetToDefaultVisualizer();
        return;
    }

    if (currentAudio) {
        stopCurrentAudio();
        resetAllPlayButtons();
    }

    const config = phaseConfigs[phaseNumber];
    if (!config) {
        showError(button, 'Phase configuration not found');
        return;
    }
    
    let selectedOption = 'default';
    
    if (config.hasMultipleJourneys) {
        const select = document.querySelector(`#phase${phaseNumber}-options`);
        selectedOption = select ? select.value : Object.keys(config.options)[0];
    }
    
    const option = config.options[selectedOption];
    const audioFile = option?.audio;

    if (!audioFile) {
        showError(button, 'Audio file not configured for this option');
        return;
    }

    // Update visualizer for active playback
    activateVisualizer(config, selectedOption);
    
    currentAudio = new Audio(audioFile);
    isAudioPlaying = true;
    isPaused = false;
    
    button.classList.add('playing');
    button.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        Stop Audio
    `;

    // Enable control buttons
    document.getElementById('pause-audio').disabled = false;
    document.getElementById('stop-audio').disabled = false;

    currentAudio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        showError(button, `Could not load audio file: ${audioFile.split('/').pop()}`);
        resetPlayButton(button);
        resetToDefaultVisualizer();
    });

    currentAudio.addEventListener('ended', () => {
        resetPlayButton(button);
        stopCurrentAudio();
        resetToDefaultVisualizer();
    });

    currentAudio.addEventListener('loadedmetadata', () => {
        startAudioProgress();
        startVisualizer();
    });

    currentAudio.play().catch(error => {
        console.error('Playback failed:', error);
        showError(button, 'Playback failed. Please check if the audio file exists.');
        resetPlayButton(button);
        resetToDefaultVisualizer();
    });
}

// Activate visualizer for audio playback
function activateVisualizer(config, selectedOption) {
    let title = `Playing: ${config.title}`;
    
    // Add journey label if multiple journeys exist
    if (config.hasMultipleJourneys) {
        const option = config.options[selectedOption];
        const journeyLabel = option?.label || selectedOption;
        title += ` - ${journeyLabel}`;
    }
    
    document.getElementById('visualizer-title').textContent = title;
    document.getElementById('visualizer-subtitle').textContent = 'Audio visualization active';
}

// Create animated visualizer bars
function createVisualizerBars() {
    const visualizer = document.getElementById('audio-visualizer');
    visualizer.innerHTML = '';
    
    const barCount = 40;
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizer.appendChild(bar);
    }
}

// Start audio progress tracking
function startAudioProgress() {
    if (audioProgressInterval) {
        clearInterval(audioProgressInterval);
    }
    
    audioProgressInterval = setInterval(() => {
        if (currentAudio && currentAudio.duration) {
            const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
            document.getElementById('audio-progress-bar').style.width = progress + '%';
        }
    }, 100);
}

// Start visualizer animation
function startVisualizer() {
    if (visualizerInterval) {
        clearInterval(visualizerInterval);
    }
    
    const bars = document.querySelectorAll('.visualizer-bar');
    
    visualizerInterval = setInterval(() => {
        if (!isPaused) {
            bars.forEach(bar => {
                const height = Math.random() * 80 + 20; // Random height between 20-100px
                bar.style.height = height + 'px';
                
                // Add some color variation based on height
                const intensity = height / 100;
                const hue = 200 + (intensity * 60); // Blue to green gradient
                bar.style.background = `linear-gradient(to top, hsl(${hue}, 70%, 50%), hsl(${hue + 20}, 70%, 60%))`;
            });
        }
    }, 100);
}

// Pause visualizer animation
function pauseVisualizer() {
    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        bar.classList.add('paused');
    });
}

// Resume visualizer animation
function resumeVisualizer() {
    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
        bar.classList.remove('paused');
    });
}

// Reset to default static visualizer
function resetToDefaultVisualizer() {
    document.getElementById('visualizer-title').textContent = 'Audio Visualizer';
    document.getElementById('visualizer-subtitle').textContent = 'Select a phase and click "Play Audio" to start';
    
    // Stop animation
    if (visualizerInterval) {
        clearInterval(visualizerInterval);
        visualizerInterval = null;
    }
    
    // Reset bars to static state
    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach((bar, index) => {
        bar.classList.remove('paused');
        const height = 20 + (Math.sin(index * 0.5) * 15); // Static wave pattern
        bar.style.height = height + 'px';
        bar.style.background = 'linear-gradient(to top, #1a365d, #4CAF50)';
    });
    
    // Disable control buttons
    document.getElementById('pause-audio').disabled = true;
    document.getElementById('stop-audio').disabled = true;
    document.getElementById('pause-audio').textContent = '⏸️';
    
    // Reset progress
    document.getElementById('audio-progress-bar').style.width = '0%';
}

// Stop current audio and cleanup
function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    
    isAudioPlaying = false;
    isPaused = false;
    
    if (audioProgressInterval) {
        clearInterval(audioProgressInterval);
        audioProgressInterval = null;
    }
    
    resetAllPlayButtons();
}

// Video playback
function playVideo(phaseNumber) {
    const config = phaseConfigs[phaseNumber];
    if (!config || !config.hasVideo) {
        alert('Video not available for this phase');
        return;
    }

    const option = config.options['default'];
    if (!option?.video) {
        alert('Video not configured for this phase');
        return;
    }

    // Stop any playing audio and hide visualizer
    if (isAudioPlaying) {
        stopCurrentAudio();
    }
    hideAudioVisualizer();

    isVideoMode = true;
    
    document.getElementById('call-overlay').classList.add('active');
    document.getElementById('phone-section').style.display = 'none';
    document.getElementById('video-section').style.display = 'flex';
    
    const video = document.getElementById('demo-video');
    video.src = option.video;
    
    document.getElementById('video-step-info').textContent = `${config.label}: ${config.title}`;
    document.getElementById('transcription-title').textContent = 'Video Transcription';
    document.getElementById('transcription-subtitle').textContent = 'Pre-recorded demonstration transcript';
    
    const transcriptionBox = document.getElementById('transcription-box');
    if (option.transcription) {
        transcriptionBox.innerHTML = option.transcription;
    } else {
        transcriptionBox.innerHTML = `
            <div class="static-transcription">
                <div class="dialogue">
                    <span class="speaker">System:</span>
                    Video demonstration for ${config.title}
                </div>
            </div>
        `;
    }
}

// Call functionality
function startCall(phaseNumber) {
    const config = phaseConfigs[phaseNumber];
    if (!config) {
        console.error('Phase configuration not found:', phaseNumber);
        return;
    }
    
    // Stop any playing audio and hide visualizer
    if (isAudioPlaying) {
        stopCurrentAudio();
    }
    hideAudioVisualizer();
    
    isCallActive = true;
    isVideoMode = false;
    updateCallButtonStates();
    updateControlButtonStates();
    
    // Build step info with journey label if applicable
    let stepInfo = `${config.label}: ${config.title}`;
    if (config.hasMultipleJourneys) {
        const select = document.querySelector(`#phase${phaseNumber}-options`);
        const selectedOption = select ? select.value : Object.keys(config.options)[0];
        const option = config.options[selectedOption];
        const journeyLabel = option?.label || selectedOption;
        stepInfo += ` - ${journeyLabel}`;
    }
    
    document.getElementById('current-step-info').textContent = stepInfo;
    document.getElementById('call-overlay').classList.add('active');
    document.getElementById('phone-section').style.display = 'flex';
    document.getElementById('video-section').style.display = 'none';
    
    document.getElementById('transcription-title').textContent = 'Live Transcription';
    document.getElementById('transcription-subtitle').textContent = 'Real-time speech-to-text conversion';
    
    startCallTimer();
    
    const transcriptionBox = document.getElementById('transcription-box');
    transcriptionBox.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">Connecting to AI Agent...</div>';
    
    // Try to connect to OpenAI Realtime if available
    if (typeof openAIRealtime !== 'undefined') {
        openAIRealtime.initialize(phaseNumber).then(() => {
            transcriptionBox.innerHTML = '<div style="color: #4CAF50; text-align: center; margin-top: 50px;">✅ Connected! Hold SPACE to talk...</div>';
            document.querySelector('.call-status').textContent = '🎤 Live with AI Agent';
            document.querySelector('.call-status').style.color = '#4CAF50';
            
            initializePushToTalk();
        }).catch(error => {
            console.error('Failed to initialize OpenAI Realtime:', error);
            transcriptionBox.innerHTML = `<div style="color: #f44336; text-align: center; margin-top: 50px;">❌ Connection failed: ${error.message}<br><br>Please check your API configuration.</div>`;
            
            // Reset call state on error
            isCallActive = false;
            updateCallButtonStates();
            updateControlButtonStates();
            stopCallTimer();
        });
    } else {
        console.error('OpenAI Realtime not available');
        transcriptionBox.innerHTML = '<div style="color: #f44336; text-align: center; margin-top: 50px;">❌ OpenAI Realtime API not configured<br><br>Please check your integration setup.</div>';
        
        // Reset call state on error
        isCallActive = false;
        updateCallButtonStates();
        updateControlButtonStates();
        stopCallTimer();
    }
}

// Helper functions
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
    const existingError = button.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    button.parentNode.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

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

function updateControlButtonStates() {
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    const hangupBtn = document.querySelector('.control-btn.hangup');
    
    if (pushToTalkBtn && hangupBtn) {
        if (isCallActive) {
            pushToTalkBtn.disabled = false;
            hangupBtn.disabled = false;
            pushToTalkBtn.style.cursor = 'pointer';
            hangupBtn.style.cursor = 'pointer';
            
            setTimeout(() => {
                if (!pushToTalkBtn.disabled) {
                    pushToTalkBtn.focus();
                    pushToTalkBtn.setAttribute('tabindex', '0');
                }
            }, 200);
        } else {
            pushToTalkBtn.disabled = true;
            hangupBtn.disabled = true;
            pushToTalkBtn.style.cursor = 'not-allowed';
            hangupBtn.style.cursor = 'not-allowed';
            pushToTalkBtn.setAttribute('tabindex', '-1');
            pushToTalkBtn.blur();
        }
    }
}

// Push to talk functionality
function initializePushToTalk() {
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    
    updatePushToTalkButton(false);
    updateControlButtonStates();
    
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    
    if (pushToTalkBtn) {
        pushToTalkBtn.removeEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.removeEventListener('keyup', preventSpaceScroll);
        
        pushToTalkBtn.addEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.addEventListener('keyup', preventSpaceScroll);
        
        setTimeout(() => {
            pushToTalkBtn.focus();
            pushToTalkBtn.setAttribute('tabindex', '0');
        }, 100);
    }
}

function preventSpaceScroll(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}

function handleKeyDown(e) {
    if (!isCallActive || isVideoMode) return;
    
    if (e.code === 'Space' && !spaceKeyPressed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        spaceKeyPressed = true;
        startPushToTalk();
        
        const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
        if (pushToTalkBtn && !pushToTalkBtn.disabled) {
            pushToTalkBtn.focus();
        }
    }
}

function handleKeyUp(e) {
    if (!isCallActive || isVideoMode) return;
    
    if (e.code === 'Space' && spaceKeyPressed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        spaceKeyPressed = false;
        stopPushToTalk();
        
        const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
        if (pushToTalkBtn && !pushToTalkBtn.disabled) {
            pushToTalkBtn.focus();
        }
    }
}

function startPushToTalk() {
    if (!isPushToTalkActive) {
        isPushToTalkActive = true;
        updatePushToTalkButton(true);
        
        if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
            openAIRealtime.startRecording();
        }
    }
}

function stopPushToTalk() {
    if (isPushToTalkActive) {
        isPushToTalkActive = false;
        updatePushToTalkButton(false);
        
        if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
            openAIRealtime.stopRecording();
        }
    }
}

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

// Enhanced transcription with modern chat bubble styling
function updateTranscription(text, sender) {
    const transcriptionBox = document.getElementById('transcription-box');
    if (!transcriptionBox || !text || text.trim().length < 2) return;

    const placeholder = transcriptionBox.querySelector('.transcription-placeholder');
    if (placeholder) placeholder.remove();

    // Create message bubble container
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${sender}`;
    
    // Add recording class if it's a recording message
    if (text.includes('🎤 Recording')) {
        messageBubble.classList.add('recording');
    }
    
    // Create avatar
    const messageAvatar = document.createElement('div');
    messageAvatar.className = 'message-avatar';
    messageAvatar.textContent = sender === 'assistant' ? 'AI' : 'U';
    
    // Create message content container
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Create message header with sender and timestamp
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const messageSender = document.createElement('span');
    messageSender.className = 'message-sender';
    messageSender.textContent = sender === 'assistant' ? 'AI Agent' : 'You';
    
    const messageTimestamp = document.createElement('span');
    messageTimestamp.className = 'message-timestamp';
    messageTimestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageHeader.appendChild(messageSender);
    messageHeader.appendChild(messageTimestamp);
    
    // Create message text bubble
    const messageTextBubble = document.createElement('div');
    messageTextBubble.className = 'message-text-bubble';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = text;
    
    messageTextBubble.appendChild(messageText);
    
    // Create message status (read indicators, etc.)
    const messageStatus = document.createElement('div');
    messageStatus.className = 'message-status';
    
    if (sender === 'user') {
        messageStatus.innerHTML = '<span>✓</span>'; // Sent indicator
    }
    
    // Assemble the message
    messageContent.appendChild(messageHeader);
    messageContent.appendChild(messageTextBubble);
    if (messageStatus.innerHTML) {
        messageContent.appendChild(messageStatus);
    }
    
    messageBubble.appendChild(messageAvatar);
    messageBubble.appendChild(messageContent);
    
    transcriptionBox.appendChild(messageBubble);
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    
    // Add typing indicator for AI responses
    if (sender === 'assistant') {
        addTypingEffect(messageText, text);
    }
}

// Add typing effect for AI messages
function addTypingEffect(element, fullText) {
    element.textContent = '';
    let i = 0;
    const typingSpeed = 30; // milliseconds per character
    
    function typeChar() {
        if (i < fullText.length) {
            element.textContent += fullText.charAt(i);
            i++;
            setTimeout(typeChar, typingSpeed);
        }
    }
    
    // Add a small delay before starting to type
    setTimeout(typeChar, 200);
}

// Timer functions
function startCallTimer() {
    callSeconds = 0;
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

// Close call overlay
function closeCallOverlay() {
    isCallActive = false;
    isPushToTalkActive = false;
    spaceKeyPressed = false;
    isVideoMode = false;
    
    updateCallButtonStates();
    updateControlButtonStates();
    
    document.getElementById('call-overlay').classList.remove('active');
    
    // Show audio visualizer again
    showAudioVisualizer();
    
    if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
        openAIRealtime.disconnect();
    }
    
    document.querySelector('.call-status').textContent = '📞 Calling Contact Center';
    document.querySelector('.call-status').style.color = '#4CAF50';
    
    const pushToTalkBtn = document.querySelector('.control-btn.push-to-talk');
    if (pushToTalkBtn) {
        pushToTalkBtn.style.background = 'rgba(33, 150, 243, 0.9)';
        pushToTalkBtn.textContent = '🎤';
        pushToTalkBtn.classList.remove('recording');
        pushToTalkBtn.title = 'Push to Talk';
        pushToTalkBtn.blur();
        pushToTalkBtn.setAttribute('tabindex', '-1');
        
        pushToTalkBtn.removeEventListener('keydown', preventSpaceScroll);
        pushToTalkBtn.removeEventListener('keyup', preventSpaceScroll);
    }
    
    const video = document.getElementById('demo-video');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keyup', handleKeyUp, true);
    
    stopCallTimer();
    
    const transcriptionBox = document.getElementById('transcription-box');
    transcriptionBox.innerHTML = `
        <div class="transcription-placeholder">
            Transcription will appear here during the call...
            <br><br>
            <em>Real-time speech recognition and text conversion ready</em>
        </div>
    `;
}

// Helper functions to show/hide audio visualizer
function hideAudioVisualizer() {
    document.getElementById('audio-visualizer-section').style.display = 'none';
}

function showAudioVisualizer() {
    document.getElementById('audio-visualizer-section').style.display = 'flex';
    // Reset to default state if no audio is playing
    if (!isAudioPlaying) {
        resetToDefaultVisualizer();
    }
}

// Utility functions for getting phase information
function getPhaseConfig(phaseId) {
    return phaseConfigs[phaseId] || null;
}

function getSelectedOption(phaseId) {
    const config = phaseConfigs[phaseId];
    if (!config) return null;
    
    if (config.hasMultipleJourneys) {
        const select = document.querySelector(`#phase${phaseId}-options`);
        return select ? select.value : Object.keys(config.options)[0];
    }
    
    return 'default';
}

function getPhaseOption(phaseId, optionKey) {
    const config = phaseConfigs[phaseId];
    if (!config) return null;
    
    return config.options[optionKey] || config.options['default'] || null;
}

// Additional utility functions for phase management
function updatePhaseButtonState(phaseId, buttonType, state) {
    const button = document.querySelector(`[data-phase="${phaseId}"].btn-${buttonType}`);
    if (!button) return;
    
    if (buttonType === 'play') {
        if (state === 'playing') {
            button.classList.add('playing');
            button.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                Stop Audio
            `;
        } else {
            button.classList.remove('playing');
            button.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Play Audio
            `;
        }
    }
}

// Search functionality for phases
function searchPhases(query) {
    if (!query || query.trim().length < 2) {
        // Show all phases
        document.querySelectorAll('.phase-item').forEach(item => {
            item.style.display = 'block';
        });
        return;
    }
    
    const searchTerm = query.toLowerCase();
    document.querySelectorAll('.phase-item').forEach(item => {
        const phaseId = item.dataset.phase;
        const config = phaseConfigs[phaseId];
        
        if (config) {
            const searchText = `${config.title} ${config.description} ${config.label}`.toLowerCase();
            const hasMatch = searchText.includes(searchTerm);
            item.style.display = hasMatch ? 'block' : 'none';
        }
    });
}

// Export phase data as JSON (for backup/sharing)
function exportPhaseConfig() {
    const dataStr = JSON.stringify(phaseConfigs, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'phase-config.json';
    link.click();
    
    URL.revokeObjectURL(url);
}

// Get phase statistics
function getPhaseStatistics() {
    const stats = {
        totalPhases: Object.keys(phaseConfigs).length,
        phasesByYear: {},
        featuresCount: {
            hasAudio: 0,
            hasCall: 0,
            hasVideo: 0,
            hasMultipleJourneys: 0
        },
        totalJourneys: 0
    };
    
    Object.values(phaseConfigs).forEach(config => {
        // Count by year
        if (!stats.phasesByYear[config.year]) {
            stats.phasesByYear[config.year] = 0;
        }
        stats.phasesByYear[config.year]++;
        
        // Count features
        if (config.hasAudio) stats.featuresCount.hasAudio++;
        if (config.hasCall) stats.featuresCount.hasCall++;
        if (config.hasVideo) stats.featuresCount.hasVideo++;
        if (config.hasMultipleJourneys) stats.featuresCount.hasMultipleJourneys++;
        
        // Count total journeys
        stats.totalJourneys += Object.keys(config.options).length;
    });
    
    return stats;
}

// Debug function to validate dynamic rendering
function validateDynamicRendering() {
    console.log('=== Dynamic Rendering Validation ===');
    
    // Check if phases container exists
    const container = document.getElementById('phases-container');
    console.log('Phases container found:', !!container);
    
    // Check if phases are rendered
    const phaseItems = document.querySelectorAll('.phase-item');
    console.log('Number of rendered phases:', phaseItems.length);
    
    // Check if configuration matches rendered phases
    const configPhaseCount = Object.keys(phaseConfigs).length;
    console.log('Configuration phases:', configPhaseCount);
    console.log('Rendered phases match config:', phaseItems.length === configPhaseCount);
    
    // Check dropdowns for phases with multiple journeys
    phaseItems.forEach(item => {
        const phaseId = item.dataset.phase;
        const config = phaseConfigs[phaseId];
        const hasDropdown = !!item.querySelector('select');
        
        console.log(`Phase ${phaseId}: Multiple journeys = ${config?.hasMultipleJourneys}, Has dropdown = ${hasDropdown}`);
    });
    
    // Check buttons
    const playButtons = document.querySelectorAll('.btn-play');
    const callButtons = document.querySelectorAll('.btn-call'); 
    const videoButtons = document.querySelectorAll('.btn-video');
    
    console.log('Play buttons:', playButtons.length);
    console.log('Call buttons:', callButtons.length);
    console.log('Video buttons:', videoButtons.length);
    
    console.log('=== Validation Complete ===');
}

// Performance monitoring
function measureRenderingPerformance() {
    if (!performance || !performance.mark) return;
    
    performance.mark('phase-render-start');
    
    // Re-render phases
    if (phaseRenderer) {
        phaseRenderer.renderPhases();
    }
    
    performance.mark('phase-render-end');
    performance.measure('phase-rendering', 'phase-render-start', 'phase-render-end');
    
    const measure = performance.getEntriesByName('phase-rendering')[0];
    console.log(`Phase rendering took ${measure.duration.toFixed(2)}ms`);
    
    // Clean up
    performance.clearMarks();
    performance.clearMeasures();
}

// Responsive handling for mobile devices
function handleMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const phasesSection = document.querySelector('.phases-section');
    const visualizerSection = document.querySelector('.audio-visualizer-section');
    
    if (isMobile) {
        // Adjust layout for mobile
        if (phasesSection) {
            phasesSection.style.height = '40vh';
            phasesSection.style.minHeight = '300px';
        }
        
        // Adjust visualizer for mobile
        if (visualizerSection) {
            visualizerSection.style.padding = '20px';
        }
    } else {
        // Reset to desktop layout
        if (phasesSection) {
            phasesSection.style.height = '100%';
            phasesSection.style.minHeight = 'auto';
        }
        
        if (visualizerSection) {
            visualizerSection.style.padding = '40px';
        }
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    handleMobileLayout();
    
    // Debounce performance measurement
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        measureRenderingPerformance();
    }, 250);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when not in call mode or input focused
    if (isCallActive || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    switch(e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
            e.preventDefault();
            const phaseNum = parseInt(e.key);
            if (phaseConfigs[phaseNum]) {
                togglePhase(phaseNum);
            }
            break;
            
        case 'Escape':
            if (isCallActive || isVideoMode) {
                closeCallOverlay();
            } else if (isAudioPlaying) {
                stopCurrentAudio();
                resetToDefaultVisualizer();
            }
            break;
            
        case 'p':
        case 'P':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const activePhase = document.querySelector('.phase-item.active');
                if (activePhase) {
                    const playButton = activePhase.querySelector('.btn-play');
                    if (playButton) {
                        playButton.click();
                    }
                }
            }
            break;
    }
});

// Auto-save current state to localStorage (optional)
function saveCurrentState() {
    const state = {
        currentPhase,
        currentOption,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('ivr-roadmap-state', JSON.stringify(state));
    } catch (e) {
        console.warn('Could not save state to localStorage:', e);
    }
}

function loadSavedState() {
    try {
        const saved = localStorage.getItem('ivr-roadmap-state');
        if (saved) {
            const state = JSON.parse(saved);
            
            // Only restore if saved recently (within 24 hours)
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                if (phaseConfigs[state.currentPhase]) {
                    togglePhase(state.currentPhase);
                    
                    if (state.currentOption) {
                        const select = document.querySelector(`#phase${state.currentPhase}-options`);
                        if (select && select.querySelector(`option[value="${state.currentOption}"]`)) {
                            select.value = state.currentOption;
                            currentOption = state.currentOption;
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Could not load saved state:', e);
    }
}

// Save state when phase or option changes
function saveStateOnChange() {
    // Save state when phase changes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.phase-item')) {
            setTimeout(saveCurrentState, 100);
        }
    });
    
    // Save state when option changes
    document.addEventListener('change', (e) => {
        if (e.target.matches('select[data-phase]')) {
            setTimeout(saveCurrentState, 100);
        }
    });
}

// Initialize accessibility features
function initializeAccessibility() {
    // Add ARIA labels and roles - wait for phases to be rendered
    setTimeout(() => {
        document.querySelectorAll('.phase-item').forEach((item, index) => {
            item.setAttribute('role', 'button');
            item.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
            item.setAttribute('aria-label', `Phase ${index + 1}: ${item.querySelector('.phase-title')?.textContent}`);
            item.setAttribute('tabindex', '0');
            
            // Keyboard navigation for phase items
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
        
        // Add focus management for buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
    }, 200);
}

// Initialize error handling
function initializeErrorHandling() {
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        
        // Show user-friendly error message for critical errors
        if (e.error && e.error.message && e.error.message.includes('phaseConfigs')) {
            showGlobalError('Configuration error detected. Please refresh the page.');
        }
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        
        // Handle API connection errors gracefully
        if (e.reason && e.reason.message && e.reason.message.includes('OpenAI')) {
            console.warn('OpenAI API error handled gracefully');
        }
    });
}

function showGlobalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Cleanup function for page unload
function cleanup() {
    // Stop any active timers
    if (callTimer) clearInterval(callTimer);
    if (audioProgressInterval) clearInterval(audioProgressInterval);
    if (visualizerInterval) clearInterval(visualizerInterval);
    
    // Stop audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    // Disconnect OpenAI if connected
    if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
        openAIRealtime.disconnect();
    }
    
    // Save current state
    saveCurrentState();
}

// Enhanced initialization
function initializeEnhancedFeatures() {
    // Load saved state
    loadSavedState();
    
    // Initialize state saving
    saveStateOnChange();
    
    // Initialize accessibility
    initializeAccessibility();
    
    // Initialize error handling
    initializeErrorHandling();
    
    // Handle mobile layout
    handleMobileLayout();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    // Log initialization complete
    console.log('IVR Roadmap initialized successfully');
    console.log('Phase statistics:', getPhaseStatistics());
    
    // Optional: Auto-validate after initialization
    if (window.location.hash === '#debug') {
        setTimeout(validateDynamicRendering, 500);
    }
}

// Call enhanced initialization after base initialization
document.addEventListener('DOMContentLoaded', function() {
    // Wait for base initialization to complete
    setTimeout(initializeEnhancedFeatures, 200);
});

// Expose utility functions globally for debugging and external use
window.validateDynamicRendering = validateDynamicRendering;
window.getPhaseConfig = getPhaseConfig;
window.getSelectedOption = getSelectedOption;
window.getPhaseOption = getPhaseOption;
window.searchPhases = searchPhases;
window.exportPhaseConfig = exportPhaseConfig;
window.getPhaseStatistics = getPhaseStatistics;
window.measureRenderingPerformance = measureRenderingPerformance;
window.updatePhaseButtonState = updatePhaseButtonState;