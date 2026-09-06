let lastToast = { message: "", type: "", at: 0 };

export const showToast = (message, type = "success") => {
  if (!message) return;
  const now = Date.now();
  if (lastToast.message === String(message) && lastToast.type === type && now - lastToast.at < 1000) return;
  lastToast = { message: String(message), type, at: now };
  window.dispatchEvent(new CustomEvent("hrsbasket:toast", {
    detail: { message: String(message), type }
  }));
};

export const isSaveMessage = (message = "") =>
  !/\b(failed|error|unable|cannot|could not|not saved|not updated)\b/i.test(message) &&
  /\b(saved|updated|added|deleted|submitted|completed|approved|rejected|generated|sent|ready|uploaded|created|changed)\b/i.test(message);
