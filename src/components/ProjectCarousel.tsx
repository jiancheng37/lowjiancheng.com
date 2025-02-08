import { useState } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
    image: string;
    title: string;
    details: string[];
    github?: string;
    website?: string;
    slides?: string;
}

const projects: Project[] = [
    {
        image: "./fractionate.png",
        title: "fractionate - a real estate fractionalisation platform",
        details: [
            "developed during my internship at the nus fintech lab",
            "project was selected for demonstration at ubri connect 2024 international conference to showcase real asset tokenisation",
            "tech stack: react, express, postgresql, xrpl",
        ],
        slides: "/fract-slides.pdf"
    },
    {
        image: "./portfolio.png",
        title: "lowjiancheng.com - my personal portfolio website",
        details: [
            "the website you are currently on right now!",
            "designed with a mobile-first approach to ensure a seamless experience across all devices",
            "tech stack: react, mui, typescript",
        ],     
        github: "https://github.com/jiancheng37/prophet.",
        website: "https://prophetbyjc.com",   
    },
    {
        image: "./prophet.png",
        title: "prophet - a cryptocurrency price prediction platform",
        details: [
            "a dApp where users earn money by predicting the price of cryptocurrency",
            "my first exposure to full stack and smart contract development",
            "tech stack: next, mui, solidity, foundry",
        ],     
        github: "https://github.com/jiancheng37/prophet.",
        website: "https://prophetbyjc.com",   
    },
];

const ProjectCarousel = () => {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    const handlePrev = () => {
        setDirection(-1);
        setIndex((prev) => (prev === 0 ? projects.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setDirection(1);
        setIndex((prev) => (prev === projects.length - 1 ? 0 : prev + 1));
    };

    return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
            {/* Left Arrow */}
            <IconButton onClick={handlePrev}>
                <ChevronLeft sx={{ fontSize: 40, color: "#a3a3a3" }} />
            </IconButton>

            {/* Content Box */}
            <Box sx={{ display: "flex", gap: 10, position: "relative", width: 1000, height: 300, overflow: "hidden" }}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={index}
                        initial={{ x: direction * 200, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -direction * 200, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        style={{ display: "flex", justifyContent: "space-between", gap: 10, position: "absolute", width: "100%" }}
                    >
                        <Box sx={{ width: 480, height: 270 }}>
                            <img
                                src={projects[index].image}
                                alt="project"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "12px",
                                    border: "1px solid #ffc2ff",
                                }}
                            />
                        </Box>
                        <Box sx={{ width: 480, height: 270 }}>
                            <Typography sx={{ color: "#a3a3a3", fontFamily: "monospace" }}>
                                {projects[index].title}
                            </Typography>
                            <Typography sx={{ color: "#E5E4E2", fontFamily: "monospace" }}>
                                <ul>
                                    {projects[index].details.map((detail, i) => (
                                        <li key={i}>{detail}</li>
                                    ))}
                                </ul>
                            </Typography>
                            {/* Buttons */}
                            <Box sx={{ display: "flex", gap: 2, marginTop: 2 }}>
                                {projects[index].github && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].github}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        GitHub
                                    </Button>
                                )}
                                {projects[index].website && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].website}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        Website
                                    </Button>
                                )}
                                {projects[index].slides && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].slides}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        Pitch Deck
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </motion.div>
                </AnimatePresence>
            </Box>

            {/* Right Arrow */}
            <IconButton onClick={handleNext}>
                <ChevronRight sx={{ fontSize: 40, color: "#a3a3a3" }} />
            </IconButton>
        </Box>
    );
};

export default ProjectCarousel;
