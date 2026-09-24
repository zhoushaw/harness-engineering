import { cp, rm } from "node:fs/promises";

await rm("site", { recursive: true, force: true });
await cp("dist", "site", { recursive: true });
