import React from 'react';
import './styles/classical.css';
import './styles/portfolio.css';
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
