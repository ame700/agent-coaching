import { WebSocket } from "ws";
import { ISession } from "./isession";
import { SessionMediator } from "./session-mediator";
import { MessageHandlerRegistry } from "../websocket/message-handlers/message-handler-registry";
import { json } from "stream/consumers";


export class AgentSession implements ISession {

    private userId: string;
    private messageHandlerRegistry = new MessageHandlerRegistry();
    private sessionMediator : SessionMediator | undefined;

    constructor(private ws: WebSocket, private mediator: SessionMediator, private sessionId: string, private url: string) {
        this.userId = this.parseQueryParams(url).userId;
        let result = this.mediator.bindAgentSession(this.userId , ws);
        console.log("user id for agent : " + this.userId);
        if(result){
            console.log("found in going call and got register in it");
        }else{
            console.log("No Audio session to bind Agent session to");
        }
    }

    private parseQueryParams(urlPath: string): Record<string, string> {
        const url = new URL(urlPath, 'http://localhost'); // base needed for relative path
        const params = Object.fromEntries(url.searchParams.entries());
        return params;
    }

    public processBinaryMessage(data: any): void {
        // not yet supported
    }

    processTextMessage(data: string) {
        let message = JSON.parse(data);
        if(message.type == 'action'){
            if(message.action == 'TRIGGER_MODEL'){
                this.mediator.triggerModel(this.userId);
            }
        }
    }

    public close(): void {
        // nothing to close
    }


    public setMediator(sessionMediator : SessionMediator) : void{
        this.sessionMediator = sessionMediator;
    }

    public getUserId(): string {
        return this.userId;
    }
}