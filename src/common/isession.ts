import { SessionMediator } from "./session-mediator";


export interface ISession {

    processTextMessage(data: string): void;

    processBinaryMessage(data: any): void;

    close(): void;

    setMediator(SessionMediator : SessionMediator) : void;
}   