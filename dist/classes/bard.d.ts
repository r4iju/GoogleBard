/// <reference types="node" />
import https from "https";
import { SocksProxyAgent } from 'socks-proxy-agent';
import BardResponse from "src/models/response.js";
interface BardOptions {
    cookies: string;
    agent?: SocksProxyAgent | https.Agent;
}
declare class Bard {
    private axios;
    private db;
    private cookies;
    private agent;
    constructor(options: BardOptions);
    private waitForLoad;
    private addConversation;
    private getConversationById;
    resetConversation(id?: string): void;
    private ParseResponse;
    private GetRequestParams;
    ask(prompt: string, conversationId?: string): Promise<BardResponse>;
    askStream(data: (arg0: string) => void, prompt: string, conversationId?: string): Promise<BardResponse>;
    private send;
}
export default Bard;
