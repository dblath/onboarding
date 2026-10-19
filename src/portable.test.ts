import { afterEach, expect, test } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import type { Server, AddressInfo } from "node:net";
import { inflateRawSync } from "node:zlib";

const { createStaticServer } = await import("../scripts/" + "serve.mjs");
const { zipFiles } = await import("../scripts/" + "package.mjs");
let directory: string | undefined, server: Server | undefined;
afterEach(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  server = undefined;
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

async function start() {
  directory = await mkdtemp(join(tmpdir(), "unity-fieldwork-"));
  const app = join(directory, "app");
  await mkdir(app);
  await writeFile(join(app, "index.html"), "<title>Unity fieldwork</title>");
  await writeFile(
    join(app, "mark.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
  );
  await writeFile(join(directory, "private.txt"), "outside application");
  server = createStaticServer(app);
  server!.listen(0, "127.0.0.1");
  await once(server!, "listening");
  const address = server!.address() as AddressInfo;
  expect(address.address).toBe("127.0.0.1");
  return `http://127.0.0.1:${address.port}`;
}

test("portable hosting serves real assets and HEAD without caching browser releases", async () => {
  const origin = await start(),
    html = await fetch(origin);
  expect(await html.text()).toContain("Unity fieldwork");
  expect(html.headers.get("content-type")).toBe("text/html");
  expect(html.headers.get("cache-control")).toBe("no-store");
  expect((await fetch(origin + "/mark.svg")).headers.get("content-type")).toBe(
    "image/svg+xml",
  );
  const head = await fetch(origin, { method: "HEAD" });
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
  expect((await fetch(origin + "/missing.js")).status).toBe(404);
});

test("portable hosting cannot write data or read outside its asset directory", async () => {
  const origin = await start();
  expect((await fetch(origin + "/%2e%2e%2fprivate.txt")).status).toBe(403);
  expect((await fetch(origin + "/%ZZ")).status).toBe(400);
  expect((await fetch(origin, { method: "POST", body: "change" })).status).toBe(
    405,
  );
  expect(await (await fetch(origin)).text()).toBe(
    "<title>Unity fieldwork</title>",
  );
});

test("portable ZIP round-trips compressed files and uses UTF-8 relative filenames", () => {
  const files = [
    {
      name: "unity-fieldwork/app/index.html",
      body: Buffer.from("<title>Unity fieldwork</title>"),
    },
    {
      name: "unity-fieldwork/café.txt",
      body: Buffer.from("portable contents"),
    },
  ];
  const zip = zipFiles(files);
  let offset = 0;
  for (const file of files) {
    expect(zip.readUInt32LE(offset)).toBe(0x04034b50);
    expect(zip.readUInt16LE(offset + 6) & 0x800).toBe(0x800);
    const length = zip.readUInt16LE(offset + 26),
      size = zip.readUInt32LE(offset + 18);
    expect(
      zip.subarray(offset + 30, offset + 30 + length).toString("utf8"),
    ).toBe(file.name);
    expect(
      inflateRawSync(
        zip.subarray(offset + 30 + length, offset + 30 + length + size),
      ),
    ).toEqual(file.body);
    offset += 30 + length + size;
  }
  expect(zip.readUInt32LE(offset)).toBe(0x02014b50);
  expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
  expect(zip.readUInt16LE(zip.length - 12)).toBe(files.length);
  expect(zip.readUInt32LE(zip.length - 6)).toBe(offset);
});
