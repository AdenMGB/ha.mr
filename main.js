import { compress, decompress } from "./compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji
} from "./alphabets.js";

const settings = { emoji: false, qr: false };
for (const setting of Object.keys(settings)) {
  const element = document.querySelector("#settings-" + setting);
  settings[setting] = element.checked;
  element.addEventListener("change", () => {
    settings[setting] = element.checked;
    updateOutput();
  });
}

function countSymbols (string, alphabet) {
  let count = 0;
  while (string) {
    const symbol = alphabet.find(c => string.endsWith(c));
    string = string.slice(0, symbol ? -symbol.length : -1);
    count++;
  }
  return count;
}

const inputLinkElement = document.querySelector("#input-link");
const outputLinkElement = document.querySelector("#output-link");
const outputRatioElement = document.querySelector("#output-ratio");
const queryWarningElement = document.querySelector("#query-warning");
const qrCodeImage = document.querySelector("#qrcode");
const qrLevelBox = document.querySelector("#qr-correct-level-container");
const qrLevel = document.querySelector("#qr-correct-level");
qrLevel.addEventListener("change", updateOutput);

function setQRVisible (visible) {
  const display = visible ? "inline" : "none";
  qrCodeImage.style.display = display;
  qrLevelBox.style.display = display;
}

function pageURL () {
  return `${location.protocol}//${location.host}/`;
}

function updateOutput () {
  const input = inputLinkElement.value.trim();
  try {
    const alphabet = settings.emoji ? outputAlphabetEmoji : outputAlphabetASCII;
    const output = compress(input, alphabet);
    const inputNormalized = input.replace(/^https?:\/\//, "");
    const parsed = URL.canParse("http://" + inputNormalized)
      ? new URL("http://" + inputNormalized)
      : null;
    queryWarningElement.style.display = parsed?.searchParams.size > 1 ? "inline" : "none";

    const ratio = (1 - (countSymbols(output, alphabet) + location.host.length + 1) / inputNormalized.length) * 100;
    if (ratio < -300) {
      outputRatioElement.textContent = "Output is much larger than the input";
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio < 0) {
      outputRatioElement.textContent = `Output is ${Math.floor(-ratio)}% larger than the input`;
      outputRatioElement.style.color = "rgb(255, 50, 50)";
    } else if (ratio > 0) {
      outputRatioElement.textContent = `Output is ${Math.ceil(ratio)}% smaller than the input`;
      outputRatioElement.style.color = "rgb(15, 190, 15)";
    } else {
      outputRatioElement.textContent = "Output is the same length as the input";
      outputRatioElement.style.color = "gray";
    }

    const page = pageURL();
    outputLinkElement.textContent = outputLinkElement.href = `${page}#${output}`;
    outputLinkElement.style.color = "";

    if (settings.qr) {
      const qrCodeLink = `${page.replace(/^https/i, "http").toUpperCase()}${compress(input, outputAlphabetQR)}`;
      QRCode.toDataURL(qrCodeLink, {
        errorCorrectionLevel: ["L", "M", "Q", "H"][qrLevel.value],
        scale: 8
      }, (err, url) => {
        if (err) {
          setQRVisible(false);
          return;
        }
        setQRVisible(true);
        qrCodeImage.src = url;
        qrCodeImage.title = qrCodeLink;
      });
    } else {
      setQRVisible(false);
    }
  } catch (e) {
    outputLinkElement.textContent = input ? "Invalid link" : "Enter a link above to compress";
    outputLinkElement.style.color = input ? "rgb(255, 50, 50)" : "";
    if (input) console.error(e);
    setQRVisible(false);
    outputRatioElement.style.color = "rgba(255, 255, 255, 0)";
    outputLinkElement.removeAttribute("href");
    queryWarningElement.style.display = "none";
  }
}
inputLinkElement.addEventListener("input", updateOutput);

(() => {
  let payload = "";
  let alphabet = outputAlphabetASCII;
  if (location.hash) {
    payload = decodeURIComponent(location.hash.slice(1)).replaceAll(" ", "");
    if (Array.from(payload).some(c => !outputAlphabetASCII.includes(c))) {
      alphabet = outputAlphabetEmoji;
    }
  } else {
    payload = decodeURIComponent(location.pathname.slice(1));
    alphabet = outputAlphabetQR;
  }

  if (payload.trim()) {
    try {
      location.href = decompress(payload, alphabet);
      return;
    } catch (e) {
      console.warn("Redirect failed. Could not decode input.");
      console.error(e);
    }
  }

  updateOutput();
  document.querySelector("#loader").style.opacity = 0;
  document.querySelector("#content").style.opacity = 1;
  document.querySelector("#content").style.pointerEvents = "auto";
})();
