import "../styles/reels-nav.css";

export default function ReelsNavIcon({ size = 20 }) {
  return <span className="reelsNavIcon" aria-hidden="true"><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="6.5" r="2" /><circle cx="17.5" cy="12" r="2" /><circle cx="12" cy="17.5" r="2" /><circle cx="6.5" cy="12" r="2" /></svg></span>;
}
