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
    demo?: string;
}

const projects: Project[] = [
    {
        image: "./fractionate.png",
        title: "Fractionate - A Real Estate Fractionalization Platform",
        details: [
            "Developed during my internship at the NUS Fintech Lab",
            "Project was selected for demonstration at UBRI Connect 2024 international conference to showcase real asset tokenization",
            "Tech stack: React, Express, PostgreSQL, XRPL",
        ],
        slides: "/fract-slides.pdf",
        demo: "/fract-demo.mp4"
    },
    {
        image: "./portfolio.png",
        title: "lowjiancheng.com - My Personal Portfolio Website",
        details: [
            "The website you are currently viewing!",
            "Designed with a mobile-first approach to ensure a seamless experience across all devices",
            "Tech stack: React, MUI, TypeScript",
        ],     
        github: "https://github.com/jiancheng37/portfolio",
        website: "https://lowjiancheng.com",   
    },
    {
        image: "./prophet.png",
        title: "Prophet - A Cryptocurrency Price Prediction Platform",
        details: [
            "A decentralized application where users earn money by predicting cryptocurrency prices",
            "My first exposure to full-stack and smart contract development",
            "Tech stack: Next.js, MUI, Solidity, Foundry",
        ],     
        github: "https://github.com/jiancheng37/prophet",
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
        <Box sx={{ display: "flex", flexDirection: {xs: "column", md: "row"}, justifyContent: "center", alignItems: "center", gap: 2, width: {xs: '80%', md: '70%'}, margin: 'auto', flexWrap: "wrap"}}>
            {/* Left Arrow */}
            <IconButton onClick={handlePrev} sx={{ display: { xs: "none", md: "block" }}}>
                <ChevronLeft sx={{ fontSize: 40, color: "#a3a3a3" }} />
            </IconButton>

            {/* Content Box */}
            <Box sx={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                height: "auto",
                overflow: "hidden",
            }}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={index}
                        initial={{ x: direction * 200, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -direction * 200, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 20,
                            width: "100%",
                        }}
                    >
                        {/* Project Image */}
                        <Box sx={{
                            width: { xs: "90%", sm: "70%", md: 480 }, // Responsive image size
                            height: "auto",
                        }}>
                            <img
                                src={projects[index].image}
                                alt="project"
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    objectFit: "cover",
                                    borderRadius: "12px",
                                    border: "1px solid #ffc2ff",
                                }}
                            />
                        </Box>

                        {/* Project Details */}
                        <Box sx={{
                            width: { xs: "90%", sm: "80%", md: 480 },
                            textAlign: "center", // Center text on mobile
                        }}>
                            <Typography sx={{
                                color: "#a3a3a3",
                                fontFamily: "monospace",
                                fontSize: { xs: '0.8rem', sm: '1rem', md: '1.1rem', lg: '1.3rem' },
                                fontWeight: "bold",
                                marginBottom: "10px"
                            }}>
                                {projects[index].title}
                            </Typography>
                            <Typography sx={{
                                color: "#E5E4E2",
                                fontFamily: "monospace",
                                fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
                                textAlign: "left",
                            }}>
                                <ul style={{ paddingLeft: "20px" }}>
                                    {projects[index].details.map((detail, i) => (
                                        <li key={i}>{detail}</li>
                                    ))}
                                </ul>
                            </Typography>

                            {/* Buttons */}
                            <Box sx={{
                                display: "flex",
                                flexWrap: "wrap", // Ensures buttons wrap on smaller screens
                                justifyContent: "center",
                                gap: 2,
                                marginTop: 2
                            }}>
                                {projects[index].github && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].github ?? "#"}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        <Typography sx={{fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }}}>
                                            GitHub
                                        </Typography>
                                    </Button>
                                )}
                                {projects[index].website && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].website ?? "#"}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        <Typography sx={{fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }}}>
                                            Website
                                        </Typography>
                                    </Button>
                                )}
                                {projects[index].slides && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].slides ?? "#"}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        <Typography sx={{fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }}}>
                                            Pitch Deck
                                        </Typography>
                                    </Button>
                                )}
                                {projects[index].demo && (
                                    <Button
                                        variant="outlined"
                                        href={projects[index].demo ?? "#"}
                                        target="_blank"
                                        sx={{
                                            color: "#E5E4E2",
                                            borderColor: "#E5E4E2",
                                            "&:hover": { borderColor: "#ffc2ff", color: "#ffc2ff" }
                                        }}
                                    >
                                        <Typography sx={{fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }}}>
                                            Demo
                                        </Typography>
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </motion.div>
                </AnimatePresence>
            </Box>

            {/* Right Arrow */}
            <IconButton onClick={handleNext} sx={{ display: { xs: "none", md: "block" }}}>
                <ChevronRight sx={{ fontSize: 40, color: "#a3a3a3" }} />
            </IconButton>
            <Box sx={{
                display: { xs: "block", md: "none" }, flexDirection: "row", justifyContent: "center", alignItems: "center"
            }}>
                <IconButton onClick={handlePrev}>
                    <ChevronLeft sx={{ fontSize: 20, color: "#a3a3a3" }} />
                </IconButton>
                <IconButton onClick={handleNext}>
                    <ChevronRight sx={{ fontSize: 20, color: "#a3a3a3" }} />
                </IconButton>
            </Box>
        </Box>
    );
};

export default ProjectCarousel;
