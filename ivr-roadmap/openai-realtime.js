// OpenAI Realtime Integration for IVR Project Showcase - BATCH RECORDING VERSION
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
        this.recordedAudioChunks = []; // Store recorded audio chunks
        this.hasActiveResponse = false; // Track if response is in progress

        // Simple audio playback timing
        this.nextAudioTime = 0;
        
        // Azure OpenAI Configuration
        this.config = {
            endpoint: 'https://ahmed-m88l6h9f-eastus2.cognitiveservices.azure.com',
            deployment: 'gpt-4o-mini-realtime-preview',
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
                    // CHANGED: Store audio chunks instead of sending immediately
                    this.storeAudioChunk(event.inputBuffer);
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
        
        return new Promise((resolve, reject) => {
            this.ws.onopen = () => {
                console.log('Connected to Azure OpenAI Realtime API');
                this.isConnected = true;
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = (event) => {
                console.log('Disconnected from Azure OpenAI Realtime API', event.code, event.reason);
                this.isConnected = false;
                this.hasActiveResponse = false;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(new Error(`WebSocket connection failed. Please check your Azure OpenAI endpoint and API key.`));
            };

            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout - please verify your Azure OpenAI configuration'));
                }
            }, 10000);
        });
    }

    // Build WebSocket URL for Azure OpenAI
    buildWebSocketUrl() {
        const cleanEndpoint = this.config.endpoint.replace(/\/$/, '');
        const wsEndpoint = cleanEndpoint.replace('https://', 'wss://');
        const wsUrl = `${wsEndpoint}/openai/realtime?api-version=${this.config.apiVersion}&deployment=${this.config.deployment}&api-key=${this.config.apiKey}`;
        
        console.log('Connecting to:', wsUrl);
        return wsUrl;
    }

    // Configure session based on current phase
    async configureSession() {
        const sessionConfig = {
            systemPrompt: "You are a helpful AI assistant for a customer service center. Keep responses brief and professional.",
            voice: 'alloy',
            temperature: 0.7,
            maxTokens: 300
        };

        if (typeof realtimePrompts !== 'undefined') {
            const phaseConfig = realtimePrompts.getSessionConfig(this.currentPhase);
            Object.assign(sessionConfig, phaseConfig);
        }
        
        console.log(`Configuring session for Phase ${this.currentPhase}`, sessionConfig);
        
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
         
                tools: [],
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
        console.log('Received message:', message.type);
        
        switch (message.type) {
            case 'session.created':
                console.log('Session created');
                break;
                
            case 'session.updated':
                console.log('Session updated');
                // Send initial greeting
                if (!this.hasActiveResponse) {
                    this.hasActiveResponse = true;
                    this.sendMessage({
                        type: 'response.create',
                        response: {
                            modalities: ['text', 'audio'],
                            instructions: "Greet the user and ask how you can help them today."
                        }
                    });
                }
                break;
                
            case 'conversation.item.created':
                console.log('Conversation item created');
                break;
                
            case 'response.created':
                console.log('Response started');
                this.hasActiveResponse = true;
                this.resetAudioTiming();
                break;
                
            case 'response.audio.delta':
                this.playAudioDelta(message.delta);
                break;
                
            case 'response.audio.done':
                console.log('Audio response completed');
                break;
                
            case 'response.audio_transcript.delta':
                this.updateTranscriptionDelta(message.delta, 'assistant');
                break;
                
            case 'response.audio_transcript.done':
                this.finalizeTranscription('assistant');
                break;
                
            case 'conversation.item.input_audio_transcription.completed':
                if (message.transcript && message.transcript.trim().length > 0) {
                    this.updateTranscription(message.transcript, 'user');
                }
                break;
                
            case 'conversation.item.input_audio_transcription.failed':
                console.log('Audio transcription failed:', message.error);
                break;
                
            case 'response.done':
                console.log('Response completed');
                this.hasActiveResponse = false;
                break;
                
            case 'error':
                console.error('API Error:', message.error);
                this.hasActiveResponse = false;
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
        }
    }

    // NEW: Store audio chunks during recording
    storeAudioChunk(audioBuffer) {
        // Convert Float32Array to Int16Array (PCM16)
        const float32Data = audioBuffer.getChannelData(0);
        const int16Data = new Int16Array(float32Data.length);
        
        for (let i = 0; i < float32Data.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, float32Data[i] * 32768));
        }

        // Store the chunk
        this.recordedAudioChunks.push(int16Data);
    }

    // NEW: Send all recorded audio as one batch
    sendRecordedAudio() {
        if (this.recordedAudioChunks.length === 0) {
            console.log('No audio recorded to send');
            return;
        }

        console.log(`Sending ${this.recordedAudioChunks.length} audio chunks as batch`);

        // Calculate total length
        const totalLength = this.recordedAudioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        
        // Create combined array
        const combinedAudio = new Int16Array(totalLength);
        let offset = 0;
        
        for (const chunk of this.recordedAudioChunks) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        // Calculate duration
        const durationMs = (totalLength / 24000) * 1000;
        console.log(`Total audio duration: ${durationMs.toFixed(2)}ms`);

        // Only send if we have enough audio
        if (durationMs < 100) {
            console.log('Audio too short, not sending');
            this.recordedAudioChunks = []; // Clear chunks
            return;
        }

        // Convert to base64 and send
        const audioBase64 = this.arrayBufferToBase64(combinedAudio.buffer);
        
        // Send the complete audio
        this.sendMessage({
            type: 'input_audio_buffer.append',
            audio: audioBase64
        });

        // Commit the audio buffer
        this.sendMessage({
            type: 'input_audio_buffer.commit'
        });

        // Create response if no active response
        if (!this.hasActiveResponse) {
            this.hasActiveResponse = true;
            setTimeout(() => {
                this.sendMessage({
                    type: 'response.create',
                    response: {
                        modalities: ['text', 'audio']
                    }
                });
            }, 100);
        }

        // Clear recorded chunks for next recording
        this.recordedAudioChunks = [];
        console.log('Audio sent and chunks cleared');
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

    // Audio playback (unchanged)
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
            this.audioSources.push(source);
            this.nextAudioTime = startTime + audioBuffer.duration;

        } catch (error) {
            console.error('Error playing audio delta:', error);
        }
    }

    resetAudioTiming() {
        this.nextAudioTime = this.audioContext ? this.audioContext.currentTime : 0;
    }

    // Transcription methods (unchanged)
    updateTranscriptionDelta(text, sender) {
        const transcriptionBox = document.getElementById('transcription-box');
        if (!transcriptionBox) return;

        const placeholder = transcriptionBox.querySelector('.transcription-placeholder');
        if (placeholder) placeholder.remove();

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

        const textSpan = currentMessage.querySelector('.message-text') || document.createElement('span');
        if (!textSpan.classList.contains('message-text')) {
            textSpan.className = 'message-text';
            currentMessage.appendChild(textSpan);
        }
        
        textSpan.textContent += text;
        transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    }

    finalizeTranscription(sender) {
        const transcriptionBox = document.getElementById('transcription-box');
        if (!transcriptionBox) return;

        const currentMessage = transcriptionBox.querySelector(`.current-${sender}-message`);
        if (currentMessage) {
            currentMessage.classList.remove(`current-${sender}-message`);
        }
    }

    updateTranscription(text, sender) {
        const transcriptionBox = document.getElementById('transcription-box');
        if (!transcriptionBox || !text || text.trim().length < 2) return;

        const placeholder = transcriptionBox.querySelector('.transcription-placeholder');
        if (placeholder) placeholder.remove();

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


    // UPDATED: Start recording - clear previous chunks
    startRecording() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.isRecording = true;
        this.recordedAudioChunks = []; // Clear any previous recording
        console.log('Started recording - buffer cleared');
    }

    // UPDATED: Stop recording - send all recorded audio
    stopRecording() {
        this.isRecording = false;
        console.log('Stopped recording - sending audio');
        
        // Send all recorded audio as one batch
        this.sendRecordedAudio();
    }

    // Remove commitAudio method since we handle it in sendRecordedAudio

    // Disconnect from the API
    disconnect() {
        this.stopRecording();
        
        // Reset state
        this.nextAudioTime = 0;
        this.hasActiveResponse = false;
        this.recordedAudioChunks = [];
        
        // Stop all audio sources
        this.audioSources.forEach(source => {
            try { source.stop(); } catch (e) {}
        });
        this.audioSources = [];
        
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

    isConnectedToAPI() {
        return this.isConnected;
    }
}

// Global instance
const openAIRealtime = new OpenAIRealtimeClient();