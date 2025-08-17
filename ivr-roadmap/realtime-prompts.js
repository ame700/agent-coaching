const phaseConfigs = {
    1: {
        title: "Inbound GoLive - AI IVR",
        label: "Q4 2025 - 10 Oct",
        year: 2025,
        description: "44 AI Journeys. 11Labs (Best AI voice startup) for Arabic. Azure for English.",
        hasMultipleJourneys: true,
        hasAudio: true,
        hasCall: true,
        hasVideo: false,
        options: {
            "welcome": {
                label: "Welcome & Authentication",
                audio: './audio/phase1.mp3',
                prompt: "You are an AI assistant helping customers with welcome and authentication. Be friendly, secure, and guide them through the authentication process step by step."
            },
            "balance": {
                label: "Balance Inquiry",
                audio: './audio/phase1.mp3',
                prompt: "You are an AI assistant helping customers check their account balance. Be precise, helpful, and provide clear balance information."
            },
            "transfer": {
                label: "Fund Transfer",
                audio: './audio/phase1.mp3',
                prompt: "You are an AI assistant helping customers with fund transfers. Be secure, thorough, and verify all transfer details carefully."
            },
            "support": {
                label: "Technical Support",
                audio: './audio/phase1.mp3',
                prompt: "You are an AI technical support assistant. Be patient, solution-oriented, and guide customers through troubleshooting steps."
            }
        }
    },
    2: {
        title: "Proactive Journeys",
        label: "Q4 2025 - 10 Nov",
        year: 2025,
        description: "Card Activation, IPP, Transfer Issues, Pending Service Requests",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: false,
        options: {
            "default": {
                label: "Proactive Outbound",
                audio: './audio/phase1.mp3',
                prompt: "You are making proactive outbound calls for various campaigns including card activation, IPP enrollment, transfer issue resolution, and pending service requests. Be helpful, professional, and focused on resolving customer needs."
            }
        }
    },
    3: {
        title: "New Natural Voice",
        label: "Q1 2026 - Feb",
        year: 2026,
        description: "Enhanced natural voice technology for English and Hindi with improved prosody and emotion.",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: true,
        options: {
            "default": {
                label: "Natural Voice Demo",
                audio: './audio/phase1.mp3',
                video: './videos/phase3-natural-voice-demo.mp4',
                prompt: "Demonstrate the new natural voice technology with improved prosody, emotion, and human-like speech patterns for English and Hindi.",
                transcription: `
                    <div class="static-transcription">
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            Hello! Welcome to our enhanced natural voice system. As you can hear, my voice now sounds much more natural and expressive, with improved prosody and emotional nuances that make conversations feel more human and engaging.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            Wow, that does sound much more natural than before! It's like talking to a real person.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            Thank you! Our new voice technology can now express emotions like excitement, concern, or empathy, and adjust tone based on the conversation context. This creates a more personalized and comfortable experience for our customers.
                        </div>
                    </div>
                `
            }
        }
    },
    4: {
        title: "Agentic AI IVR",
        label: "Q1 2026 - Mar",
        year: 2026,
        description: "AI IVR actions on your behalf for 5 use cases: Amazon refund tracking, airline purchase conversion to IPP, etc.",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: true,
        options: {
            "default": {
                label: "Agentic AI Demo",
                audio: './audio/phase1.mp3',
                video: './videos/phase4-agentic-demo.mp4',
                prompt: "You are an advanced AI agent that can perform actions on behalf of customers, including tracking refunds, converting purchases to installment plans, and handling complex multi-step transactions across different platforms.",
                transcription: `
                    <div class="static-transcription">
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            Can you check if I received my Amazon refund for order #123456 and also convert my airline ticket purchase to an installment plan?
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            I'll handle both requests for you. Let me check your Amazon refund status... I can see that your refund of $89.99 was processed 3 days ago and should appear in your account within 1-2 business days. Now for your airline purchase - I found your $1,200 ticket purchase from yesterday. I can convert this to a 12-month plan with 0% interest. Would you like me to proceed?
                        </div>
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            Yes, please go ahead with the installment plan.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            Perfect! I've successfully converted your airline purchase to a 12-month installment plan. Your first payment of $100 will be due next month. I'm also sending you a confirmation email with all the details.
                        </div>
                    </div>
                `
            }
        }
    },
    5: {
        title: "Outbound AI Calls",
        label: "Q2 2026 - Apr",
        year: 2026,
        description: "AI calls to customers for debt collection, lead follow-up, and customer engagement campaigns.",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: false,
        options: {
            "default": {
                label: "Outbound Campaigns",
                audio: './audio/phase1.mp3',
                prompt: "You are making outbound AI calls to customers for debt collection, lead follow-up, and customer engagement campaigns. Be professional, empathetic, and focused on finding solutions that work for both the customer and the organization."
            }
        }
    },
    6: {
        title: "Language Switching",
        label: "Q3 2026",
        year: 2026,
        description: "Multi-language support allowing seamless switching between English, Arabic, and Hindi during conversations.",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: true,
        options: {
            "default": {
                label: "Multilingual Demo",
                audio: './audio/phase1.mp3',
                video: './videos/phase6-multilingual-demo.mp4',
                prompt: "Demonstrate seamless language switching capabilities between English, Arabic, and Hindi during conversations, with automatic language detection and context preservation.",
                transcription: `
                    <div class="static-transcription">
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            Hello! How can I help you today?
                        </div>
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            أريد التحدث بالعربية من فضلك
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            بالطبع! كيف يمكنني مساعدتك اليوم؟ أستطيع التحدث بالعربية والإنجليزية والهندية.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            Actually, can we switch to English? I want to check my account balance.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            Of course! No problem switching to English. I'll help you check your account balance right away.
                        </div>
                    </div>
                `
            }
        }
    },
    7: {
        title: "Agentic AI IVR 2",
        label: "Q3 2026",
        year: 2026,
        description: "Enhanced AI IVR with 10 advanced use cases including complex multi-step transactions and cross-platform integrations.",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: false,
        options: {
            "default": {
                label: "Enhanced Agentic AI",
                audio: './audio/phase1.mp3',
                prompt: "You are an advanced AI agent with enhanced capabilities for complex multi-step transactions, cross-platform integrations, and predictive customer service."
            }
        }
    },
    8: {
        title: "Next Best Offer In Call Context",
        label: "Q4 2026",
        year: 2026,
        description: "Real-time AI-powered offer selection and personalization during ongoing customer conversations.",
        hasMultipleJourneys: false,
        hasAudio: true,
        hasCall: true,
        hasVideo: true,
        options: {
            "default": {
                label: "Next Best Offer Demo",
                audio: './audio/phase1.mp3',
                video: './videos/phase8-nbo-demo.mp4',
                prompt: "You provide real-time personalized offers and recommendations based on conversation context, customer profile, and predictive analytics. Focus on delivering value to the customer while identifying cross-sell and upsell opportunities.",
                transcription: `
                    <div class="static-transcription">
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            I'm planning to make a large purchase next month for my business.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            That's great! Based on your spending patterns, business profile, and credit history, I can offer you a special business promotion: 0% APR for the next 6 months on purchases over $1,000, plus 2% cashback on business expenses. This could save you significant money on your upcoming purchase. Would you like me to activate this offer for your account?
                        </div>
                        <div class="dialogue">
                            <span class="speaker">Customer:</span>
                            That sounds perfect! Yes, please activate it.
                        </div>
                        <div class="dialogue">
                            <span class="speaker">AI Agent:</span>
                            Excellent! I've activated the business promotion on your account. You'll also receive priority customer service and dedicated business support. Is there anything else I can help you with regarding your upcoming purchase?
                        </div>
                    </div>
                `
            }
        }
    }
};

