import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

// Standard ZIP records, with portable relative paths and no machine-specific metadata.
export function zipFiles(files) {
  const local = [],
    central = [];
  let offset = 0;
  for (const { name, body } of files) {
    const filename = Buffer.from(name),
      compressed = deflateRawSync(body),
      checksum = crc32(body);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(body.length, 22);
    header.writeUInt16LE(filename.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50);
    entry.writeUInt16LE(20, 4);
    header.copy(entry, 6, 4, 30);
    entry.writeUInt32LE(offset, 42);
    local.push(header, filename, compressed);
    central.push(entry, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

async function packageApp() {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink())
        throw Error("Distribution must not contain symbolic links.");
      if (entry.isDirectory()) await visit(path);
      else {
        const name = relative("dist", path).split(sep).join("/");
        if (!/\.(html|js|css|svg)$/.test(name) && name !== "THIRD-PARTY.txt")
          throw Error(`Unexpected build artifact: ${name}`);
        files.push({
          name: `unity-fieldwork/app/${name}`,
          body: await readFile(path),
        });
      }
    }
  }
  await visit("dist");
  for (const [source, name] of [
    ["scripts/serve.mjs", "serve.mjs"],
    ["docs/mac-setup.md", "START.md"],
  ])
    files.push({
      name: `unity-fieldwork/${name}`,
      body: await readFile(source),
    });
  await mkdir("release", { recursive: true });
  const archive = zipFiles(files);
  await writeFile("release/unity-fieldwork.zip", archive);
  console.log(
    `Portable package: release/unity-fieldwork.zip (${files.length} files, ${archive.length} bytes)`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await packageApp();
