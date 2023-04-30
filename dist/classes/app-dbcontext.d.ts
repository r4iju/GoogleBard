import { DbContext, DbSet } from "dbcontext";
import Conversation from "../models/conversation.js";
declare class AppDbContext extends DbContext {
    constructor(path?: string);
    bardMessages: DbSet<Conversation>;
}
export default AppDbContext;
