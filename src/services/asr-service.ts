import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { PassThrough } from "stream";

export class AsrService{
    public getBotIfExists(externalChannel: PassThrough, internalChannel: PassThrough): Promise<AsrResource | null> {
    
        console.log("new AsrService resource is created");
        return Promise.resolve(new AsrResource(externalChannel, internalChannel));
    }
}

export class AsrResource{
    private stream: sdk.PushAudioInputStream;
    private readonly speechConfig;
    private speechRecognizer; 


    constructor(private externalChannel: PassThrough, private internalChannel: PassThrough) {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY!, process.env.AZURE_SPEECH_REGION!);
        this.stream = sdk.AudioInputStream.createPushStream(sdk.AudioStreamFormat.getWaveFormatPCM(24000, 16, 1))
        let audioConfig = sdk.AudioConfig.fromStreamInput(this.stream);
        this.speechRecognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
        this.speechRecognizer.recognizing = (sender , evnt) => {
            this.internalChannel.write(JSON.stringify({type: "transcription" , data: evnt.result.text.trim()}));
        }
        this.speechRecognizer.startContinuousRecognitionAsync();
        this.registerEvents();
    }

    public registerEvents(): void {
   
        this.externalChannel.on('data', (data:Buffer) => {
            try {
                this.stream.write(data);
            } catch (error) {
                console.error('Error sending audio data:', error);
            }

        });
    }

    public close(){
        if (this.stream) {
            console.log("close asr service");
            this.stream.close();
            this.speechRecognizer.close();
        }
    }
}


