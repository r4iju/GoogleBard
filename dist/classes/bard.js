import vm from "vm";
import https from "https";
import { load } from "cheerio";
import Wait from "../utils/wait.js";
import Random from "../utils/random.js";
import axios from "axios";
class Bard {
    axios;
    storage;
    cookies = "";
    agent = new https.Agent({ rejectUnauthorized: false });
    constructor(options) {
        this.cookies = options.cookies;
        this.storage = options.storage;
        if (options.agent)
            this.agent = options.agent;
        let axiosOptions = {
            httpsAgent: this.agent,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:110.0) Gecko/20100101 Firefox/110.0",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                Connection: "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                TE: "trailers",
            },
        };
        this.axios = axios.create(axiosOptions);
    }
    async addConversation(id) {
        let conversation = {
            id: id,
            conversationId: "",
            requestId: "",
            responseId: "",
            lastActive: Date.now(),
        };
        await this.storage.set('bardMessages', conversation.id, conversation);
        return conversation;
    }
    async updateConversation(conversation) {
        await this.storage.set('bardMessages', conversation.id, {
            ...conversation,
            lastActive: Date.now(),
        });
        return conversation;
    }
    async getConversationById(id) {
        if (!id)
            return {
                id: "",
                conversationId: "",
                requestId: "",
                responseId: "",
                lastActive: Date.now(),
            };
        let conversation = await this.storage.get('bardMessages', id);
        if (conversation) {
            conversation.lastActive = Date.now();
        }
        if (!conversation) {
            conversation = await this.addConversation(id);
        }
        return conversation;
    }
    async resetConversation(id = "default") {
        let conversation = await this.storage.get('bardMessages', id);
        if (!conversation)
            return;
        conversation = {
            id: id,
            conversationId: "",
            requestId: "",
            responseId: "",
            lastActive: Date.now(),
        };
        await this.storage.set('bardMessages', id, conversation);
    }
    ParseResponse(text) {
        let resData = {
            conversationId: "",
            requestId: "",
            responseId: "",
            responses: [],
        };
        let parseData = (data) => {
            if (typeof data === "string") {
                if (data?.startsWith("c_")) {
                    resData.conversationId = data;
                    return;
                }
                if (data?.startsWith("r_")) {
                    resData.requestId = data;
                    return;
                }
                if (data?.startsWith("rc_")) {
                    resData.responseId = data;
                    return;
                }
                resData.responses.push(data);
            }
            if (Array.isArray(data)) {
                data.forEach((item) => {
                    parseData(item);
                });
            }
        };
        try {
            const lines = text.split("\n");
            for (let i in lines) {
                const line = lines[i];
                if (line.includes("wrb.fr")) {
                    let data = JSON.parse(line);
                    let responsesData = JSON.parse(data[0][2]);
                    responsesData.forEach((response) => {
                        parseData(response);
                    });
                }
            }
        }
        catch (error) {
            if (error instanceof Error)
                console.error(error.message);
        }
        return resData;
    }
    async GetRequestParams() {
        try {
            const response = await this.axios.get("https://bard.google.com", {
                headers: {
                    Cookie: this.cookies,
                },
            });
            let $ = load(response.data);
            let script = $("script[data-id=_gd]").html();
            script = script.replace("window.WIZ_global_data", "googleData");
            const context = { googleData: { cfb2h: "", SNlM0e: "" } };
            vm.createContext(context);
            vm.runInContext(script, context);
            const at = context.googleData.SNlM0e;
            const bl = context.googleData.cfb2h;
            return { at, bl };
        }
        catch (e) {
            console.error(e.message);
        }
    }
    async ask(prompt, conversationId) {
        return await this.send(prompt, conversationId);
    }
    async askStream(data, prompt, conversationId) {
        let resData = await this.send(prompt, conversationId);
        let responseChunks = resData.content.split(" ");
        for await (let chunk of responseChunks) {
            if (chunk === "")
                continue;
            data(`${chunk} `);
            await Wait(Random(25, 250));
        }
        return resData;
    }
    async send(prompt, conversationId) {
        let conversation = await this.getConversationById(conversationId);
        try {
            let { at, bl } = await this.GetRequestParams();
            const response = await this.axios.post("https://bard.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate", new URLSearchParams({
                at: at,
                "f.req": JSON.stringify([null, `[[${JSON.stringify(prompt)}],null,${JSON.stringify([conversation.conversationId, conversation.requestId, conversation.responseId])}]`]),
            }), {
                headers: {
                    Cookie: this.cookies,
                },
                params: {
                    bl: bl,
                    rt: "c",
                    _reqid: "0",
                },
            });
            let parsedResponse = this.ParseResponse(response.data);
            await this.updateConversation({
                ...conversation,
                id: parsedResponse.conversationId,
                conversationId: parsedResponse.conversationId,
                requestId: parsedResponse.requestId,
                responseId: parsedResponse.responseId,
            });
            return {
                content: parsedResponse.responses[0],
                options: parsedResponse.responses,
                conversationId: parsedResponse.conversationId,
                requestId: parsedResponse.requestId,
                responseId: parsedResponse.responseId,
            };
        }
        catch (e) {
            console.error(e.message);
        }
    }
}
export default Bard;
//# sourceMappingURL=bard.js.map