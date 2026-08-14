import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compress, decompress } from "../compress.js";
import { outputAlphabetASCII, outputAlphabetQR } from "../alphabets.js";

const ASCII = outputAlphabetASCII;
const QR = outputAlphabetQR;

/** v0 payloads produced before the v1 encoder shipped. */
const V0_PAYLOADS = [
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", n: 21, payload: ":c27B@&#wF4e.[7vN417$" },
  { url: "https://youtu.be/dQw4w9WgXcQ", n: 14, payload: "SS,&#hgd7w2Su4" },
  { url: "https://twitter.com/jack/status/20", n: 15, payload: "&SkVH.]8K)ulfC'" },
  { url: "https://github.com/p2r3/ha.mr", n: 12, payload: "OhvUjZg4]p;g" },
  { url: "https://github.com/p2r3/ha.mr/issues/1", n: 21, payload: "vP[-1;d4QG@_Se*GfG#X/" },
  { url: "https://www.amazon.com/dp/B08N5WRWNW", n: 15, payload: "6#p[F*_E2EuCqq#" },
  { url: "https://www.reddit.com/r/programming/comments/abc123/title", n: 32, payload: "fF0q5Vi;K8Y'CWwHt;7//XOqYzytmPAr" },
  { url: "https://en.wikipedia.org/wiki/Huffman_coding", n: 20, payload: "bN~DKu/7Lx'=*M4h)r@-" },
  { url: "https://www.google.com/search?q=url+compression", n: 25, payload: "veU;R/A+iXHi:]5'Bz4x4LW4$" },
  { url: "https://example.com/", n: 4, payload: "~Uk6" },
  { url: "https://example.com/index.html", n: 4, payload: "j2ZL" },
  { url: "https://news.ycombinator.com/item?id=12345678", n: 17, payload: "2+7=gH.'EjEZ5d2'!" },
  { url: "https://www.instagram.com/p/ABC123xyz", n: 14, payload: "r&jl)[,=CS7OLS" },
  { url: "https://open.spotify.com/track/4cOdK2wGLBt4XmFGeW97v1", n: 30, payload: ".,[ljqJepKr~=#=S)$VvNf[J!UFL2&" },
  { url: "https://stackoverflow.com/questions/12345678/how-to-compress-urls", n: 34, payload: "Gv-ewC9m=7wzsngykDW6syc!UEGZR//_9!" },
  { url: "https://www.linkedin.com/in/someone", n: 11, payload: "rCXN9/,PsX~" },
  { url: "https://tiktok.com/@user/video/7123456789012345678", n: 27, payload: "[)H*w+2jz:jPn?Sw(g6Kq.:)GD:" },
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLsomething&index=1&t=42s", n: 50, payload: "zp6x0Pz@fp5i'QQA.x]F6v-yzl1R.)=0ki_LmZ[cNLq9*/qv=!" },
  { url: "https://example.com/path/to/some/deep/page", n: 24, payload: "OlFYKJiN*S@h!lfouZ~X$,&9" },
  { url: "https://shop.example.com/products/cool-widget?utm_source=google&utm_medium=cpc&utm_campaign=spring", n: 69, payload: "n$7ZP+4e/-]UabR,Xa:~)Fr/D~/F5?rpKMY[E9JiG=1o]A[K)szP~RSS:H4qQa4H4@_C+" },
  { url: "http://example.com:8080/api/v1/users/42", n: 21, payload: ",,Jj-Cu$YEV:vz]nxQFM!" },
  { url: "https://www.nytimes.com/2024/01/15/technology/ai-article.html", n: 32, payload: "OC-_PSYeC~'i*0A'l2q7g#.Q5A*mqrpO" },
  { url: "https://github.com/p2r3/ha.mr/commit/abcdef0123456789abcdef0123456789abcdef01", n: 54, payload: "C/e#(R/X(/vg9[c),7LaSkMoL3QqIel[X@?.lNFKgJ#:yYPlS3p+0#" }
];

function countSymbols (string, alphabet) {
  let count = 0;
  while (string) {
    const symbol = alphabet.find(c => string.endsWith(c));
    string = string.slice(0, symbol ? -symbol.length : -1);
    count++;
  }
  return count;
}

function parseUrl (value) {
  if (URL.canParse(value)) return new URL(value);
  return new URL("http://" + value);
}

function urlsEquivalent (a, b) {
  const ua = parseUrl(a);
  const ub = parseUrl(b);
  if (ua.protocol !== ub.protocol) return false;
  if (ua.hostname !== ub.hostname) return false;
  if (ua.port !== ub.port) return false;
  const pathA = ua.pathname.replace(/\/$/, "") || "/";
  const pathB = ub.pathname.replace(/\/$/, "") || "/";
  if (pathA !== pathB) return false;
  const keysA = [...ua.searchParams.keys()].sort();
  const keysB = [...ub.searchParams.keys()].sort();
  if (keysA.join("\0") !== keysB.join("\0")) return false;
  for (const key of keysA) {
    if (ua.searchParams.getAll(key).join("\0") !== ub.searchParams.getAll(key).join("\0")) {
      return false;
    }
  }
  return ua.hash === ub.hash;
}

