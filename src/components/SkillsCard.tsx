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
            padding: '10px',
            marginLeft: '30px'
        }}>
            <Typography sx={{
                color: '#494d5f',
                fontFamily: 'monospace'
            }}>
                {name}
            </Typography>
        </Box>
    );
  };

export default SkillsCard;