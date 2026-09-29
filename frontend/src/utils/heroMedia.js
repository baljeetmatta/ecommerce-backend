export function heroMedia(slide = {}) {
  const image = String(slide.imageUrl || "").trim();
  const video = String(slide.videoUrl || "").trim();
  if (image) return { type: "image", url: image };
  if (video) return { type: "video", url: video };
  return { type: "image", url: "/images/e-commerce/home/first_hero.jpg" };
}
