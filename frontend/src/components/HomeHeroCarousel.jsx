import { useEffect, useRef, useState } from "react";

export default function HomeHeroCarousel({ slides = [] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(null);
  const count = slides.length;
  const current = count ? active % count : 0;
  const move = (delta) => setActive((value) => (value + delta + count) % count);
  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % count), 4500);
    return () => window.clearInterval(timer);
  }, [count, paused]);
  if (!count) return null;
  return <section className={`homeHeroCarousel${count === 1 ? " singleSlide" : ""}`} aria-label="Featured collections" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onKeyDown={(event) => { if (count < 2) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}>
    <div className="homeHeroStage" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; setPaused(true); }} onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; setPaused(false); if (count > 1 && start !== null && Math.abs(event.changedTouches[0].clientX - start) > 45) move(event.changedTouches[0].clientX < start ? 1 : -1); }} onTouchCancel={() => { touchStart.current = null; setPaused(false); }}>
      {(count > 1 ? [-1, 0, 1] : [0]).map((offset) => {
        const index = (current + offset + count) % count;
        const slide = slides[index];
        const image = slide.imageUrl || "/images/e-commerce/home/first_hero.jpg";
        const link = /^(?:https?:\/\/|\/(?!\/)|#)/i.test(slide.linkUrl || "") ? slide.linkUrl : "#/products";
        return offset ? <button key={offset} className={`homeHeroSlide ${offset < 0 ? "previous" : "next"}`} type="button" tabIndex={-1} onClick={() => move(offset)} aria-label={offset < 0 ? "Previous banner" : "Next banner"}><img src={image} alt="" /></button> : <article key="current" className="homeHeroSlide current" aria-label={`${index + 1} of ${count}`} aria-roledescription="slide">
          <a className={`homeHeroSlideLink${slide.hideText ? " imageOnly" : ""}`} href={link} aria-label={slide.title || "Shop featured collection"}>
            <img src={image} alt={slide.hideText ? slide.title || "Featured collection" : ""} loading="eager" fetchPriority="high" />
            {!slide.hideText && <div className="homeHeroCopy"><span className="eyebrow">Modern collection</span><h1>{slide.title || "Fresh arrivals for everyday living"}</h1><p>{slide.subtitle || "Shop thoughtfully selected products with trusted checkout."}</p><span className="heroPrimary">Shop Now</span></div>}
          </a>
        </article>;
      })}
    </div>
    {count > 1 && <div className="homeHeroDots" aria-label="Choose banner">{slides.map((slide, index) => <button key={slide._id || index} type="button" className={current === index ? "active" : ""} aria-label={`Show banner ${index + 1}`} aria-pressed={current === index} onClick={() => setActive(index)} />)}</div>}
  </section>;
}
