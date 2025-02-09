import { Box, Typography } from "@mui/material";
import SkillsSection from "./SkillSection";
import React from "react";

const Skills = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div ref={ref}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                color: '#E5E4E2',
                padding: 2, // Adds spacing for mobile
                margin: { xs:'10px', md: '56px'},
            }}>
                <Typography sx={{
                    fontSize: { xs: '1.25rem', md: '3rem' }, // Responsive font size
                    fontWeight: 'bold',
                    textAlign: 'center', // Centers text on small screens
                }}>
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> Skills <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // Ensures content is centered on mobile
                gap: { xs: 0, md: 3 }, // Adds spacing between sections
                width: {xs: '80%', md: '70%'},
                margin: 'auto'
            }}>
                <SkillsSection title="Languages" skills={["Python", "Java", "SQL", "JavaScript", "C", "HTML/CSS"]} />
                <SkillsSection title="Frontend" skills={["React.js", "Next.js", "Tailwind", "Material-UI"]} />
                <SkillsSection title="Backend" skills={["Node.js", "Express.js", "Postman", "PostgreSQL", "MongoDB", "Firebase"]} />
                <SkillsSection title="DevOps" skills={["Git", "GitHub", "Docker", "AWS"]} />
            </Box>
        </div>
    );
});

export default Skills;
