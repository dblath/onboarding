import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, readdir } from "node:fs/promises";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "bundled-license-notices",
      async generateBundle(_options, bundle) {
        const packages = new Set<string>();
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== "chunk") continue;
          for (const id of Object.keys(chunk.modules)) {
            if (id.startsWith("\0")) continue;
            const path = id.replaceAll("\\", "/"),
              marker = "/node_modules/";
            const position = path.lastIndexOf(marker);
            if (position < 0) continue;
            const prefix = path.slice(0, position + marker.length),
              parts = path.slice(prefix.length).split("/");
            packages.add(
              prefix +
                parts.slice(0, parts[0].startsWith("@") ? 2 : 1).join("/"),
            );
          }
        }
        const notices = [
          "Third-party notices for bundled runtime dependencies.\n",
        ];
        for (const directory of [...packages].sort()) {
          const metadata = JSON.parse(
            await readFile(`${directory}/package.json`, "utf8"),
          );
          const licenses = (await readdir(directory)).filter((name) =>
            /^(licen[sc]e|copying|notice)([.-]|$)/i.test(name),
          );
          if (!licenses.length)
            throw Error(`Missing license notice for ${metadata.name}`);
          notices.push(`\n--- ${metadata.name} ${metadata.version} ---\n`);
          for (const license of licenses.sort())
            notices.push(await readFile(`${directory}/${license}`, "utf8"));
        }
        this.emitFile({
          type: "asset",
          fileName: "THIRD-PARTY.txt",
          source: notices.join("\n"),
        });
      },
    },
  ],
  base: "./",
});
