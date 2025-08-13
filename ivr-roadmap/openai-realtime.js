// OpenAI Realtime Integration for IVR Project Showcase
class OpenAIRealtimeClient {
    constructor() {
        this.ws = null;
        this.audioContext = null;
        this.microphone = null;
        this.processor = null;
        this.isConnected = false;
        this.isRecording = false;
        this.currentPhase = 1;
        this.audioSources = [];
        this.lastAudioSource = null;

        // Simple audio playback timing
        this.nextAudioTime = 0;
        
        // Azure OpenAI Configuration
        // IMPORTANT: Replace these with your actual Azure OpenAI values
        this.config = {
            // Your Azure OpenAI endpoint (e.g., 'https://your-resource-name.openai.azure.com')
            endpoint: 'https://ahmed-m88l6h9f-eastus2.cognitiveservices.azure.com', // Replace with your endpoint
            
            // Your Azure OpenAI API key
            apiKey: '',   // Replace with your API key
            
            // Your deployment name for the realtime model
            deployment: 'gpt-4o-mini-realtime-preview', // Replace with your deployment name
            
            // API version for Azure OpenAI Realtime
            apiVersion: '2024-10-01-preview'
        };
    }

    // Initialize the realtime connection
    async initialize(phaseNumber) {
        try {
            this.currentPhase = phaseNumber;
            
            // Request microphone permission
            await this.requestMicrophonePermission();
            
            // Connect to Azure OpenAI Realtime API
            await this.connect();
            
            // Configure session for the specific phase
            await this.configureSession();
            
            console.log('OpenAI Realtime initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize OpenAI Realtime:', error);
            throw error;
        }
    }

