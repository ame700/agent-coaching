import { WebSocket } from 'ws';
import {
    JsonStringMap,
    MediaParameter
} from '../protocol/core';
import {
    ClientMessage,
    DisconnectParameters,
    DisconnectReason,
    EventParameters,
    SelectParametersForType,
    ServerMessage,
    ServerMessageBase,
    ServerMessageType
} from '../protocol/message';
import {
    BotTurnDisposition,
    EventEntityBargeIn,
    EventEntityBotTurnResponse
} from '../protocol/voice-bots';
import { MessageHandlerRegistry } from '../websocket/message-handlers/message-handler-registry';
import {
    BotService,
    BotResource,
    BotResponse
} from '../services/bot-service';

import { DTMFService } from '../services/dtmf-service';
import { PassThrough } from 'stream';
import { ulawFromL16, ulawToL16 } from './ulaw';
import { resample } from 'wave-resampler';
import { json } from 'stream/consumers';
import { ISession } from './isession';
import { SessionMediator } from './session-mediator';
import { VoiceAnalyzerResource, VoiceAnalyzerService } from '../services/voice-analyzer-service';
import { MessageHandler } from '../websocket/message-handlers/message-handler';
import { AsrResource, AsrService } from '../services/asr-service';



export class Session implements ISession{
    private MAXIMUM_BINARY_MESSAGE_SIZE = 10000000;
    private disconnecting = false;
    private closed = false;
    private ws;
    private agentWs : WebSocket | undefined;

    private mediator: SessionMediator;
    private externalChannelStream = new PassThrough();
    private internalChannelStream = new PassThrough();
    private sessionMediator : SessionMediator | undefined;

    private messageHandlerRegistry = new MessageHandlerRegistry();
    private botService = new BotService();
    private voiceAnalyzerService = new VoiceAnalyzerService();
    private asrService = new AsrService();
    private dtmfService: DTMFService;
    private url;
    private clientSessionId;
    private conversationId: string | undefined;
    private userId: string | undefined;
    private lastServerSequenceNumber = 0;
    private lastClientSequenceNumber = 0;
    private inputVariables: JsonStringMap = {};
    private selectedMedia: MediaParameter | undefined;
    private selectedBot: BotResource | null = null;
    private selectedVoiceAnalyzer: VoiceAnalyzerResource | null = null;
    private asrResource: AsrResource | null = null;

    private isCapturingDTMF = false;
    private isAudioPlaying = false;

    constructor(ws: WebSocket , mediator: SessionMediator , sessionId: string, url: string) {
        this.ws = ws;
        this.mediator = mediator;
        this.clientSessionId = sessionId;
        this.url = url;
        this.dtmfService = new DTMFService();
        this.internalChannelStream.setEncoding("utf8");
        this.registerEvents();
    }

    private registerEvents() {
     
        this.dtmfService.on('error', (error: any) => {
            const message = 'Error during DTMF Capture.';
            console.log(`${message}: ${error}`);
            this.sendDisconnect('error', message, {});
        }).on('final-digits', (digits) => {
            console.log("final digits are for DTMF --> " + digits);
            this.selectedBot?.sendDtmf(digits)
                .then(() => {
                    this.isCapturingDTMF = false;
                });
        });

        this.internalChannelStream.on('data', (chunk) => {
            try {
               // this.sendAudio(this.convertPCM24kToUlaw8k(chunk));
               this.sentToAgent(chunk);
            } catch (error) {
                console.error('Error sending outputData to agent :', error);
            }
        });
    }

    private sentToAgent(chunk: any) {
        if(this.agentWs){
            this.agentWs.send(chunk);
        }else{
            console.log("no active agent ws");
        }
    }
    
    private convertPCM24kToUlaw8k(inputBuffer: Buffer): Uint8Array {
        // Step 1: Convert Buffer to Int16Array
        const inputLength = inputBuffer.length / 2;
        const inputPCM = new Int16Array(inputLength);
        for (let i = 0; i < inputLength; i++) {
            inputPCM[i] = inputBuffer.readInt16LE(i * 2);
        }
    
        // Step 2: Convert Int16 to Float32 [-1.0, 1.0]
        const float32 = new Float32Array(inputPCM.length);
        for (let i = 0; i < inputPCM.length; i++) {
            float32[i] = inputPCM[i] / 32768;
        }
    
        // Step 3: Downsample to 8kHz
        const resampled = resample(float32, 24000, 8000);
    
        // Step 4: Convert Float32 back to Int16
        const int16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
            const s = Math.max(-1, Math.min(1, resampled[i])); // clamp
            int16[i] = s < 0 ? s * 32768 : s * 32767;
        }
    
