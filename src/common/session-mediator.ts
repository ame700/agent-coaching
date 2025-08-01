import { WebSocket } from "ws";
import { ISession } from "./isession";
import { AgentSession } from "./agent-session";
import { Session } from "./session";


export class SessionMediator {

    private static _instance: SessionMediator;
    private sessionMap: Map<WebSocket, ISession> = new Map();

    private constructor() {
    }


    public get(ws: WebSocket): ISession | undefined {
        return this.sessionMap.get(ws);
    }

    public set(ws: WebSocket, session: ISession): void {
        session.setMediator(this);
        this.sessionMap.set(ws, session);
    }

    public delete(ws: WebSocket): boolean {
       return this.sessionMap.delete(ws);
    }

    public mediateAgentSession(userId: string) : WebSocket | undefined {
        for (const [socket, session] of this.sessionMap.entries()) {
            if (session instanceof AgentSession) {
                if (userId != (session as AgentSession).getUserId())
                    return socket;
            }
        }

        return undefined;
    }

    public bindAgentSession(userId: string , ws: WebSocket) : boolean {
        for (const [socket, session] of this.sessionMap.entries()) {
            if (session instanceof Session) {
                if (userId != (session as Session).getUserId())
                    (session as Session).setAgentWs(ws);
                    return true;
            }
        }

        return false;
    }


    public triggerModel(userId: string) : boolean{
        for (const [socket, session] of this.sessionMap.entries()) {
            if (session instanceof Session) {
                if (userId != (session as Session).getUserId())
                    (session as Session).triggerModel();
                    return true;
            }
        }

        return false;
    }

    public static getInstance() {
        if (this._instance == null)
            this._instance = new SessionMediator();

        return this._instance;
    }
}