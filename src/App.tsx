import React, {useRef} from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Welcome from "./components/Welcome";
import About from "./components/About";
import Experience from "./components/Experience";
import Skills from "./components/Skills";
import Socials from "./components/Socials";
import Projects from "./components/Projects";
import Footer from "./components/Footer";

const theme = createTheme({
  palette: {
    background: {
      default: "#494d5f", // Background color for the entire app
    },
  },
});

const App: React.FC = () => {
  const aboutRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="app-container">
          <Navbar
            onNavigate={(section: string) => {
              const yOffset = -80; // Adjust based on navbar height
              let element = null;

              if (section === 'about') element = aboutRef.current;
              if (section === 'experience') element = experienceRef.current;
              if (section === 'skills') element = skillsRef.current;

              if (element) {
                const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }}
          />
          <Welcome />
          <About ref={aboutRef}/>
          <Experience ref={experienceRef}/>
          <Projects />
          <Skills ref={skillsRef}/>
          <Socials />
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
