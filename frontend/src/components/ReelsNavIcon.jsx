import { Video } from "lucide-react";
import "../styles/reels-nav.css";

export default function ReelsNavIcon({ size = 20 }) {
  return <span className="reelsNavIcon" aria-hidden="true"><Video size={size} strokeWidth={1.8} /><span className="reelsNavPlay" /></span>;
}
