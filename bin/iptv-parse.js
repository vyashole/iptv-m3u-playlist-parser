#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePlaylist } from "../dist/index.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: iptv-parse <playlist.m3u>");
  process.exit(1);
}

const text = readFileSync(file, "utf8");
const result = parsePlaylist(text);
process.stdout.write(JSON.stringify(result, null, 2));
