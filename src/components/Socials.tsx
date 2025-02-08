import React from 'react';
import { Box, Typography } from '@mui/material';
import SkillsCard from './SkillsCard';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import GitHubIcon from '@mui/icons-material/GitHub';

const Socials: React.FC = () => {
    return (
        <>
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
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> contact <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '900px',
                marginRight: 'auto',
                marginLeft: 'auto',
                textAlign: 'center'
            }}>
                <Typography sx={{ color: '#E5E4E2', fontFamily: 'monospace', fontSize: '1.5rem'}}>
                    Feel free to connect with me on my socials! I promise you I don't bite :D
                </Typography>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',   
                    marginTop: '30px'
                }}>
                    <Box sx={{ marginRight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffc2ff', borderRadius: '50%', color: '#494d5f', padding: '8px' }}>
                        <LinkedInIcon sx={{ fontSize: 30}} />
                    </Box>
                    <Box sx={{ marginRight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffc2ff', borderRadius: '50%', color: '#494d5f', padding: '8px' }}>
                        <GitHubIcon sx={{ fontSize: 30}} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffc2ff', borderRadius: '50%', color: '#494d5f', padding: '8px' }}>
                        <InstagramIcon sx={{ fontSize: 30}} />
                    </Box>
                </Box>
            </Box>
        </>
    );
};

export default Socials;
