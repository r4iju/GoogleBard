/// <reference types="node" />
import https from "https";
import Storage from './storage.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import BardResponse from "src/models/response.js";
interface BardOptions {
    cookies: string;
    storage: Storage;
    agent?: SocksProxyAgent | https.Agent;
}
declare class Bard {
    private axios;
    private storage;
    private cookies;
    private agent;
    constructor(options: BardOptions);
    private addConversation;
    private updateConversation;
    private getConversationById;
    resetConversation(id?: string): Promise<void>;
    private ParseResponse;
    private GetRequestParams;
    ask(prompt: string, conversationId?: string): Promise<BardResponse>;
    askStream(data: (arg0: string) => void, prompt: string, conversationId?: string): Promise<BardResponse>;
    private send;
}
export default Bard;
