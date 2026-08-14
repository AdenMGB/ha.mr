import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { compress, decompress } from "../compress.js";
import { outputAlphabetASCII } from "../alphabets.js";

const root = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const standalone = path.join(root, "standalone.js");
const ASCII = outputAlphabetASCII;

function runStandalone (...args) {
  const result = spawnSync(process.execPath, [standalone, ...args], {
    encoding: "utf8"
  });
  return result;
}

describe("standalone CLI integration", () => {
  it("compresses a link to an ha.mr URL", () => {
    const result = runStandalone("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(result.status, 0, result.stderr);
    const line = result.stdout.trim();
    assert.match(line, /^http:\/\/ha\.mr#/);
    const payload = line.slice("http://ha.mr#".length);
    const restored = decompress(payload, ASCII);
    assert.equal(restored, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("decompresses an ha.mr URL back to the original link", () => {
    const payload = compress("https://example.com/index.html", ASCII);
    const result = runStandalone("http://ha.mr#" + payload);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "https://example.com/index.html");
  });

  it("exits with an error when no input is given", () => {
    const result = runStandalone();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: hamr/);
  });
});

describe("user flow: paste link, share, open", () => {
  it("roundtrips through the published ha.mr# payload form", () => {
    const input = "https://shop.example.com/products/cool-widget?utm_source=google&utm_medium=cpc";
    const pageLink = `http://localhost/#${compress(input, ASCII)}`;
    const hash = pageLink.slice(pageLink.indexOf("#") + 1);
    const restored = decompress(decodeURIComponent(hash), ASCII);
    assert.equal(new URL(restored).hostname, "shop.example.com");
    assert.equal(new URL(restored).searchParams.get("utm_source"), "google");
  });
});
