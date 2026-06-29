import { createServer as createHttpsServer } from "https";
import { request as httpRequest } from "http";
import { readFileSync } from "fs";
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const HTTPS_PORT = 3443;
const INTERNAL_PORT = 3444;

const options = {
  key: readFileSync(resolve(ROOT, ".cert/key.pem")),
  cert: readFileSync(resolve(ROOT, ".cert/cert.pem")),
};

function proxyRequest(clientReq, clientRes) {
  const proxyReq = httpRequest(
    {
      hostname: "127.0.0.1",
      port: INTERNAL_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: clientReq.headers,
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    },
  );
  proxyReq.on("error", () => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502);
      clientRes.end("Bad Gateway");
    }
  });
  clientReq.pipe(proxyReq, { end: true });
}

function proxyUpgrade(clientReq, clientSocket, head) {
  const proxyReq = httpRequest({
    hostname: "127.0.0.1",
    port: INTERNAL_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: clientReq.headers,
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    const resLine = `HTTP/1.1 101 Switching Protocols\r\n`;
    const headers = Object.entries(proxyRes.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    clientSocket.write(resLine + headers + "\r\n\r\n");
    if (proxyHead.length) clientSocket.write(proxyHead);
    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);
  });

  proxyReq.on("error", () => {
    clientSocket.destroy();
  });

  proxyReq.end();
}

const httpsServer = createHttpsServer(options, (req, res) => {
  proxyRequest(req, res);
});

httpsServer.on("upgrade", (req, socket, head) => {
  proxyUpgrade(req, socket, head);
});

const next = spawn("npx", ["next", "dev", "-p", String(INTERNAL_PORT)], {
  cwd: ROOT,
  stdio: "inherit",
});

function cleanup() {
  next.kill();
  httpsServer.close();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

httpsServer.listen(HTTPS_PORT, () => {
  console.log(`\n  https://localhost:${HTTPS_PORT}\n`);
});
