declare module "@100x/application/serverEntry" {
  const handler: import("nitro/h3").EventHandler;
  export default handler;
}

declare module "@100x/application/rendererEntry" {
  const handler: import("nitro/types").RenderHandler;
  export default handler;
}

declare module "@100x/application/clientEntry" {}
