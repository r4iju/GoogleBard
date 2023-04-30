import vm from "vm";
// import fs from "fs";
import https from "https";
import { load } from "cheerio";
import Wait from "../utils/wait.js";
import Random from "../utils/random.js";
// import AppDbContext from "./app-dbcontext.js";
import Storage from './storage.js';
import Conversation from "../models/conversation.js";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { SocksProxyAgent } from 'socks-proxy-agent'
import BardResponse from "src/models/response.js";

interface BardOptions {
	cookies: string;
	storage: Storage;
	agent?: SocksProxyAgent | https.Agent;
}

class Bard {
	private axios: AxiosInstance;
	private storage: Storage;
	// private db: AppDbContext;
	private cookies: string = "";
	private agent: SocksProxyAgent | https.Agent = new https.Agent({ rejectUnauthorized: false });

	constructor(options: BardOptions ) {
		// this.db = new AppDbContext();
		this.cookies = options.cookies;
		this.storage = options.storage;
		if (options.agent) this.agent = options.agent;

		let axiosOptions: AxiosRequestConfig = {
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

	// private async waitForLoad() {
	// 	while (this.db === null) {
	// 		await Wait(1000);
	// 	}
	// 	await this.db.WaitForLoad();
	// }

	private async addConversation(id: string) {
		let conversation: Conversation = {
			id: id,
			conversationId: "", 
			requestId: "", 
			responseId: "", 
			lastActive: Date.now(),
		};
		// this.db.bardMessages.Add(conversation);
		await this.storage.set('bardMessages', conversation.id, conversation);
		return conversation;
	}

	private async updateConversation(conversation: Conversation) {
		// this.db.bardMessages.Add(conversation);
		await this.storage.set('bardMessages', conversation.id, {
			...conversation,
			lastActive: Date.now(),
		});
		return conversation;
	}

	private async getConversationById(id?: string): Promise<Conversation> {
		if (!id)
			return {
				id: "",
				conversationId: "",
				requestId: "",
				responseId: "",
				lastActive: Date.now(),
			};
		// let conversation = this.db.bardMessages.FirstOrDefault((conversation) => conversation.id === id);
		let conversation = await this.storage.get('bardMessages', id) as Conversation;
		if (conversation) {
			conversation.lastActive = Date.now();
		}
		if (!conversation) {
			conversation = await this.addConversation(id);
		} 
		return conversation;
	}

	public async resetConversation(id: string = "default") {
		let conversation = await this.storage.get('bardMessages', id) as Conversation;
		// let conversation = this.db.bardMessages.FirstOrDefault((conversation) => conversation.id === id);
		if (!conversation) return;
		conversation = {
			id: id,
			conversationId: "", 
			requestId: "", 
			responseId: "", 
			lastActive: Date.now(),
		};
		await this.storage.set('bardMessages', id, conversation);
	}

	private ParseResponse(text: string) {
		let resData = {
			conversationId: "",
			requestId: "",
			responseId: "",
			responses: [],
		};
		let parseData = (data: string) => {
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
		} catch (error: unknown) {
			if (error instanceof Error) console.error(error.message);
		}

		return resData;
	}

	private async GetRequestParams() {
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
		} catch (e: any) {
			console.log(e.message);
		}
	}

	public async ask(prompt: string, conversationId?: string): Promise<BardResponse> {
		return await this.send(prompt, conversationId);
	}

	public async askStream(data: (arg0: string) => void, prompt: string, conversationId?: string): Promise<BardResponse> {
		let resData = await this.send(prompt, conversationId);
		let responseChunks = resData.content.split(" ");
		for await (let chunk of responseChunks) {
			if (chunk === "") continue;
			data(`${chunk} `);
			await Wait(Random(25, 250)); // simulate typing
		}
		return resData;
	}

	private async send(prompt: string, conversationId?: string): Promise<BardResponse> {
		// await this.waitForLoad();
		let conversation = await this.getConversationById(conversationId);
		try {
			let { at, bl } = await this.GetRequestParams();
			const response = await this.axios.post(
				"https://bard.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate",
				new URLSearchParams({
					at: at,
					"f.req": JSON.stringify([null, `[[${JSON.stringify(prompt)}],null,${JSON.stringify([conversation.conversationId, conversation.requestId, conversation.responseId])}]`]),
				}),
				{
					headers: {
						Cookie: this.cookies,
					},
					params: {
						bl: bl,
						rt: "c",
						_reqid: "0",
					},
				},
			);

			// let cookies = response.headers["set-cookie"];

			// if (cookies) this.cookies = cookies.join("; ");

			let parsedResponse = this.ParseResponse(response.data);
			await this.updateConversation({
				id: parsedResponse.conversationId,
				conversationId: parsedResponse.conversationId,
				requestId: parsedResponse.requestId,
				responseId: parsedResponse.responseId,
				lastActive: Date.now(),
			})

			return {
				content: parsedResponse.responses[0], 
				options: parsedResponse.responses,
				conversationId: conversationId,
				requestId: parsedResponse.requestId, 
				responseId: parsedResponse.responseId,
			};
		} catch (e: any) {
			console.log(e.message);
		}
	}
}

export default Bard;
