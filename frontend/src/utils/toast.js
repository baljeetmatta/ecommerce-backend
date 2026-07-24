export const showToast = (message, type = "success") => {
  if (!message) return;
  window.dispatchEvent(new CustomEvent("hrsbasket:toast", {
    detail: { message: String(message), type }
  }));
};

export const isSaveMessage = (message = "") =>
  /\b(saved|updated|added|deleted|submitted|completed|approved|rejected|generated|sent successfully|changed successfully)\b/i.test(message);
