# ha.mr
Compresses links and optimizes QR codes entirely in the browser, without a back-end database.

## How
1. Common parts of the link (e.g. protocol, `www.` prefix, `index.html`) are manually detected and reduced to individual bits. If present, the port is encoded as a raw numeric value.
2. Second-level and top-level domains are matched against a Huffman-coded dictionary of the most common websites and TLDs.
3. The rest of the link is split into parts. Each segment is encoded with whichever method is smallest: a dictionary of common path/query tokens, packed decimal/hex/UUID values, hyphen/underscore slugs split into words, a fitted character set, or Huffman coding. Common file extensions (`.html`, `.php`, …) are stored as a short code. The encoder keeps the older format when it is smaller, so existing `ha.mr#…` links still decode.
4. For links, the output is encoded in the full character set of a URL. (I've been informed that square brackets `[]` are not supposed to be a part of this set, but it's too late to change that now.)
5. For QR codes, the output uses the alphanumeric character set to remove overhead compared to other QR code generators.

## Acknowledgements
- https://www.npmjs.com/package/qrcode
- https://github.com/smythp/reddit_links_dataset
- https://github.com/ada-url/url-dataset
