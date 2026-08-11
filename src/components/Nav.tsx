import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '../content';

/* The header bar. Sticky on scroll; below 1024px the links collapse behind a
   disclosure button, leaving brand + CTA on the bar itself. */
const Nav: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    let frame = 0;
    const updateOffset = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        /* Keep the measured CSS-pixel height intact. Rounding this up can put
           scroll-padding and the section snap target a fraction of a pixel
           apart from the actual sticky header edge. */
        const height = nav.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--nav-offset', `${height}px`);
      });
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="nav-bar" ref={navRef}>
      <a className="nav-brand-mark" href="#c-me" aria-label="Back to home">
        成
      </a>

      <nav className={`nav-links${menuOpen ? ' is-open' : ''}`} id="nav-links">
        {NAV_ITEMS.map((item, i) => (
          <a
            key={item.id}
            className={`nav-link${i === 0 ? ' is-active' : ''}`}
            href={`#${item.id}`}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a className="btn btn-primary nav-cta" href="#c-contact">
        Contact
      </a>

      <button
        type="button"
        className="btn btn-secondary btn-icon nav-toggle"
        aria-expanded={menuOpen}
        aria-controls="nav-links"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
    </div>
  );
};

export default Nav;
