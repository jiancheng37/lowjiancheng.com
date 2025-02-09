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
            flexDirection: { xs: 'column', sm: 'row' }, // Stack on mobile, row on larger screens
            justifyContent: 'center',
            alignItems: 'center',
            margin: {xs:'5px', md: '20px'},
            textAlign: 'center', // Center text when stacked
        }}>
            {/* Title Box */}
            <Box sx={{
                paddingBottom: { xs: '10px', sm: '0px' }, // Add space below title on mobile
                paddingRight: { xs: '0px', sm: '20px' }, // Add spacing for larger screens
            }}>
                <Typography sx={{
                    color: '#E5E4E2',
                    fontFamily: 'monospace',
                    fontSize: { xs: '0.8rem', sm: '1rem', md: '1.1rem', lg: '1.3rem' }, // Adjust font size for mobile
                }}>
                    {title}
                </Typography>
            </Box>

            {/* Skills List with Responsive Behavior */}
            <Box sx={{
                display: 'flex',
                flexWrap: 'wrap', // Allows items to wrap on small screens
                justifyContent: 'center', // Center items when stacked
                alignItems: 'center',
                borderLeft: { xs: 'none', sm: '2px solid white' }, // Remove border on mobile
                paddingLeft: { xs: '0px', sm: '20px' }, // Remove padding on mobile
                gap: '10px', // Adds spacing between skill cards
                overflowX: 'auto', // Allow horizontal scroll on very small screens
                width: '100%', // Ensure proper responsiveness
                maxWidth: '600px', // Prevent it from being too wide
            }}>
                {skills.map((skill, index) => (
                    <SkillsCard key={index} name={skill} />
                ))}
            </Box>
        </Box>
    );
};

export default SkillsSection;