describe("compress / decompress roundtrip", () => {
  for (const { url } of V0_PAYLOADS) {
    it(`roundtrips ${url}`, () => {
      const payload = compress(url, ASCII);
      const restored = decompress(payload, ASCII);
      assert.ok(urlsEquivalent(url, restored), `${url} -> ${restored}`);
    });
  }

  it("roundtrips QR alphabet", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const payload = compress(url, QR);
    const restored = decompress(payload, QR);
    assert.ok(urlsEquivalent(url, restored), restored);
  });

  it("roundtrips a port, query, and hash together", () => {
    const url = "http://example.com:8080/path?x=1&y=2#frag";
    const payload = compress(url, ASCII);
    const restored = decompress(payload, ASCII);
    assert.ok(urlsEquivalent(url, restored), restored);
  });

  it("preserves trailing slashes", () => {
    const url = "https://www.reddit.com/r/programming/";
    const payload = compress(url, ASCII);
    const restored = decompress(payload, ASCII);
    assert.equal(parseUrl(restored).pathname.endsWith("/"), true);
  });

  it("rejects invalid payload characters", () => {
    assert.throws(() => decompress("abc def", ASCII));
  });
});

describe("v0 backward compatibility", () => {
  for (const { url, payload } of V0_PAYLOADS) {
    it(`decodes legacy payload for ${url}`, () => {
      const restored = decompress(payload, ASCII);
      assert.ok(urlsEquivalent(url, restored), `${url} -> ${restored}`);
    });
  }
});

describe("v1 compression efficiency", () => {
  it("never expands a payload versus the v0 encoder", () => {
    for (const { url, n } of V0_PAYLOADS) {
      const payload = compress(url, ASCII);
      const size = countSymbols(payload, ASCII);
      assert.ok(size <= n, `${url}: ${size} > ${n}`);
    }
  });

  it("shrinks the overall corpus versus v0", () => {
    const v0Total = V0_PAYLOADS.reduce((sum, row) => sum + row.n, 0);
    const v1Total = V0_PAYLOADS.reduce((sum, row) => {
      return sum + countSymbols(compress(row.url, ASCII), ASCII);
    }, 0);
    assert.ok(v1Total < v0Total, `corpus ${v1Total} was not smaller than ${v0Total}`);
  });

  it("shrinks YouTube watch URLs", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const size = countSymbols(compress(url, ASCII), ASCII);
    assert.ok(size < 21, `YouTube payload length ${size}`);
  });

  it("shrinks UTM-heavy shop URLs", () => {
    const url = "https://shop.example.com/products/cool-widget?utm_source=google&utm_medium=cpc&utm_campaign=spring";
    const size = countSymbols(compress(url, ASCII), ASCII);
    assert.ok(size < 69, `UTM payload length ${size}`);
  });

  it("shrinks GitHub commit SHAs", () => {
    const url = "https://github.com/p2r3/ha.mr/commit/abcdef0123456789abcdef0123456789abcdef01";
    const size = countSymbols(compress(url, ASCII), ASCII);
    assert.ok(size < 54, `commit payload length ${size}`);
  });

  it("shrinks .html article URLs", () => {
    const url = "https://www.nytimes.com/2024/01/15/technology/ai-article.html";
    const size = countSymbols(compress(url, ASCII), ASCII);
    assert.ok(size < 32, `article payload length ${size}`);
  });

  it("compresses unknown domains with index.html (no ReferenceError)", () => {
    const url = "https://notarealdomain12345.example/index.html";
    const payload = compress(url, ASCII);
    const restored = decompress(payload, ASCII);
    assert.ok(urlsEquivalent(url, restored), restored);
  });

  const extraCases = [
    ["https://example.com/blog/how-to-use-oauth-with-your-app", 30],
    ["https://api.example.com/v1/users/550e8400-e29b-41d4-a716-446655440000", 43],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", 19],
    ["https://shop.example.com/collections/summer-sale/products/cool-widget", 40],
    ["https://example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=winter-sale&gad_source=1&wbraid=abc", 44],
    ["https://www.reddit.com/r/programming/comments/abc123/how_to_write_fast_code/", 32],
    ["https://github.com/p2r3/ha.mr/blob/main/compress.js", 23],
    ["https://developer.mozilla.org/en-US/docs/Web/API/URL", 26],
    ["https://en.wikipedia.org/wiki/URL_shortening", 19],
    ["https://discord.com/channels/123/456/789", 19]
  ];

  for (const [url, previous] of extraCases) {
    it(`roundtrips and shrinks ${url}`, () => {
      const payload = compress(url, ASCII);
      const restored = decompress(payload, ASCII);
      assert.ok(urlsEquivalent(url, restored), `${url} -> ${restored}`);
      const size = countSymbols(payload, ASCII);
      assert.ok(size < previous, `${url}: ${size} was not smaller than ${previous}`);
    });
  }
});
