const form = document.querySelector("#unlockForm");
const passwordInput = document.querySelector("#unlockPassword");
const errorBox = document.querySelector("#unlockError");
const lockScreen = document.querySelector("#lockScreen");
const appShell = document.querySelector("#appShell");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  const password = passwordInput.value;
  if (!password) {
    errorBox.textContent = "パスワードを入力してください。";
    return;
  }

  try {
    const data = await decryptData(password);
    window.STUDY_WIKI_DATA = data;
    lockScreen.hidden = true;
    appShell.classList.remove("is-locked");
    loadScript("app.js");
  } catch {
    errorBox.textContent = "パスワードが違うか、データを復号できません。";
  }
});

async function decryptData(password) {
  const payload = window.ENCRYPTED_STUDY_WIKI_DATA;
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const passwordBytes = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: payload.iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function loadScript(src) {
  const script = document.createElement("script");
  const version = window.STUDY_ASSET_VERSION || Date.now().toString();
  const separator = src.includes("?") ? "&" : "?";
  script.src = `${src}${separator}v=${encodeURIComponent(version)}`;
  document.body.append(script);
}
