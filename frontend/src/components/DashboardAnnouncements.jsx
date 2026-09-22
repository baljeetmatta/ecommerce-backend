import { useEffect, useRef, useState } from "react";
import "../styles/announcements.css";

const firstWords = (value = "", limit = 30) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return `${words.slice(0, limit).join(" ")}${words.length > limit ? "…" : ""}`;
};

export default function DashboardAnnouncements({ announcements = [], audience = "all", show = "all", autoOpenMedia = true }) {
  const textRail = useRef(null);
  const mediaRail = useRef(null);
  const [textIndex, setTextIndex] = useState(0);
  const [mediaOpen, setMediaOpen] = useState(false);
  const active = announcements.filter(item => item.isActive !== false && (audience === "all" || !item.audience || item.audience === "all" || item.audience === audience));
  const texts = active.filter(item => (item.type === "text" || !item.imageUrl) && item.title);
  const media = active.filter(item => ["image", "banner"].includes(item.type) && item.imageUrl);
  const showTexts = show !== "media" && texts.length > 0;
  const showMedia = show !== "text" && media.length > 0;
  const mediaKeys = media.map(item => item._id || item.imageUrl).join("|");

  useEffect(() => { setMediaOpen(autoOpenMedia && showMedia); }, [autoOpenMedia, showMedia, mediaKeys]);
  useEffect(() => {
    if (!showTexts || texts.length < 2) return undefined;
    const timer = window.setInterval(() => setTextIndex(current => (current + 1) % texts.length), 5000);
    return () => window.clearInterval(timer);
  }, [showTexts, texts.length]);
  useEffect(() => { textRail.current?.scrollTo({ left: textIndex * textRail.current.clientWidth, behavior: "smooth" }); }, [textIndex]);
  useEffect(() => {
    if (!mediaOpen) return undefined;
    const close = event => { if (event.key === "Escape") setMediaOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mediaOpen]);
  if (!showTexts && !showMedia) return null;

  return <>
    {showTexts && <section className="dashboardAnnouncements" aria-label="Text announcements">
      <header><h2>Announcements</h2>{texts.length > 1 && <div><button type="button" aria-label="Previous announcement" onClick={() => setTextIndex(current => (current - 1 + texts.length) % texts.length)}>←</button><button type="button" aria-label="Next announcement" onClick={() => setTextIndex(current => (current + 1) % texts.length)}>→</button></div>}</header>
      <div className="announcementRail" ref={textRail} tabIndex={0} aria-label="Scrolling announcements">
        {texts.map((item, index) => <article className="announcementCard" key={item._id || index}><strong>{item.title}:</strong><p>{firstWords(item.details)}</p></article>)}
      </div>
    </section>}
    {showMedia && !autoOpenMedia && <button type="button" className="imageAnnouncementOpen" onClick={() => setMediaOpen(true)}>Preview image announcements ({media.length})</button>}
    {mediaOpen && <div className="announcementOverlay" onMouseDown={event => { if (event.target === event.currentTarget) setMediaOpen(false); }}>
      <section className="announcementDialog imageAnnouncementDialog" role="dialog" aria-modal="true" aria-label="Image announcements">
        <button className="announcementClose" type="button" onClick={() => setMediaOpen(false)} aria-label="Close announcements">×</button>
        <div className="imageAnnouncementRail" ref={mediaRail} tabIndex={0} aria-label="Scroll image announcements">
          {media.map((item, index) => <figure className={item.type === "banner" ? "bannerAnnouncement" : "imageAnnouncement"} key={item._id || index}><img src={item.imageUrl} alt={`${item.type === "banner" ? "Banner" : "Image"} announcement ${index + 1}`} />{media.length > 1 && <figcaption>{index + 1} of {media.length}</figcaption>}</figure>)}
        </div>
        {media.length > 1 && <div className="imageAnnouncementControls"><button type="button" onClick={() => mediaRail.current?.scrollBy({ left: -mediaRail.current.clientWidth, behavior: "smooth" })}>← Previous</button><button type="button" onClick={() => mediaRail.current?.scrollBy({ left: mediaRail.current.clientWidth, behavior: "smooth" })}>Next →</button></div>}
      </section>
    </div>}
  </>;
}
