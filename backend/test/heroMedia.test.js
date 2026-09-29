import test from "node:test";
import assert from "node:assert/strict";
import StorefrontSetting from "../src/models/StorefrontSetting.js";
import { heroMedia } from "../../frontend/src/utils/heroMedia.js";

test("hero prefers an image when both image and video are configured", () => {
  assert.deepEqual(heroMedia({ imageUrl: " /image.jpg ", videoUrl: "/video.mp4" }), { type: "image", url: "/image.jpg" });
});
test("hero uses video only when the image is empty", () => {
  for (const imageUrl of [undefined, "", "  "]) {
    assert.deepEqual(heroMedia({ imageUrl, videoUrl: "/video.mp4" }), { type: "video", url: "/video.mp4" });
  }
  assert.equal(heroMedia({}).type, "image");
});
test("hero settings retain video URLs and accept media-only video banners", () => {
  const settings = new StorefrontSetting({ hero: { videoUrl: "/legacy.mp4" }, heroItems: [{ hideText: true, videoUrl: "/video.mp4" }] });
  assert.equal(settings.validateSync(), undefined);
  assert.equal(settings.toObject().heroItems[0].videoUrl, "/video.mp4");
  assert.equal(settings.toObject().hero.videoUrl, "/legacy.mp4");
});
test("media-only heroes still require an image or video", () => {
  const settings = new StorefrontSetting({ heroItems: [{ hideText: true, imageUrl: " ", videoUrl: " " }] });
  assert.ok(settings.validateSync()?.errors["heroItems.0.imageUrl"]);
});
