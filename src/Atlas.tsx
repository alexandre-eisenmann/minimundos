import MiniMundosWordmark from './scenes/assets/MiniMundosWordmark';
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, MapPin, Pause, Play } from 'lucide-react';
import { sceneRegistry } from './scenes/registry';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const hrefFor = (path: string) => `${basePath}${path}`;

export default function Atlas() {
  const [cycling, setCycling] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [hovered, setHovered] = useState(false);
  const [carouselRef, carousel] = useEmblaCarousel({
    loop: true,
    align: 'start',
  });
  const [selected, setSelected] = useState(0);
  const onSelect = useCallback(
    () => setSelected(carousel?.selectedScrollSnap() ?? 0),
    [carousel],
  );
  useEffect(() => {
    if (!carousel) return;
    onSelect();
    carousel.on('select', onSelect);
    return () => {
      carousel.off('select', onSelect);
    };
  }, [carousel, onSelect]);

  useEffect(() => {
    if (!carousel || !cycling || hovered) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) carousel.scrollNext();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [carousel, cycling, hovered]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (preference.matches) setCycling(false);
    };
    preference.addEventListener('change', stop);
    return () => preference.removeEventListener('change', stop);
  }, []);

  return (
    <main className="atlas">
      <header className="atlas-menu">
        <a
          className="atlas-brand"
          href={hrefFor('/')}
          aria-label="MiniMundos home"
        >
          <MiniMundosWordmark />
        </a>
        <nav className="atlas-nav" aria-label="Main navigation">
          <a href="#idea">The idea</a>
        </nav>
      </header>

      <section className="atlas-intro" aria-labelledby="atlas-title">
        <h1 id="atlas-title">
          Small worlds.
          <br />
          <em>Big discoveries.</em>
          <svg
            className="discovery-spark"
            viewBox="0 0 50 55"
            aria-hidden="true"
          >
            <path d="M22 3l-3 15M44 17l-15 8M41 43l-12-7" />
          </svg>
        </h1>
        <div className="intro-bottom">
          <p>
            A moment in time. A place in the world.
            <br />
            An idea waiting for <strong>you.</strong>
            <span className="intro-invitation">
              Explore little worlds where maths, science, and history meet.
            </span>
          </p>
        </div>
      </section>

      <section
        className="atlas-collection"
        id="worlds"
        aria-labelledby="worlds-title"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={(event) => {
          if (
            !(
              event.target instanceof Element &&
              event.target.closest('.carousel-playback')
            )
          )
            setCycling(false);
        }}
      >
        <div className="collection-heading">
          <h2 id="worlds-title">Where shall we go?</h2>
          <span>{sceneRegistry.length} little worlds. Endless questions.</span>
        </div>
        <div
          className="atlas-carousel"
          ref={carouselRef}
          onPointerDown={() => setCycling(false)}
          role="region"
          aria-roledescription="carousel"
          aria-label="Explore minimundos"
        >
          <div className="atlas-track">
            {sceneRegistry.map((scene, index) => (
              <article
                className={`atlas-slide atlas-slide-${scene.slug}`}
                key={scene.slug}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${sceneRegistry.length}: ${scene.title}`}
                inert={selected !== index}
              >
                <div className="world-art">
                  <img
                    src={hrefFor(scene.atlas.image)}
                    alt={scene.atlas.imageAlt}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                  />
                  <div className="world-art-label">
                    <span className="live-dot" /> Step inside. Try things. See
                    what happens.
                  </div>
                  <span className="world-number">
                    Minimundo <strong>0{index + 1}</strong>
                  </span>
                </div>
                <div className="world-story">
                  <div className="world-coordinates">
                    <MapPin size={13} />
                    <span>{scene.atlas.place}</span>
                    <span className="coordinate-divider">/</span>
                    <span>{scene.period}</span>
                  </div>
                  <div className="world-topics">
                    {scene.atlas.subjects.map((subject) => (
                      <span key={subject}>{subject}</span>
                    ))}
                  </div>
                  <h3>{scene.atlas.title}</h3>
                  <p className="world-question">{scene.atlas.question}</p>
                  <p className="world-description">{scene.atlas.description}</p>
                  <a className="enter-world" href={hrefFor(scene.path)}>
                    Enter this world <ArrowRight size={19} />
                  </a>
                  <span className="world-footnote">
                    Interactive 3D world <span>·</span> Explore at your own pace
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="carousel-footer">
          <span className="carousel-caption">
            A new adventure is just a curious question away.
          </span>
          <div className="carousel-controls">
            <button
              className="carousel-playback"
              onClick={() => setCycling((current) => !current)}
              aria-label={
                cycling ? 'Pause automatic cycling' : 'Start automatic cycling'
              }
            >
              {cycling ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => carousel?.scrollPrev()}
              aria-label="Previous world"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="carousel-dots">
              {sceneRegistry.map((scene, index) => (
                <button
                  key={scene.slug}
                  className={selected === index ? 'active' : ''}
                  aria-label={`Show ${scene.title}`}
                  aria-current={selected === index ? 'true' : undefined}
                  onClick={() => carousel?.scrollTo(index)}
                />
              ))}
            </div>
            <button
              onClick={() => carousel?.scrollNext()}
              aria-label="Next world"
            >
              <ArrowRight size={18} />
            </button>
            <span
              className="carousel-count"
              aria-live={cycling ? 'off' : 'polite'}
            >
              0{selected + 1} <span>/ 0{sceneRegistry.length}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="atlas-idea" id="idea">
        <div>
          <span className="atlas-eyebrow">FOR THE “WHAT IF?” MOMENTS</span>
          <h2>
            A little play.
            <br />
            <em>A lot to think about.</em>
          </h2>
        </div>
        <div className="idea-copy">
          <p>
            A city becomes a puzzle. A workshop becomes an experiment. Each
            minimundo captures a place and a moment, then invites you to ask:{' '}
            <em>what if?</em>
          </p>
          <p>
            Made for curious minds, independent adventures, and discoveries
            worth sharing in a classroom.
          </p>
          <span className="history-note">
            Historical ideas. Illustrative worlds. Your own discoveries.
          </span>
        </div>
      </section>
      <footer className="atlas-footer">
        <a href={hrefFor('/')} className="footer-brand">
          MiniMundos.
        </a>
        <span>A world of ideas. A little closer.</span>
        <a href="#worlds">
          Back to the atlas <ArrowRight size={14} />
        </a>
      </footer>
    </main>
  );
}