        // Step 5: µ-law encode
        return ulawFromL16(int16);
    }

    close() {
        if (this.closed) {
            return;
        }

        try {
            this.ws.close();
            this.internalChannelStream.destroy();
            this.externalChannelStream.destroy();
            this.selectedBot?.close();
            this.selectedVoiceAnalyzer?.close();
            this.asrResource?.close();
        } catch {
        }

        this.closed = true;
    }

    setConversationId(conversationId: string) {
        this.conversationId = conversationId;
    }

    registerUserId(userId: string) {
        this.userId = userId;
        this.agentWs = this.mediator.mediateAgentSession(userId);
        if(this.agentWs){
            console.log("found already active active session and bind to it one call initation");
        }else{
            console.log("no active ws agent in register");
        }
    }

    setAgentWs(ws: WebSocket): void {
        this.agentWs = ws;
    }

    getUserId(): string | undefined {
        return this.userId;
    }


    setInputVariables(inputVariables: JsonStringMap) { this.inputVariables = inputVariables; }

    setSelectedMedia(selectedMedia: MediaParameter) { this.selectedMedia = selectedMedia; }

    setIsAudioPlaying(isAudioPlaying: boolean) { this.isAudioPlaying = isAudioPlaying; }

    processTextMessage(data: string) {
        if (this.closed) {
            return;
        }
        // console.log(' ^^^^^^^^^^^^^^^^^^^^data^^^^^^^^^^^^^^^^^^^');
        // console.log(data);
        // console.log('++++++++++++++++++++++++++')
        const message = JSON.parse(data);

        if (message.seq !== this.lastClientSequenceNumber + 1) {
            console.log(`Invalid client sequence number: ${message.seq}.`);
            this.sendDisconnect('error', 'Invalid client sequence number.', {});
            return;
        }

        this.lastClientSequenceNumber = message.seq;

        if (message.serverseq > this.lastServerSequenceNumber) {
            console.log(`Invalid server sequence number: ${message.serverseq}.`);
            this.sendDisconnect('error', 'Invalid server sequence number.', {});
            return;
        }

        if (message.id !== this.clientSessionId) {
            console.log(`Invalid Client Session ID: ${message.id}.`);
            this.sendDisconnect('error', 'Invalid ID specified.', {});
            return;
        }

        const handler = this.messageHandlerRegistry.getHandler(message.type) as MessageHandler;

        if (!handler) {
            console.log(`Cannot find a message handler for '${message.type}'.`);
            return;
        }

        handler.handleMessage(message as ClientMessage, this);
    }

    createMessage<Type extends ServerMessageType, Message extends ServerMessage>(type: Type, parameters: SelectParametersForType<Type, Message>): ServerMessage {
        const message: ServerMessageBase<Type, typeof parameters> = {
            id: this.clientSessionId as string,
            version: '2',
            seq: ++this.lastServerSequenceNumber,
            clientseq: this.lastClientSequenceNumber,
            type,
            parameters
        };
    
        return message as ServerMessage;
    }

    send(message: ServerMessage) {
        if (message.type === 'event') {
      //      console.log(`Sending an ${message.type} message: ${message.parameters.entities[0].type}.`);
        } else {
        //    console.log(`Sending a ${message.type} message.`);
        }
        // console.log('response **********************')
        // console.log(JSON.stringify(message));
        // console.log('############################')
        this.ws.send(JSON.stringify(message));
    }

    sendAudio(bytes: Uint8Array) {
      //  if (bytes.length <= this.MAXIMUM_BINARY_MESSAGE_SIZE) {
            //console.log(`Sending ${bytes.length} binary bytes in 1 message.`);
            this.ws.send(bytes, { binary: true });
        // } else {
        //     let currentPosition = 0;

        //     while (currentPosition < bytes.length) {
        //         const sendBytes = bytes.slice(currentPosition, currentPosition + this.MAXIMUM_BINARY_MESSAGE_SIZE);

        //        // console.log(`Sending ${sendBytes.length} binary bytes in chunked message.`);
        //         this.ws.send(sendBytes, { binary: true });
        //         currentPosition += this.MAXIMUM_BINARY_MESSAGE_SIZE;
        //     }
        // }
    }

    public setMediator(sessionMediator : SessionMediator) : void{
        this.sessionMediator = sessionMediator;
    }


    sendBargeIn() {
        const bargeInEvent: EventEntityBargeIn = {
            type: 'barge_in',
            data: {}
        };
        const message = this.createMessage('event', {
            entities: [bargeInEvent]
        } as SelectParametersForType<'event', EventParameters>);

        this.send(message);
    }

    sendTurnResponse(disposition: BotTurnDisposition, text: string | undefined, confidence: number | undefined) {
        const botTurnResponseEvent: EventEntityBotTurnResponse = {
            type: 'bot_turn_response',
            data: {
                disposition,
                text,
                confidence
            }
        };
        const message = this.createMessage('event', {
            entities: [botTurnResponseEvent]
        } as SelectParametersForType<'event', EventParameters>);

        this.send(message);
    }

    sendDisconnect(reason: DisconnectReason, info: string, outputVariables: JsonStringMap) {
        this.disconnecting = true;
        console.log("disconnect is triggerd.");
        const disconnectParameters: DisconnectParameters = {
            reason,
            info,
            outputVariables
        };
        const message = this.createMessage('disconnect', disconnectParameters);

        this.send(message);
    }

    sendClosed() {
        const message = this.createMessage('closed', {});
        this.send(message);
    }

    public triggerModel(){
        this.selectedBot?.triggerModel();
    }

    /*
    * This method is using during the open process to validate that the information supplied points
    * to a valid Bot Resource. There are a two places that can be looked at to get the required
    * information to locate a Bot Resource: The connection URL, and Input Variables.
    * 
    * In the connectionId field for an AudioConnector Bot in an Inbound Call Flow is where Bot information
    * can be added. The baseUri property on the AudioConnector Integration is appened with the connectionId
    * field, to form the end-result connection URL. Identifying Bot information can be in the form of URL
    * path parts and/or Query String values. You may also use Input Variables to provide further customization
    * if necessary.
    * 
    * This part has a "dummy" implementation that will need to be replaced with an actual implementation.
    * 
    * See `bot-service` in the `services` folder for more information.
    */
    checkIfBotExists(): Promise<boolean> {
        this.voiceAnalyzerService.getBotIfExists(this.externalChannelStream, this.internalChannelStream)
            .then((selectedVoiceAnalyzer: VoiceAnalyzerResource | null) => {
                this.selectedVoiceAnalyzer = selectedVoiceAnalyzer;
            });

        this.asrService.getBotIfExists(this.externalChannelStream, this.internalChannelStream)
            .then((asrResource: AsrResource | null) => {
                this.asrResource = asrResource;
            });
        return this.botService.getBotIfExists(this.externalChannelStream, this.internalChannelStream)
            .then((selectedBot: BotResource | null) => {
                this.selectedBot = selectedBot;
                return this.selectedBot != null;
            });
    }

    /*
    * This method is used to process the incoming audio data from the Client.
    * This part has a "dummy" implementation that will need to be replaced
    * with a proper ASR engine.
    * 
    * See `asr-service` in the `services` folder for more information.
    */

    private convertUlaw8kToPCM24k(ulawData: Uint8Array): Buffer {
        // Step 1: µ-law decode to Int16
        const decoded = ulawToL16(ulawData); // Int16Array
    
        // Step 2: Convert Int16 to Float32 [-1.0, 1.0]
        const float32 = new Float32Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            float32[i] = decoded[i] / 32768;
        }
    
        // Step 3: Resample to 24kHz
        const resampled = resample(float32, 8000, 24000);
    
        // Step 4: Convert Float32 to Int16 PCM
        const int16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
            const s = Math.max(-1, Math.min(1, resampled[i]));
            int16[i] = s < 0 ? s * 32768 : s * 32767;
        }
    
        // Step 5: Convert Int16Array to Buffer
        const outputBuffer = Buffer.alloc(int16.length * 2);
        for (let i = 0; i < int16.length; i++) {
            outputBuffer.writeInt16LE(int16[i], i * 2);
        }
    
        return outputBuffer;
    }
    
    processBinaryMessage(data: any) {
        if (this.disconnecting || this.closed || !this.selectedBot || !this.selectedVoiceAnalyzer) {
            return;
        }

        // Ignore audio if we are capturing DTMF
        if (this.isCapturingDTMF) {
            return;
        }

        /*
        * For this implementation, we are going to ignore input while there
        * is audio playing. You may choose to continue to process audio if
        * you want to enable support for Barge-In scenarios.
        */
      
        this.externalChannelStream.write(this.convertUlaw8kToPCM24k(data));

    }

    /*
    * This method is used to process the incoming DTMF digits from the Client.
    * This part has a "dummy" implementation that will need to be replaced
    * with proper logic.
    * 
    * See `dtmf-service` in the `services` folder for more information.
    */
    processDTMF(digit: string) {
       //console.log("DTMF is not yet supported");
         this.dtmfService.processDigit(digit);
    }

};
