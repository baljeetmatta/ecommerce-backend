import { useEffect, useRef } from "react";
import { announcementKey, announcementLink, announcementPreview, visibleAnnouncements } from "../utils/announcements.js";
import "../styles/announcements.css";

export default function AnnouncementDetailsPage({ announcements = [], audience, selectedId, route, loading, error, embedded = false }) {
  const items = visibleAnnouncements(announcements, audience);
  const selected = items.find(item => announcementKey(item, announcements) === selectedId);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0); }, [selectedId]);

  const Container = embedded ? "div" : "main";
  return <Container className={`announcementDetailsPage${embedded ? " announcementDetailsEmbedded" : ""}`}>
    <a href={announcementLink(null, route)}>← Back to dashboard</a>
    <section className="announcementFullDetails" aria-labelledby="announcement-heading">
      <h1 id="announcement-heading" ref={heading} tabIndex={-1}>{selected?.title || (selected ? "Image announcement" : "Announcement details")}</h1>
      {loading ? <p role="status">Loading announcements…</p> : error ? <p role="alert">{error}</p> : selected ? <>
        {selected.details && <p>{selected.details}</p>}
        {selected.imageUrl && <img src={selected.imageUrl} alt={selected.title || "Announcement"} />}
      </> : <p>This announcement is no longer available.</p>}
    </section>
    <section aria-labelledby="all-announcements-heading">
      <h2 id="all-announcements-heading">All announcements</h2>
      <div className="announcementTableWrap"><table className="announcementTable">
        <thead><tr><th scope="col">Title</th><th scope="col">Description</th><th scope="col">Type</th></tr></thead>
        <tbody>{items.map(item => {
          const id = announcementKey(item, announcements);
          return <tr key={id} className={id === selectedId ? "isSelected" : ""} onClick={() => { window.location.hash = announcementLink(id, route); }}>
            <td><a href={announcementLink(id, route)} aria-current={id === selectedId ? "true" : undefined}>{item.title || (item.type === "banner" ? "Banner announcement" : "Image announcement")}</a></td>
            <td>{announcementPreview(item.details) || "—"}</td><td>{item.type || "text"}</td>
          </tr>;
        })}</tbody>
      </table></div>
      {!loading && !items.length && <p>No announcements available.</p>}
    </section>
  </Container>;
}
