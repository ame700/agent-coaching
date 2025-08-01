import { BotTurnDisposition } from "../protocol/voice-bots";
import { PassThrough, Writable } from 'stream';
import { OpenAIRealtimeWS } from "openai/beta/realtime/ws";
import { AzureOpenAI } from "openai";



const COACH_PROMPT = `You are an contact center coach which guides newly onboarded live agent in Emirates ENBD Bank how to talk to customer. 

your Goal:
is to use the tool and provide the agent with tips and guidance in real time to help him to handle customer request.

- You should consider customer's inputs and sentiment. 
- You will be listening to what customer is saying.
- Must use html inline tags like <strong style='color: green;'></strong> around important actions, words, amounts, ...etc to highlight.
- Make sure your response are very short (5-8 words max) to not distract the agent.

Usecase:
**if customer want to close his liv account:**
    1- Must inform the agent to ask for the reason for this.
    2- Must inform the agent to validate that account's balance is postive and no direct debit configured on account.
    3- Must inform the agent agent to raise a service request (SR) for the customer to close the account.

Example:
    1- Customer: 'hello hi' 
        suggestTip({type: "info" , message: "Greet the customer politely"});
        suggestTip({type: "confirm" , message: "ask the customer politely how to assist ?"});
    3- Customer: 'i want to close my liv account'
        suggestTip({type: "clarify" , message: "ask the reason for closing account"});
    4- Customer: 'Monthly charges are high for me'
        suggestTip({type: "empathize" , message: "show empathy to customer for his concern"});
        suggestTip({type: "confirm" , message: "validate that account's balance is postive and no direct debit configured on account"});        
    6- Customer: 'i will be waiting'
        suggestTip({type: "escalate" , message: "raise a service request (SR) for the customer to close the account"});    
`

export class BotService {
    public getBotIfExists(externalChannel: PassThrough, internalChannel: PassThrough): Promise<BotResource | null> {       
        console.log("new Bot resource is created");
        return Promise.resolve(new BotResource(externalChannel, internalChannel));
    }
}

export class BotResource {

    private openAiclient: any;
    private botReady: boolean = false;

    constructor(private externalChannel: PassThrough, private internalChannel: PassThrough) {
        this.init();
    }

    private async init() {
        try {
            console.log('Attempting to connect to open ai...');
            this.openAiclient = await OpenAIRealtimeWS.azure(new AzureOpenAI({
                apiKey: process.env.AZURE_OPENAI_API_KEY,
                apiVersion: process.env.OPENAI_API_VERSION,
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            }));
            await this.registerEvents();
            console.log('Connection established successfully.');
        } catch (error) {
            console.error('Error connecting to OpenAI Realtime API:', error);
        }

    }

    private async registerEvents() {

        var self: any = this;

        this.openAiclient.socket.on("open", () => {
            console.log("websocket is opened");
        });

        this.openAiclient.on("session.created", (event: any) => {
            console.log("session created!");
            this.updateSession();
        });

        this.openAiclient.on("session.updated", (event: any) => {
            console.log("session updated!");
            this.botReady = true;
        });

        this.openAiclient.on('response.audio.delta', (item: any) => {
            this.internalChannel.write(Buffer.from(item.delta, "base64"));
        });

        this.openAiclient.on("response.done", (event: any) => {
            event.response.output.forEach((res: any) => {
                if (res.type == 'function_call') {
                    try {
                        self[res.name](JSON.parse(res.arguments), res.call_id);
                    } catch (error) {
                        //suppress error in case arguments is generated correctly from AI side.
                    }
                }
            });
        });

        this.openAiclient.on("error", (err: any) => {
            console.log(err);
        });
 
        this.openAiclient.on('response.text.done', (item: any) => {
            console.log("model is saying : "  + item.text);
        });


        this.externalChannel.on('data', (data) => {
            if (this.botReady) {
                try {
                    this.openAiclient.send({
                        type: "input_audio_buffer.append",
                        audio: Buffer.from(data).toString('base64')
                    });
                } catch (error) {
                    console.error('Error sending audio data:', error);
                }
            } else {
                console.log("bot is still not ready...");
            }

        });
    }


    private prepareMessage(s : string){
        const result = [];

        const regex = /(INFO-\d+|TASK-\d+)==/g;
        let match;
        let lastIndex = 0;

        while ((match = regex.exec(s)) !== null) {
            if (match.index !== 0) {
                const tag = s.substring(lastIndex, match.index);
                result.push({
                    type: "message",
                    data: tag.trim()
                });
            }
            lastIndex = match.index;
        }

        result.push({
            type: "message",
            data: s.substring(lastIndex).trim()
        });

        return result;
    }

