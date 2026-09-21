import { useRef, useState } from "react";
import "../styles/announcements.css";

export default function DashboardAnnouncements({ announcements = [], audience = "all" }) {
  const rail = useRef(null);
  const [selected, setSelected] = useState(null);
  const images = announcements.filter(item => item.isActive !== false && (item.imageUrl || item.title) && (audience === "all" || !item.audience || item.audience === "all" || item.audience === audience));
  if (!images.length) return null;
  const scroll = direction => rail.current?.scrollBy({ left: direction * rail.current.clientWidth, behavior: "smooth" });
  return <section className="dashboardAnnouncements" aria-label="Announcements"><header><h2>Announcements</h2>{images.length > 1 && <div><button type="button" aria-label="Previous announcement" onClick={() => scroll(-1)}>←</button><button type="button" aria-label="Next announcement" onClick={() => scroll(1)}>→</button></div>}</header><div className="announcementRail" ref={rail} tabIndex={0} aria-label="Scroll announcements">{images.map((item, index) => <button className="announcementCard" type="button" key={item._id || index} onClick={() => setSelected(item)}>{item.imageUrl && <img src={item.imageUrl} alt="" />}<strong>{item.title || `Announcement ${index + 1}`}</strong>{item.details && <span>Read details →</span>}</button>)}</div>{selected && <div className="announcementOverlay" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}><section className="announcementDialog" role="dialog" aria-modal="true" aria-label={selected.title || "Announcement details"}><button className="announcementClose" type="button" onClick={() => setSelected(null)} aria-label="Close announcement">×</button>{selected.imageUrl && <img src={selected.imageUrl} alt="" />}<h2>{selected.title || "Announcement"}</h2><p>{selected.details || "No further details provided."}</p></section></div>}</section>;
}
