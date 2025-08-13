// Audio file mappings for each phase
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
    
    // Deactivate all timeline items
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // If it wasn't active, open it
    if (!isCurrentlyActive) {
        phaseItem.classList.add('active');
        document.querySelector(`[data-timeline="${phaseNumber}"]`).classList.add('active');
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

// Call button handling with OpenAI Realtime integration
document.querySelectorAll('.btn-call').forEach(btn => {
    btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const phaseItem = this.closest('.phase-item');
        const phaseNumber = parseInt(phaseItem.dataset.phase);
        const phase = phases[phaseNumber];
        
        // Update UI
        document.getElementById('current-step-info').textContent = `${phase.label}: ${phase.title}`;
        document.getElementById('call-overlay').classList.add('active');
        
        // Clear transcription box
        const transcriptionBox = document.getElementById('transcription-box');
        transcriptionBox.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">Connecting to OpenAI Realtime API...</div>';
        
        try {
            // Initialize OpenAI Realtime for this phase
            await openAIRealtime.initialize(phaseNumber);
            
            // Update UI to show connected state
            transcriptionBox.innerHTML = '<div style="color: #4CAF50; text-align: center; margin-top: 50px;">✅ Connected! You can now speak...</div>';
            
            // Start recording
            openAIRealtime.startRecording();
            
            // Update call status
            document.querySelector('.call-status').textContent = '🎤 Live with AI Agent';
            document.querySelector('.call-status').style.color = '#4CAF50';
            
        } catch (error) {
            console.error('Failed to initialize OpenAI Realtime:', error);
            transcriptionBox.innerHTML = `<div style="color: #f44336; text-align: center; margin-top: 50px;">❌ Connection failed: ${error.message}<br><br>Please check your API configuration.</div>`;
        }
    });
});

// Close call overlay with proper cleanup
document.getElementById('close-call').addEventListener('click', function() {
    closeCallOverlay();
});

// Enhanced control button interactions
document.querySelector('.control-btn.mute').addEventListener('click', function() {
    const isMuted = this.classList.contains('muted');
    if (isMuted) {
        this.style.background = 'rgba(255, 152, 0, 0.9)';
        this.textContent = '🔇';
        this.classList.remove('muted');
        this.title = 'Mute';
        
        // Resume recording if connected to OpenAI
        if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
            openAIRealtime.startRecording();
        }
    } else {
        this.style.background = 'rgba(255, 255, 255, 0.4)';
        this.textContent = '🔊';
        this.classList.add('muted');
        this.title = 'Unmute';
        
        // Stop recording if connected to OpenAI
        if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
            openAIRealtime.stopRecording();
        }
    }
});

document.querySelector('.control-btn.hangup').addEventListener('click', function() {
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
    document.getElementById('call-overlay').classList.remove('active');
    
    // Disconnect OpenAI Realtime if connected
    if (typeof openAIRealtime !== 'undefined' && openAIRealtime.isConnectedToAPI()) {
        openAIRealtime.disconnect();
    }
    
    // Reset call status
    document.querySelector('.call-status').textContent = '📞 Calling Contact Center';
    document.querySelector('.call-status').style.color = '#4CAF50';
    
    // Reset mute button
    const muteBtn = document.querySelector('.control-btn.mute');
    muteBtn.style.background = 'rgba(255, 152, 0, 0.9)';
    muteBtn.textContent = '🔇';
    muteBtn.classList.remove('muted');
    muteBtn.title = 'Mute';
    
    stopCallSimulation();
    stopCallTimer();
}

// Call simulation (fallback for demo purposes)
function startCallSimulation() {
    const transcriptionBox = document.getElementById('transcription-box');
    const sampleTranscriptions = [
        "Agent: Hello, welcome to our customer service center.",
        "Agent: Thank you for calling. How can I assist you today?",
        "Caller: I'm having issues with my account setup.",
        "Agent: I understand. Let me pull up your information...",
        "Agent: I can see your account details here.",
        "Agent: Let me help you resolve this issue step by step.",
        "Caller: That sounds perfect, thank you.",
        "Agent: I'll need to verify a few details first.",
        "Caller: Sure, I have all my information ready.",
        "Agent: Perfect, let me walk you through the process."
    ];

    let index = 0;
    transcriptionBox.innerHTML = '';
    startCallTimer();

    const interval = setInterval(() => {
        if (index < sampleTranscriptions.length) {
            const transcriptionText = document.createElement('div');
            transcriptionText.style.marginBottom = '15px';
            transcriptionText.style.padding = '12px';
            transcriptionText.style.background = 'rgba(255, 255, 255, 0.08)';
            transcriptionText.style.borderRadius = '8px';
            transcriptionText.style.borderLeft = index % 2 === 0 ? '3px solid #4CAF50' : '3px solid #2196F3';
            transcriptionText.textContent = sampleTranscriptions[index];
            transcriptionBox.appendChild(transcriptionText);
            transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
            index++;
        } else {
            clearInterval(interval);
        }
    }, 3000);

    transcriptionBox.dataset.intervalId = interval;
}

function startCallTimer() {
    callSeconds = 23; // Start from 23 seconds as shown in design
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
        document.getElementById('call-timer').textContent = '00:23';
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

// Initialize with first phase active
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('[data-timeline="1"]').classList.add('active');
});

// Stop any playing audio when page unloads
window.addEventListener('beforeunload', function() {
    if (currentAudio) {
        currentAudio.pause();
    }
});