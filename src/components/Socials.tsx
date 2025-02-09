import React from 'react';
import { Box, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';

const Socials: React.FC = () => {
    return (
        <>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                color: '#E5E4E2',
                padding: 2, // Adds spacing for mobile
                margin: { xs:'10px', sm: '56px'},
            }}>
                <Typography sx={{
                    fontSize: { xs: '1.25rem', md: '3rem' }, // Responsive font size
                    fontWeight: 'bold',
                    textAlign: 'center', // Centers text on small screens
                }}>
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> Socials <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'center',
                maxWidth: '70%',
                margin: 'auto'
            }}>
                <Typography sx={{ color: '#E5E4E2', fontFamily: 'monospace', fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }}}>
                    Feel free to connect with me on my socials! I promise you I don't bite :D
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        gap: { xs: '20px', md: '50px' }, // Reduce gap on mobile
                        justifyContent: 'center',
                        marginTop: { xs: 2, md: 5 },
                    }}
                >
                    {/* LinkedIn */}
                    <Box
                        component="a"
                        href="https://www.linkedin.com/in/lowjc37"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffc2ff',
                            borderRadius: '50%',
                            color: '#494d5f',
                            padding: { xs: '5px', sm: '6px', md: '8px' }, // Reduce padding on mobile
                            textDecoration: 'none',
                        }}
                    >
                        <LinkedInIcon sx={{ fontSize: { xs: 20, sm: 25, md: 30 } }} /> {/* Smaller font size on mobile */}
                    </Box>

                    {/* GitHub */}
                    <Box
                        component="a"
                        href="https://github.com/jiancheng37"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffc2ff',
                            borderRadius: '50%',
                            color: '#494d5f',
                            padding: { xs: '5px', sm: '6px', md: '8px' }, // Reduce padding on mobile
                            textDecoration: 'none',
                        }}
                    >
                        <GitHubIcon sx={{ fontSize: { xs: 20, sm: 25, md: 30 } }} /> {/* Smaller font size on mobile */}
                    </Box>

                    {/* Email */}
                    <Box
                        component="a"
                        href="mailto:lowjiancheng3773@gmail.com"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffc2ff',
                            borderRadius: '50%',
                            color: '#494d5f',
                            padding: { xs: '5px', sm: '6px', md: '8px' }, // Reduce padding on mobile
                            textDecoration: 'none',
                        }}
                    >
                        <EmailIcon sx={{ fontSize: { xs: 20, sm: 25, md: 30 } }} /> {/* Smaller font size on mobile */}
                    </Box>
                </Box>


            </Box>
        </>
    );
};

export default Socials;
