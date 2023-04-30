import { DbContext, DbSet } from "dbcontext";
import Conversation from "../models/conversation.js";
import { connected } from "process";

class AppDbContext extends DbContext {
	constructor(path?: string) {
		super(path);
	}

	bardMessages = new DbSet<Conversation>("bardMessages");
}

export default AppDbContext;
