import { DbContext, DbSet } from "dbcontext";
class AppDbContext extends DbContext {
    constructor(path) {
        super(path);
    }
    bardMessages = new DbSet("bardMessages");
}
export default AppDbContext;
//# sourceMappingURL=app-dbcontext.js.map