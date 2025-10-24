// @ts-nocheck
import serverEntry from "@100x/application/serverEntry";

export default (request, context) => serverEntry(request, context);

export const config = { path: "/*" };
