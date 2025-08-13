// Realtime Prompts and Session Configuration for Each Quarter
const realtimePrompts = {
    phase1: {
        systemPrompt: ``,
        voice: 'alloy',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase2: {
        systemPrompt: ``,
        voice: 'ash',
        temperature: 0.7,
        maxTokens: 300
    },

    phase4: {
        systemPrompt: ``,
        voice: 'ballad',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase5: {
        systemPrompt: ``,
        voice: 'coral',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase6: {
        systemPrompt: ``,
        voice: 'echo',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase7: {
        systemPrompt: ``,
        voice: 'sage',
        temperature: 0.7,
        maxTokens: 300,
    },

    phase8: {
        systemPrompt: ``,
        voice: 'verse',
        temperature: 0.7,
        maxTokens: 300,
    },



    getSessionConfig(phaseNumber) {
        const phaseKey = `phase${phaseNumber}`;
        return this[phaseKey] || this.phase1; // Default to phase1 if not found
    },
};