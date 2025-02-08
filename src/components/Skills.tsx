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
                margin: '40px'
            }}>
                <Typography sx={{
                    fontSize: '3rem',
                    fontWeight: 'bold'
                }}>
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> skills <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
                <SkillsSection title="languages" skills={["python", "java", "sql", "javascript", "c", "html/css"]} />
                <SkillsSection title="frontend" skills={["react.js", "next.js", "tailwind", "material-ui"]} />
                <SkillsSection title="backend" skills={["node.js", "express.js", "postman", "postgresql", "monogdb", "firebase"]} />
                <SkillsSection title="dev-ops" skills={["git", "github", "docker", "aws"]} />
            </Box>

        </div>
    );
});

export default Skills;