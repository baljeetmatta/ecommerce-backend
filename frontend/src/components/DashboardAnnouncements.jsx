import { useEffect, useRef, useState } from "react";
import "../styles/announcements.css";

export default function DashboardAnnouncements({ announcements = [], audience = "all", autoOpenImages = true }) {
  const rail = useRef(null);
  const imageRail = useRef(null);
  const [selected, setSelected] = useState(null);
  const [imagesOpen, setImagesOpen] = useState(false);
  const active = announcements.filter(item => item.isActive !== false && (audience === "all" || !item.audience || item.audience === "all" || item.audience === audience));
  const images = active.filter(item => item.imageUrl);
  const texts = active.filter(item => !item.imageUrl && item.title);
  const imageKeys = images.map(item => item._id || item.imageUrl).join("|");
  useEffect(() => { setImagesOpen(autoOpenImages && Boolean(imageKeys)); }, [autoOpenImages, imageKeys]);
  useEffect(() => {
    if (!selected && !imagesOpen) return;
    const close = event => { if (event.key === "Escape") { setSelected(null); setImagesOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selected, imagesOpen]);
  if (!images.length && !texts.length) return null;
  const scroll = (ref, direction) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth, behavior: "smooth" });
  return <>
    {texts.length > 0 && <section className="dashboardAnnouncements" aria-label="Announcements"><header><h2>Announcements</h2>{texts.length > 1 && <div><button type="button" aria-label="Previous announcement" onClick={() => scroll(rail, -1)}>←</button><button type="button" aria-label="Next announcement" onClick={() => scroll(rail, 1)}>→</button></div>}</header><div className="announcementRail" ref={rail} tabIndex={0} aria-label="Scroll announcements">{texts.map((item, index) => <button className="announcementCard" type="button" key={item._id || index} onClick={() => setSelected(item)}><strong>{item.title}</strong>{item.details && <span>Read details →</span>}</button>)}</div></section>}
    {images.length > 0 && !imagesOpen && <button type="button" className="imageAnnouncementOpen" onClick={() => setImagesOpen(true)}>View image announcements ({images.length})</button>}
    {selected && <div className="announcementOverlay" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}><section className="announcementDialog" role="dialog" aria-modal="true" aria-label={selected.title || "Announcement details"}><button className="announcementClose" type="button" onClick={() => setSelected(null)} aria-label="Close announcement">×</button><h2>{selected.title || "Announcement"}</h2><p>{selected.details || "No further details provided."}</p></section></div>}
    {imagesOpen && <div className="announcementOverlay" onMouseDown={event => { if (event.target === event.currentTarget) setImagesOpen(false); }}><section className="announcementDialog imageAnnouncementDialog" role="dialog" aria-modal="true" aria-label="Image announcements"><button className="announcementClose" type="button" onClick={() => setImagesOpen(false)} aria-label="Close image announcements">×</button><h2>Image announcements</h2><div className="imageAnnouncementRail" ref={imageRail} tabIndex={0} aria-label="Scroll image announcements">{images.map((item, index) => <figure key={item._id || index}><img src={item.imageUrl} alt={`Announcement image ${index + 1}`} /><figcaption>{index + 1} of {images.length}</figcaption></figure>)}</div>{images.length > 1 && <div className="imageAnnouncementControls"><button type="button" onClick={() => scroll(imageRail, -1)} aria-label="Previous image announcement">← Previous</button><button type="button" onClick={() => scroll(imageRail, 1)} aria-label="Next image announcement">Next →</button></div>}</section></div>}
  </>;
}
