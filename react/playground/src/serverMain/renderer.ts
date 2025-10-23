import { PageRenderer } from "@100x/react/server";
import { handlers, routes } from "../shared/routes";

export default new PageRenderer(routes, handlers).renderHandler;
