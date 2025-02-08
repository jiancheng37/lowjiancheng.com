import React from 'react';
import { Box, Typography } from '@mui/material';
import SkillsCard from './SkillsCard';

interface SkillsSectionProps {
    title: string;
    skills: string[];
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ title, skills }) => {
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '20px'
        }}>
            <Typography sx={{ color: '#E5E4E2', fontFamily: 'monospace', fontSize: '2rem', paddingRight: '20px' }}>
                {title}
            </Typography>
            <Box sx={{
                display: 'flex',
                borderLeft: '2px solid white',
                paddingLeft: '20px',
            }}>
                {skills.map((skill, index) => (
                    <SkillsCard key={index} name={skill} />
                ))}
            </Box>
        </Box>
    );
};

export default SkillsSection;

// Usage Example:
// <SkillsSection title="dev-ops" skills={["git", "github", "docker", "aws"]} />
