import React from 'react';
import { Box, Typography } from '@mui/material';

interface ProfileCardProps {
    icon?: React.ElementType; // URL for the image source
    title: string; // Title text (e.g., company name)
    subtitle: string; // Subtitle text (e.g., role or position)
    time: string;
    descriptionItems: string[]; // Array of description bullet points
}

const ProfileCard: React.FC<ProfileCardProps> = ({ icon: Icon, title, subtitle, descriptionItems, time }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' }, // Stack on mobile
                alignItems: { xs: 'center', md: 'start' }, // Center items on mobile
                marginTop: { xs:'10px', md: '56px'},
                maxWidth: { xs: '70%', md: '600px' }, // Responsive width
                marginLeft: 'auto',
                marginRight: 'auto',
                backgroundColor: 'rgba(11, 36, 59, 0.4)', // Semi-transparent background
                borderRadius: '16px', // Rounded edges
                padding: { xs: 2, md: 3 }, // Adjust padding for mobile
                backdropFilter: 'blur(10px)', // Glass effect
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: { xs: 'center', md: 'left' }, // Center text on mobile
            }}
        >
            {/* Icon Section */}
            {Icon && (
                <Box 
                    sx={{
                        marginBottom: { xs: 2, sm: 0 }, // Add spacing on mobile
                        marginRight: { xs: 0, sm: '35px' }, // Adjust spacing dynamically
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffc2ff',
                        borderRadius: '50%',
                        color: '#494d5f',
                        padding: { xs: '6px', sm: '8px' }, // Smaller padding on mobile
                    }}
                >
                    <Icon sx={{ fontSize: { xs: 20, sm: 30 } }} /> {/* Smaller icon on mobile */}
                </Box>
            )}

            {/* Text Section */}
            <Box>
                <Typography
                    sx={{
                        color: '#ffc2ff',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', sm: '1rem', md: '1.1rem', lg: '1.3rem' }, // Adjust font size for mobile
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    sx={{
                        color: '#a3a3a3',
                        fontFamily: 'monospace',
                        fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
                    }}
                >
                    {subtitle}
                </Typography>
                <Typography
                    sx={{
                        color: '#a3a3a3',
                        fontFamily: 'monospace',
                        fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
                    }}
                >
                    {time}
                </Typography>
                <Typography
                    component="ul"
                    sx={{
                        color: '#E5E4E2',
                        fontFamily: 'monospace',
                        marginTop: '8px',
                        paddingLeft: { xs: '16px', sm: '20px' }, // Adjust bullet point spacing
                        fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
                        textAlign: 'left'
                    }}
                >
                    {descriptionItems.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </Typography>
            </Box>
        </Box>
    );
};

export default ProfileCard;
