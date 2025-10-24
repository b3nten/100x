// @ts-nocheck
import serverEntry from "@100x/application/serverEntry";

export default {
  fetch(request, env, ctx) {
    return serverEntry(request, env, ctx);
  },
};
