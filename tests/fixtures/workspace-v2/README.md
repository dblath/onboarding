# Original Iteration 3.7 compatibility evidence

`iteration-3.7.json` is a byte-for-byte copy of the fictional multi-recording workspace delivered with Iteration 3.7, not a regenerated fixture. It retains original format 2 / business schema 4 / Viz 2 metadata and frames. SHA256: `d3e647e0b07c02ff0ce69e970bb03023e7ffd5ca41b6df60ce29e0844aa4dade`.

`src/observerPersistence.test.ts` validates, restores, continues one running root without altering unrelated stopped history, then resets all stores. `.gitattributes` disables JSON newline conversion. Original 3.6 fixtures remain in `../workspace-v1/`. The delivery directory `docs/chet/` remains local-only and excluded from Git.
