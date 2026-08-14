import { compress, decompress } from "./compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji
} from "./alphabets.js";

const input = process.argv[2]?.trim();
const alphabetName = process.argv[3]?.trim() || "ascii";
if (!input) {
  console.error(`Usage: hamr <link> [ascii|qr|emoji]`);
  process.exit(1);
}

try {
  const url = new URL(input.includes("://") ? input : "http://" + input);
  if (url.hash.length > 1) {
    const payload = decodeURIComponent(url.hash.slice(1));
    const useEmoji = Array.from(payload).some(c => !outputAlphabetASCII.includes(c));
    console.log(decompress(payload, useEmoji ? outputAlphabetEmoji : outputAlphabetASCII));
    process.exit(0);
  }
  if (url.pathname.length > 1 && !url.search) {
    console.log(decompress(decodeURIComponent(url.pathname.slice(1)), outputAlphabetQR));
    process.exit(0);
  }
} catch {}

let alphabet = outputAlphabetASCII;
if (alphabetName === "qr") alphabet = outputAlphabetQR;
else if (alphabetName === "emoji") alphabet = outputAlphabetEmoji;
else if (alphabetName !== "ascii") {
  console.error(`Unknown alphabet "${alphabetName}".`);
  console.error("Select one of: ascii, qr, emoji");
  process.exit(2);
}

if (alphabetName === "qr") {
  console.log("HTTP://HA.MR/" + compress(input, alphabet));
} else {
  console.log("http://ha.mr#" + compress(input, alphabet));
}
