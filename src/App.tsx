import React from 'react';
import './styles/tokens.css';
import './styles/foundations.css';
import './styles/primitives.css';
import './styles/layout.css';
import './styles/nav.css';
import './styles/hero.css';
import './styles/about.css';
import './styles/chapters.css';
import './styles/org-note.css';
import './styles/work.css';
import './styles/projects.css';
import './styles/curiosities.css';
import './styles/contact.css';
import './styles/responsive.css';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Chapters from './components/Chapters';
import Work from './components/Work';
import Projects from './components/Projects';
import ThingsIEnjoy from './components/ThingsIEnjoy';
import Contact from './components/Contact';
import { useSectionWheelNavigation } from './hooks/useSectionWheelNavigation';

/* One scrolling page with CSS scroll-snap between major sections. Navigation
   is in-page anchors with `scroll-behavior: smooth`. */
const App: React.FC = () => {
  useSectionWheelNavigation();

  return (
    <div className="page">
      <Nav />
      <Hero />
      <About />
      <Chapters />
      <Work />
      <Projects />
      <ThingsIEnjoy />
      <Contact />
    </div>
  );
};

export default App;