    // Request microphone permission
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 24000
            });
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Create audio processor for real-time audio processing
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.processor.onaudioprocess = (event) => {
                if (this.isRecording && this.isConnected) {
                    this.sendAudio(event.inputBuffer);
                }
            };
            
            this.microphone.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            console.log('Microphone permission granted and audio context initialized');
        } catch (error) {
            console.error('Microphone permission denied:', error);
            throw new Error('Microphone access is required for the call feature');
        }
    }

    // Connect to Azure OpenAI Realtime WebSocket
    async connect() {
        const wsUrl = this.buildWebSocketUrl();
        
        this.ws = new WebSocket(wsUrl, ['realtime', `realtime-${this.config.apiVersion}`]);
        
        // Add authentication header (for Azure OpenAI, this is done via URL parameter or subprotocol)
        return new Promise((resolve, reject) => {
            this.ws.onopen = () => {
                console.log('Connected to Azure OpenAI Realtime API');
                this.isConnected = true;
                
                // Send authentication message if needed
                this.sendMessage({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        instructions: 'You are a helpful assistant.',
                        voice: 'alloy',
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: 'whisper-1'
                        }
                    }
                });
                
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = (event) => {
                console.log('Disconnected from Azure OpenAI Realtime API', event.code, event.reason);
                this.isConnected = false;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                console.error('Failed to connect to:', wsUrl);
                reject(new Error(`WebSocket connection failed. Please check your Azure OpenAI endpoint and API key.`));
            };

            // Set timeout for connection
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout - please verify your Azure OpenAI configuration'));
                }
            }, 10000);
        });
    }

    

    // Build WebSocket URL for Azure OpenAI
    buildWebSocketUrl() {
        // Remove any trailing slashes from endpoint
        const cleanEndpoint = this.config.endpoint.replace(/\/$/, '');
        
        // Convert https to wss and build proper URL
        const wsEndpoint = cleanEndpoint.replace('https://', 'wss://');
        
        // Build the correct Azure OpenAI Realtime WebSocket URL
        const wsUrl = `${wsEndpoint}/openai/realtime?api-version=${this.config.apiVersion}&deployment=${this.config.deployment}&api-key=${this.config.apiKey}`;
        
        console.log('Connecting to:', wsUrl);
        return wsUrl;
    }

    // Configure session based on current phase
    async configureSession() {
        const sessionConfig = realtimePrompts.getSessionConfig(this.currentPhase);
        
        console.log(`Configuring session for Phase ${this.currentPhase}`, sessionConfig);
        console.log('voice:', sessionConfig.voice);
        const sessionUpdate = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions: sessionConfig.systemPrompt,
                voice: sessionConfig.voice || 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: sessionConfig.vadThreshold || 0.5,
                    prefix_padding_ms: sessionConfig.vadPrefixPadding || 300,
                    silence_duration_ms: sessionConfig.vadSilenceDuration || 500
                },
                tools: sessionConfig.tools || [],
                tool_choice: 'auto',
                temperature: sessionConfig.temperature || 0.7,
                max_response_output_tokens: sessionConfig.maxTokens || 300
            }
        };

        this.sendMessage(sessionUpdate);
        console.log(`Session configured for Phase ${this.currentPhase}`);
    }

    // Send message to the API
    sendMessage(message) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
        }
    }

    // Handle incoming messages
    handleMessage(message) {
        switch (message.type) {
            case 'session.created':
                console.log('Session created:', message.session);
                break;
                
            case 'session.updated':
                console.log('Session updated:', message.session);
                this.sendMessage({
                        type: 'response.create'
                    });
                break;
                
            case 'conversation.item.created':
                console.log('Conversation item created:', message.item);
                break;
                
            case 'response.created':
                console.log('Response started');
                // Reset audio timing for new response
                this.resetAudioTiming();
                break;
                
            case 'response.audio.delta':
                this.playAudioDelta(message.delta);
                break;
                
            case 'response.audio.done':
                console.log('Audio response completed - all chunks received');
                break;
                
            case 'response.audio_transcript.delta':
                this.updateTranscriptionDelta(message.delta, 'assistant');
                break;
                
            case 'response.audio_transcript.done':
                this.finalizeTranscription('assistant');
                break;
                
            case 'conversation.item.input_audio_transcription.completed':
                this.updateTranscription(message.transcript, 'user');
                break;
                
            case 'conversation.item.input_audio_transcription.failed':
                console.log('Audio transcription failed:', message.error);
                break;
                
            case 'response.done':
                console.log('Response completed:', message.response);
                break;
                
            case 'error':
                console.error('API Error:', message.error);
                break;
                
            default:
                console.log('Unhandled message type:', message.type, message);
        }
    }

    // Send audio data to the API
    sendAudio(audioBuffer) {
        if (!this.isConnected) return;

        // Convert Float32Array to Int16Array (PCM16)
        const float32Data = audioBuffer.getChannelData(0);
        const int16Data = new Int16Array(float32Data.length);
        
        for (let i = 0; i < float32Data.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, float32Data[i] * 32768));
        }

        // Convert to base64
        const audioBase64 = this.arrayBufferToBase64(int16Data.buffer);

        const audioMessage = {
            type: 'input_audio_buffer.append',
            audio: audioBase64
        };

        this.sendMessage(audioMessage);
    }

    // Convert ArrayBuffer to base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Simple audio playback - schedule each chunk to play sequentially
   playAudioDelta(audioBase64) {
    try {
        const audioData = atob(audioBase64);
        const audioArray = new Int16Array(audioData.length / 2);

        for (let i = 0; i < audioArray.length; i++) {
            const byte1 = audioData.charCodeAt(i * 2);
            const byte2 = audioData.charCodeAt(i * 2 + 1);
            audioArray[i] = byte1 | (byte2 << 8);
            if (audioArray[i] > 32767) audioArray[i] -= 65536;
        }

        const audioBuffer = this.audioContext.createBuffer(1, audioArray.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < audioArray.length; i++) {
            channelData[i] = audioArray[i] / 32768.0;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.8;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const currentTime = this.audioContext.currentTime;
        const startTime = Math.max(currentTime + 0.01, this.nextAudioTime);

        source.start(startTime);

        // Track the source
        this.lastAudioSource = source;
        this.audioSources.push(source);

        source.onended = () => {
            console.log('Audio chunk finished playing');
        };

        this.nextAudioTime = startTime + audioBuffer.duration;

        console.log(`Audio chunk scheduled: start=${startTime.toFixed(3)}, duration=${audioBuffer.duration.toFixed(3)}, next=${this.nextAudioTime.toFixed(3)}`);
    } catch (error) {
        console.error('Error playing audio delta:', error);
    }
}

    // Reset audio timing when starting new conversation
    resetAudioTiming() {
        this.nextAudioTime = this.audioContext ? this.audioContext.currentTime : 0;
    }

    // Update transcription with delta (word by word) - accumulate in current message
    updateTranscriptionDelta(text, sender) {
        const transcriptionBox = document.getElementById('transcription-box');
        if (!transcriptionBox) return;

        // Remove placeholder if it exists
        const placeholder = transcriptionBox.querySelector('.transcription-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // Find or create the current message element
        let currentMessage = transcriptionBox.querySelector(`.current-${sender}-message`);
        
        if (!currentMessage) {
            currentMessage = document.createElement('div');
            currentMessage.className = `current-${sender}-message`;
            currentMessage.style.marginBottom = '15px';
            currentMessage.style.padding = '12px';
            currentMessage.style.background = 'rgba(255, 255, 255, 0.08)';
            currentMessage.style.borderRadius = '8px';
            currentMessage.style.borderLeft = sender === 'assistant' ? '3px solid #4CAF50' : '3px solid #2196F3';
            currentMessage.innerHTML = `<strong>${sender === 'assistant' ? 'Agent' : 'You'}:</strong> `;
            
            transcriptionBox.appendChild(currentMessage);
        }

        // Append the delta text to the current message
        const textSpan = currentMessage.querySelector('.message-text') || document.createElement('span');
        if (!textSpan.classList.contains('message-text')) {
            textSpan.className = 'message-text';
            currentMessage.appendChild(textSpan);
        }
        
        textSpan.textContent += text;
        transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    }

    // Finalize transcription (called when audio_transcript.done)
    finalizeTranscription(sender) {
        const transcriptionBox = document.getElementById('transcription-box');
        if (!transcriptionBox) return;

        // Remove the "current" class so new messages can be created
        const currentMessage = transcriptionBox.querySelector(`.current-${sender}-message`);
        if (currentMessage) {
            currentMessage.classList.remove(`current-${sender}-message`);
        }
    }

    // Update transcription in the UI (for complete messages)
    updateTranscription(text, sender) {
        const transcriptionBox = document.getElementById('transcription-box');
        if (!transcriptionBox) return;

        // Remove placeholder if it exists
        const placeholder = transcriptionBox.querySelector('.transcription-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        const transcriptionText = document.createElement('div');
        transcriptionText.style.marginBottom = '15px';
        transcriptionText.style.padding = '12px';
        transcriptionText.style.background = 'rgba(255, 255, 255, 0.08)';
        transcriptionText.style.borderRadius = '8px';
        transcriptionText.style.borderLeft = sender === 'assistant' ? '3px solid #4CAF50' : '3px solid #2196F3';
        transcriptionText.innerHTML = `<strong>${sender === 'assistant' ? 'Agent' : 'You'}:</strong> <span class="message-text">${text}</span>`;
        
        transcriptionBox.appendChild(transcriptionText);
        transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    }

    // Start recording
    startRecording() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.isRecording = true;
        console.log('Started recording');
    }

    // Stop recording
    stopRecording() {
        this.isRecording = false;
        console.log('Stopped recording');
    }

    // Commit audio buffer (trigger processing)
    commitAudio() {
        if (this.isConnected) {
            this.sendMessage({
                type: 'input_audio_buffer.commit'
            });
        }
    }

    // Disconnect from the API
    disconnect() {
        this.stopRecording();
        
        // Reset audio timing
        this.nextAudioTime = 0;
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isConnected = false;
        console.log('Disconnected from OpenAI Realtime API');
    }

    // Check if connected
    isConnectedToAPI() {
        return this.isConnected;
    }
}

// Global instance
const openAIRealtime = new OpenAIRealtimeClient();