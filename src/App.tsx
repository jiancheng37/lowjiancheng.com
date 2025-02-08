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
              if (section === 'about') aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              if (section === 'experience') experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              if (section === 'skills') skillsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <Welcome />
          <About ref={aboutRef}/>
          <Experience ref={experienceRef}/>
          <Projects />
          <Skills ref={skillsRef}/>
          <Socials />
          <main>
            <Routes>
              {/* Add your route definitions here */}
            </Routes> 
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
