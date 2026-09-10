import { useRef } from "react";
import "../styles/announcements.css";

export default function DashboardAnnouncements({ announcements = [] }) {
  const rail = useRef(null);
  const images = announcements.filter(item => item.isActive !== false && item.imageUrl);
  if (!images.length) return null;
  const scroll = direction => rail.current?.scrollBy({ left: direction * rail.current.clientWidth, behavior: "smooth" });
  return <section className="dashboardAnnouncements" aria-label="Announcements"><header><h2>Announcements</h2>{images.length > 1 && <div><button type="button" aria-label="Previous announcement" onClick={() => scroll(-1)}>←</button><button type="button" aria-label="Next announcement" onClick={() => scroll(1)}>→</button></div>}</header><div className="announcementRail" ref={rail} tabIndex={0} aria-label="Scroll announcements">{images.map((item, index) => <figure key={item._id || item.imageUrl}><img src={item.imageUrl} alt={item.title || `Announcement ${index + 1}`} />{item.title && <figcaption>{item.title}</figcaption>}</figure>)}</div></section>;
}
