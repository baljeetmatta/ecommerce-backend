import WhatsAppIcon from "./WhatsAppIcon.jsx";
import "../styles/whatsapp-support.css";

export default function WhatsAppSupport({ number, shopName = "HRSBasket" }) {
  const phone = String(number || "").trim().replace(/[\s()+-]/g, "");
  if (!/^[1-9]\d{6,14}$/.test(phone)) return null;

  const message = encodeURIComponent(`Hi ${shopName || "HRSBasket"}, I need help with my shopping.`);
  return <a className="whatsappSupport" href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with support on WhatsApp" title="Chat with support on WhatsApp">
    <WhatsAppIcon size={30} />
  </a>;
}
