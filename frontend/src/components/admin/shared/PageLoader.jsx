import BrandLogo from "../../BrandLogo.jsx";

const PageLoader = ({ settings = {} }) => (
  <main className="storefrontLoadingScreen" role="status" aria-live="polite">
    <BrandLogo settings={settings} loading className="storefrontLoadingBrand" showText={false} />
    <div className="storefrontLoadingSpinner" aria-hidden="true" />
  </main>
);

export default PageLoader;
