import { useEffect, useRef, useState } from "react";
import "../styles/announcements.css";

import { announcementKey, announcementLink, announcementPreview, visibleAnnouncements } from "../utils/announcements.js";

export default function DashboardAnnouncements({ announcements = [], audience = "all", show = "all", autoOpenMedia = true }) {
  const mediaRail = useRef(null);
  const [paused, setPaused] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const active = visibleAnnouncements(announcements, audience);
  const texts = active.filter(item => (item.type === "text" || !item.imageUrl) && item.title);
  const media = active.filter(item => ["image", "banner"].includes(item.type) && item.imageUrl);
  const tickerOnly = ["seller", "reseller", "partner"].includes(audience);
  const showTexts = show !== "media" && texts.length > 0;
  const showMedia = show !== "text" && media.length > 0;
  const mediaKeys = media.map(item => item._id || item.imageUrl).join("|");

  useEffect(() => { setMediaOpen(autoOpenMedia && showMedia); }, [autoOpenMedia, showMedia, mediaKeys]);
  useEffect(() => {
    if (!mediaOpen) return undefined;
    const close = event => { if (event.key === "Escape") setMediaOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mediaOpen]);
  if (!showTexts && !showMedia) return null;

  return <>
    {showTexts && <section className="dashboardAnnouncements" aria-label="Text announcements">
      {!tickerOnly && <header><h2>Announcements</h2><button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Resume scrolling" : "Pause scrolling"}</button></header>}
      <div className={`announcementTicker${paused ? " isPaused" : ""}`}>
        <div className="announcementTickerTrack" style={{ animationDuration: `${Math.max(20, texts.reduce((total, item) => total + item.title.length + announcementPreview(item.details).length, 0) / 8)}s` }}>
          {[0, 1].map(copy => <div className="announcementTickerGroup" key={copy} aria-hidden={copy === 1 ? true : undefined}>{texts.map(item => <a className="announcementTickerItem" tabIndex={copy === 1 ? -1 : undefined} key={announcementKey(item, announcements)} href={announcementLink(announcementKey(item, announcements))}><span className="announcementTickerDot" /><strong>{item.title}</strong><span>{announcementPreview(item.details)}</span><span aria-hidden="true">↗</span></a>)}</div>)}
        </div>
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