// Realtime Prompts and Session Configuration
const realtimePrompts = {
    phase1: {
        systemPrompt: `You are a helpful AI assistant for a customer service center specializing in inbound customer support. Adapt your responses based on the selected journey type.`,
        voice: 'alloy',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase2: {
        systemPrompt: `You are an AI assistant making proactive outbound calls to customers. Be professional, helpful, and focus on resolving customer needs efficiently.`,
        voice: 'ash',
        temperature: 0.7,
        maxTokens: 300
    },

    phase3: {
        systemPrompt: `You are demonstrating advanced natural voice technology with improved prosody and emotional expression. Showcase the human-like qualities of the new voice system.`,
        voice: 'ballad',
        temperature: 0.6,
        maxTokens: 300,
    },

    phase4: {
        systemPrompt: `You are an advanced agentic AI that can perform complex actions on behalf of customers across multiple platforms and systems. Be confident and capable.`,
        voice: 'coral',
        temperature: 0.7,
        maxTokens: 400,
    },

    phase5: {
        systemPrompt: `You are making outbound AI calls for various campaigns. Be professional, empathetic, and solution-oriented while respecting customer preferences.`,
        voice: 'echo',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase6: {
        systemPrompt: `You can seamlessly switch between English, Arabic, and Hindi languages during conversations. Maintain context and provide natural transitions between languages.`,
        voice: 'sage',
        temperature: 0.6,
        maxTokens: 350,
    },

    phase7: {
        systemPrompt: `You are an advanced AI agent with enhanced capabilities for complex multi-step transactions, cross-platform integrations, and predictive customer service.`,
        voice: 'verse',
        temperature: 0.7,
        maxTokens: 400,
    },

    phase8: {
        systemPrompt: `You provide real-time personalized offers and recommendations based on conversation context and customer analytics. Focus on value creation and customer satisfaction.`,
        voice: 'shimmer',
        temperature: 0.8,
        maxTokens: 350,
    },

    getSessionConfig(phaseNumber) {
        const phaseKey = `phase${phaseNumber}`;
        const baseConfig = this[phaseKey] || this.phase1;
        
        // Get the specific prompt for the selected option if phase has multiple journeys
        const phaseConfig = phaseConfigs[phaseNumber];
        if (phaseConfig) {
            let selectedOption = 'default';
            
            // Only get dropdown selection for phases with multiple journeys
            if (phaseConfig.hasMultipleJourneys) {
                const select = document.querySelector(`#phase${phaseNumber}-options`);
                selectedOption = select ? select.value : Object.keys(phaseConfig.options)[0];
            }
            
            const option = phaseConfig.options[selectedOption];
            if (option?.prompt) {
                return {
                    ...baseConfig,
                    systemPrompt: option.prompt
                };
            }
        }
        
        return baseConfig;
    },
};

// Phase rendering utility class
class PhaseRenderer {
    constructor() {
        this.container = null;
    }

    // Initialize and render all phases
    init(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error('Container not found:', containerSelector);
            return;
        }
        
        this.renderPhases();
    }

    // Group phases by year
    groupPhasesByYear() {
        const yearGroups = {};
        
        Object.entries(phaseConfigs).forEach(([phaseId, config]) => {
            const year = config.year;
            if (!yearGroups[year]) {
                yearGroups[year] = [];
            }
            yearGroups[year].push({ id: phaseId, ...config });
        });
        
        return yearGroups;
    }

    // Render all phases grouped by year
    renderPhases() {
        const yearGroups = this.groupPhasesByYear();
        const sortedYears = Object.keys(yearGroups).sort();
        
        this.container.innerHTML = '';
        
        sortedYears.forEach(year => {
            const yearGroupElement = this.createYearGroup(year, yearGroups[year]);
            this.container.appendChild(yearGroupElement);
        });
    }

    // Create year group container
    createYearGroup(year, phases) {
        const yearGroup = document.createElement('div');
        yearGroup.className = 'year-group';
        
        // Year header
        const yearHeader = document.createElement('div');
        yearHeader.className = 'year-header';
        yearHeader.textContent = year;
        yearGroup.appendChild(yearHeader);
        
        // Add phases for this year
        phases.forEach(phase => {
            const phaseElement = this.createPhaseElement(phase);
            yearGroup.appendChild(phaseElement);
        });
        
        return yearGroup;
    }

    // Create individual phase element
    createPhaseElement(phase) {
        const phaseItem = document.createElement('div');
        phaseItem.className = 'phase-item';
        phaseItem.setAttribute('data-phase', phase.id);
        
        // Add active class to first phase
        if (phase.id === '1') {
            phaseItem.classList.add('active');
        }
        
        // Phase header
        const phaseHeader = this.createPhaseHeader(phase);
        phaseItem.appendChild(phaseHeader);
        
        // Phase details (initially hidden)
        const phaseDetails = this.createPhaseDetails(phase);
        phaseItem.appendChild(phaseDetails);
        
        return phaseItem;
    }

    // Create phase header
    createPhaseHeader(phase) {
        const phaseHeader = document.createElement('div');
        phaseHeader.className = 'phase-header';
        
        const phaseInfo = document.createElement('div');
        phaseInfo.className = 'phase-info';
        
        const phaseLabel = document.createElement('div');
        phaseLabel.className = 'phase-label';
        phaseLabel.textContent = phase.label;
        
        const phaseTitle = document.createElement('div');
        phaseTitle.className = 'phase-title';
        phaseTitle.textContent = phase.title;
        
        phaseInfo.appendChild(phaseLabel);
        phaseInfo.appendChild(phaseTitle);
        
        const phaseToggle = document.createElement('div');
        phaseToggle.className = 'phase-toggle';
        phaseToggle.textContent = '+';
        
        phaseHeader.appendChild(phaseInfo);
        phaseHeader.appendChild(phaseToggle);
        
        return phaseHeader;
    }

    // Create phase details
    createPhaseDetails(phase) {
        const phaseDetails = document.createElement('div');
        phaseDetails.className = 'phase-details';
        
        const phaseContent = document.createElement('div');
        phaseContent.className = 'phase-content';
        
        // Description
        const phaseDescription = document.createElement('div');
        phaseDescription.className = 'phase-description';
        phaseDescription.textContent = phase.description;
        phaseContent.appendChild(phaseDescription);
        
        // Option selector (if multiple journeys)
        if (phase.hasMultipleJourneys) {
            const optionSelector = this.createOptionSelector(phase);
            phaseContent.appendChild(optionSelector);
        }
        
        // Action buttons
        const actionButtons = this.createActionButtons(phase);
        phaseContent.appendChild(actionButtons);
        
        phaseDetails.appendChild(phaseContent);
        return phaseDetails;
    }

    // Create option selector dropdown
    createOptionSelector(phase) {
        const optionSelector = document.createElement('div');
        optionSelector.className = 'option-selector';
        
        const label = document.createElement('label');
        label.setAttribute('for', `phase${phase.id}-options`);
        label.textContent = 'Select Journey:';
        
        const select = document.createElement('select');
        select.id = `phase${phase.id}-options`;
        select.setAttribute('data-phase', phase.id);
        
        // Add options
        Object.entries(phase.options).forEach(([key, option]) => {
            const optionElement = document.createElement('option');
            optionElement.value = key;
            optionElement.textContent = option.label;
            select.appendChild(optionElement);
        });
        
        optionSelector.appendChild(label);
        optionSelector.appendChild(select);
        
        return optionSelector;
    }

    // Create action buttons
    createActionButtons(phase) {
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        // Play Audio button
        if (phase.hasAudio) {
            const playButton = this.createButton('play', phase.id, 'Play Audio', 
                '<svg class="icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>');
            actionButtons.appendChild(playButton);
        }
        
        // Start Call button
        if (phase.hasCall) {
            const callButton = this.createButton('call', phase.id, 'Start Call',
                '<svg class="icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>');
            actionButtons.appendChild(callButton);
        }
        
        // Watch Demo button
        if (phase.hasVideo) {
            const videoButton = this.createButton('video', phase.id, 'Watch Demo',
                '<svg class="icon" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>');
            actionButtons.appendChild(videoButton);
        }
        
        return actionButtons;
    }

    // Create individual button
    createButton(type, phaseId, text, iconHtml) {
        const button = document.createElement('button');
        button.className = `btn btn-${type}`;
        button.setAttribute('data-phase', phaseId);
        button.innerHTML = `${iconHtml} ${text}`;
        return button;
    }
}

// Make configurations globally available
window.phaseConfigs = phaseConfigs;
window.realtimePrompts = realtimePrompts;
window.PhaseRenderer = PhaseRenderer;