import { useCallback, useEffect, useRef, useState } from "react";
import { heroMedia } from "../utils/heroMedia.js";

function HeroMedia({ slide, active = false }) {
  const videoRef = useRef(null);
  const media = heroMedia(slide);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePlayback = () => {
      if (active && !motion.matches && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    updatePlayback();
    motion.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      video.pause();
      motion.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, [active, media.type, media.url]);
  return media.type === "video"
    ? <video ref={videoRef} src={media.url} muted loop playsInline preload="metadata" aria-label={slide.title || "Featured collection"} />
    : <img src={media.url} alt={active && slide.hideText ? slide.title || "Featured collection" : ""} loading={active ? "eager" : "lazy"} fetchPriority={active ? "high" : "auto"} />;
}

export default function HomeHeroCarousel({ slides = [] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transition, setTransition] = useState(null);
  const transitioning = useRef(false);
  const touchStart = useRef(null);
  const count = slides.length;
  const current = count ? active % count : 0;
  const goTo = useCallback((index, direction = 1) => {
    if (count < 2 || transitioning.current) return;
    const next = (index + count) % count;
    if (next === current) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      transitioning.current = true;
      setTransition({ from: current, direction });
    }
    setActive(next);
  }, [count, current]);
  const move = (delta) => goTo(current + delta, delta);
  useEffect(() => {
    if (!transition) return undefined;
    const timer = window.setTimeout(() => {
      setTransition(null);
      transitioning.current = false;
    }, 550);
    return () => window.clearTimeout(timer);
  }, [transition]);
  useEffect(() => {
    setActive(0);
    setTransition(null);
    transitioning.current = false;
  }, [count]);
  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => goTo(current + 1, 1), 4500);
    return () => window.clearInterval(timer);
  }, [count, paused, current, goTo]);
  if (!count) return null;
  return <section className={`homeHeroCarousel${count === 1 ? " singleSlide" : ""}`} aria-label="Featured collections" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onKeyDown={(event) => { if (count < 2) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}>
    <div className={`homeHeroStage${transition ? " isSliding" : ""}`} style={{ "--slide-direction": transition?.direction || 1 }} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; setPaused(true); }} onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; setPaused(false); if (count > 1 && start !== null && Math.abs(event.changedTouches[0].clientX - start) > 45) move(event.changedTouches[0].clientX < start ? 1 : -1); }} onTouchCancel={() => { touchStart.current = null; setPaused(false); }}>
      {transition && slides[transition.from] && <article className="homeHeroSlide outgoing" aria-hidden="true" inert>
        <div className="homeHeroSlideLink">
          <HeroMedia slide={slides[transition.from]} />
          {!slides[transition.from].hideText && <div className="homeHeroCopy"><span className="eyebrow">Modern collection</span><h1>{slides[transition.from].title || "Fresh arrivals for everyday living"}</h1><p>{slides[transition.from].subtitle || "Shop thoughtfully selected products with trusted checkout."}</p><span className="heroPrimary">Shop Now</span></div>}
        </div>
      </article>}
      {(count > 1 ? [-1, 0, 1] : [0]).map((offset) => {
        const index = (current + offset + count) % count;
        const slide = slides[index];
        const link = /^(?:https?:\/\/|\/(?!\/)|#)/i.test(slide.linkUrl || "") ? slide.linkUrl : "#/products";
        return offset ? <button key={offset} className={`homeHeroSlide ${offset < 0 ? "previous" : "next"}`} type="button" tabIndex={-1} onClick={() => move(offset)} aria-label={offset < 0 ? "Previous banner" : "Next banner"}><HeroMedia slide={slide} /></button> : <article key="current" className="homeHeroSlide current" aria-label={`${index + 1} of ${count}`} aria-roledescription="slide">
          <a key={index} className={`homeHeroSlideLink${slide.hideText ? " imageOnly" : ""}`} href={link} aria-label={slide.title || "Shop featured collection"}>
            <HeroMedia slide={slide} active />
            {!slide.hideText && <div className="homeHeroCopy"><span className="eyebrow">Modern collection</span><h1>{slide.title || "Fresh arrivals for everyday living"}</h1><p>{slide.subtitle || "Shop thoughtfully selected products with trusted checkout."}</p><span className="heroPrimary">Shop Now</span></div>}
          </a>
        </article>;
      })}
    </div>
    {count > 1 && <div className="homeHeroDots" aria-label="Choose banner">{slides.map((slide, index) => <button key={slide._id || index} type="button" className={current === index ? "active" : ""} aria-label={`Show banner ${index + 1}`} aria-pressed={current === index} onClick={() => goTo(index, index > current ? 1 : -1)} />)}</div>}
  </section>;
}