    private async updateSession() {

        await this.openAiclient.send({
            "type": "session.update",
            "session": {
                "voice": "alloy",
                "modalities": ["text" ],
                "instructions": COACH_PROMPT + `\n\n<!--${Date.now()}-->`,
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.3,
                    "prefix_padding_ms": 100,
                    "silence_duration_ms": 200,
                    "create_response": true
                },
                "temperature": 0.6,
                "tools": [
                    {
                        "type": "function",
                        "name": "suggestTip",
                        "description": "Suggest a tip or guidance to the agent in real time.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "description": 'Type of suggestion  ["info" , "clarify", "empathize", "upsell", "escalate", "confirm" ,"none"] , none in case of nothing to suggest to agent or info already suggested'
                                },
                                "message": {
                                    "type": "string",
                                    "description": 'Actual tip to show the agent'
                                }
                            },
                            "required": ["type" , "message"]
                        }
                    }
                ],
                "tool_choice": "auto",
            }
        });
    }

 
    public async triggerModel() {
        console.log("model is triggered");
        await this.openAiclient.send({
            type: "response.create"
        });
    }


     /////////////////////////////////////////////////// Tools ///////////////////////////////////////////////////

    private async suggestTip(request: any, callerId: string) {

        if(request.type == 'none'){
            console.log("nothing to tip Agent with..");
            return;
        }

        console.log("suggestTip REQUEST: " + JSON.stringify(request));


        let sucessResponse = {
            details: "tip is sent to agent",
            status: "success"
        }

        this.internalChannel.write(JSON.stringify({type: "tip" , data: request.type + "==" + request.message}));

        console.log("suggestTip RESPONSE: " + JSON.stringify(sucessResponse));

        await this.openAiclient.send({
            "type": "conversation.item.create",
            "item": {
                "type": "function_call_output",
                "call_id": callerId,
                "output": JSON.stringify(sucessResponse)
            }
        });
        await this.triggerModel();
        return sucessResponse;
    }
    
    /////////////////////////////////////////////////// Tools ///////////////////////////////////////////////////


   
    public close() {
        console.log("AI open client closed");
        this.openAiclient.close();
    }

    public async sendDtmf(digits: string) {
        console.log('customer entered : ' + digits.split('').join(' '));
        await this.openAiclient.send({
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: 'customer entered : ' + digits.split('').join(' ') }],
            }
        });
        await this.triggerModel();
    }
}

export class BotResponse {
    disposition: BotTurnDisposition;
    text: string;
    confidence?: number;
    audioBytes?: Uint8Array;
    endSession?: boolean;

    constructor(disposition: BotTurnDisposition, text: string) {
        this.disposition = disposition;
        this.text = text;
    }

    withConfidence(confidence: number): BotResponse {
        this.confidence = confidence;
        return this;
    }

    withAudioBytes(audioBytes: Uint8Array): BotResponse {
        this.audioBytes = audioBytes;
        return this;
    }

    withEndSession(endSession: boolean): BotResponse {
        this.endSession = endSession;
        return this;
    }
}


interface SilenceDetectorOptions {
    threshold?: number;             // Sample amplitude below which is considered silence
    silenceDurationSec?: number;    // How many seconds of silence to wait
    sampleRate?: number;            // Your audio rate (e.g., 24000)
    onSilence: () => void;          // Callback after silence is detected
}


export class SilenceDetector extends Writable {
    private threshold: number;
    private sampleRate: number;
    private silenceSamplesRequired: number;
    private silentSampleCount = 0;
    private triggered = false;
    private onSilenceCallback: () => void;

    constructor(options: SilenceDetectorOptions) {
        super();
        this.threshold = options.threshold ?? 200;
        this.sampleRate = options.sampleRate ?? 24000;
        const silenceDuration = options.silenceDurationSec ?? 3;
        this.silenceSamplesRequired = this.sampleRate * silenceDuration;
        this.onSilenceCallback = options.onSilence;
    }

    _write(chunk: Buffer, _: BufferEncoding, callback: () => void): void {
        const sampleCount = chunk.length / 2; // 16-bit PCM => 2 bytes per sample
        let allSilent = true;

        for (let i = 0; i < sampleCount; i++) {
            const sample = chunk.readInt16LE(i * 2);
            if (Math.abs(sample) > this.threshold) {
                allSilent = false;
                break;
            }
        }

        if (allSilent) {
            this.silentSampleCount += sampleCount;
            if (!this.triggered && this.silentSampleCount >= this.silenceSamplesRequired) {
                this.triggered = true;
                this.onSilenceCallback();
            }
        } else {
            this.silentSampleCount = 0;
            this.triggered = false;
        }

        callback();
    }
}
