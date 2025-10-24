declare module "@100x/application/serverEntry" {
  const handler: (request: Request) => Promise<Response>;
  export default handler;
}

declare module "@100x/application/clientEntry" {}
