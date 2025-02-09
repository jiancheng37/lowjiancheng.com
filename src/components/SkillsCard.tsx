import React from 'react';
import { Box, Typography } from '@mui/material';

interface SkillsCardProps {
    name: string;
  }
  
  const SkillsCard: React.FC<SkillsCardProps> = ({ name }) => {
    return (
        <Box sx={{
            backgroundColor: '#ffc2ff',
            borderRadius: '10%',
            padding: { xs: '5px', md: '8px' },
            marginLeft: '5px',
        }}>
            <Typography sx={{
                color: '#494d5f',
                fontFamily: 'monospace',
                fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
            }}>
                {name}
            </Typography>
        </Box>
    );
  };

export default SkillsCard;