const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export const optimizeImage = async (file, options = {}) => {
  const { maxWidth = 1400, maxHeight = 1400, quality = 0.78 } = options;
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const optimizedDataUrl = canvas.toDataURL("image/jpeg", quality);

  return {
    url: optimizedDataUrl,
    originalSize: file.size,
    optimizedSize: Math.round((optimizedDataUrl.length * 3) / 4),
    width,
    height,
    name: file.name
  };
};
