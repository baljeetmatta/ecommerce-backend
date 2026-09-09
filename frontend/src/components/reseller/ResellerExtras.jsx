
import ResellerWishlist from "./ResellerWishlist.jsx";
import ResellerNotifications from "./ResellerNotifications.jsx";
import ResellerReferrals from "./ResellerReferrals.jsx";
import ResellerMarketing from "./ResellerMarketing.jsx";
import ResellerSettings from "./ResellerSettings.jsx";
export default function ResellerExtras(props) {
  const Component = { wishlist: ResellerWishlist, offers: ResellerWishlist, notifications: ResellerNotifications, referrals: ResellerReferrals, marketing: ResellerMarketing, settings: ResellerSettings }[props.view];
  return Component ? <Component {...props} /> : null;
}
