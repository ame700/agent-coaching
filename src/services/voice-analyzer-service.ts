import { BotTurnDisposition } from "../protocol/voice-bots";
import { PassThrough, Writable } from 'stream';
import { OpenAIRealtimeWS } from "openai/beta/realtime/ws";
import { AzureOpenAI } from "openai";

export class VoiceAnalyzerService {
    public getBotIfExists(externalChannel: PassThrough, internalChannel: PassThrough): Promise<VoiceAnalyzerResource | null> {

        console.log("new voiceAnalyzer resource is created");
        return Promise.resolve(new VoiceAnalyzerResource(externalChannel, internalChannel));
    }

}

/*
* This class provides support for the various methods needed to interact with an resource.
*/


export class VoiceAnalyzerResource {

    private openAiclient: any;
    private botReady: boolean = false;
    private botSpeaking: boolean = false;


    constructor(private externalChannel: PassThrough, private internalChannel: PassThrough) {
        this.init();
    }

    private async init() {
        try {
            console.log('Attempting to connect to open ai...');
            this.openAiclient = await OpenAIRealtimeWS.azure(new AzureOpenAI({
                apiKey: process.env.AZURE_OPENAI_API_KEY,
                apiVersion: process.env.OPENAI_API_VERSION,
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME_MINI,
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
        
        this.openAiclient.on("response.done", (event: any) => {
            event.response.output.forEach((res: any) => {
                if (res.type == 'function_call') {
                    try {
                        this.botSpeaking = true;
                        self[res.name](JSON.parse(res.arguments), res.call_id);
                        this.botSpeaking = false;
                    } catch (error) {
                        //suppress error in case arguments is generated correctly from AI side.
                    }
                }
            });
        });

        this.openAiclient.on("error", (err: any) => {
            console.log(err);
        });
 
        this.openAiclient.on('response.audio.done', (item: any) => {
            this.botSpeaking = false;
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


    private async updateSession() {
        let prompt = `you are audio analyzer tool, your goal is to analyze the audio and provide insights about the audio like:

        - Detect the intent of the speaker. 
        - Detect the emotions of customer ex: confused, angry, or satisfied ..etc.
        `;
        await this.openAiclient.send({
            "type": "session.update",
            "session": {
                "voice": "alloy",
                "modalities": ["text"],
                "instructions": prompt + `\n\n<!--${Date.now()}-->`,
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
                        "name": "updateAudioInsights",
                        "description": "use this function to update the audio insights like intent and emotions.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "intent": {
                                    "type": "string",
                                    "description": "ex: the intent of the speaker, Ex: Hold Transaction Inquiry , Open Account , ..etc ,otherwise 'N/A' if not yet determined"
                                },
                                "emotions": {
                                    "type": "string",
                                    "description": "the emotions of the speaker in the audio , ex:'Calm' , 'Positive' , 'Angry' , 'Fraustrated' , ...etc, otherwise 'N/A' if not yet determined"
                                }
                            },
                            "required": ["intent" , "emotions"]
                        }
                    }
                ],
                "tool_choice": "required",
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
    
    private async updateAudioInsights(request: any, callerId: string) {

        console.log("updateAudioInsights REQUEST: " + JSON.stringify(request));


        let sucessResponse = {
            details: "voice Insights is updated",
            status: "success"
        }

        this.internalChannel.write(JSON.stringify({type: "action" , data: {code: "UPDATE_INSIGHTS" , ref: JSON.stringify(request) }}));

        console.log("updateAudioInsights RESPONSE: " + JSON.stringify(sucessResponse));

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

    private async sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

  

    public close() {
        console.log("AI open client closed");
        this.openAiclient.close();
    }

}
