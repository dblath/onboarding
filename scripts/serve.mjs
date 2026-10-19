import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

// Read-only loopback hosting; browser storage remains the sole workspace authority.
export function createStaticServer(directory) {
  const root = resolve(directory);
  return createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    let path;
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      path = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
      if (!path.startsWith(root + sep)) {
        response.writeHead(403);
        response.end();
        return;
      }
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }
    try {
      const body = await readFile(path);
      response.writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
        "Content-Length": body.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const directory = process.argv[2] || "app",
    port = Number(process.argv[3] || 5174);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Choose a port between 1 and 65535.");
  const server = createStaticServer(directory);
  server.on("error", (error) => {
    console.error(
      `Could not start local server: ${error.code}. Choose another port if it is occupied.`,
    );
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `Unity fieldwork: http://127.0.0.1:${port}/#/contractor\nKeep this terminal open. Press Ctrl+C to stop.`,
    ),
  );
}
