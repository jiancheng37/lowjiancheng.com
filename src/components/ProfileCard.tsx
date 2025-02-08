import React from 'react';
import { Box, Typography } from '@mui/material';

// Define props for the ProfileCard component
interface ProfileCardProps {
    icon?: React.ElementType; // URL for the image source
    title: string; // Title text (e.g., company name)
    subtitle: string; // Subtitle text (e.g., role or position)
    descriptionItems: string[]; // Array of description bullet points
}

const ProfileCard: React.FC<ProfileCardProps> = ({ icon: Icon, title, subtitle, descriptionItems }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                marginTop: '56px',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto',
                alignItems: 'start',
            }}
        >
            {Icon && (
                <Box sx={{ marginRight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffc2ff', borderRadius: '50%', color: '#494d5f', padding: '8px' }}>
                    <Icon sx={{ fontSize: 30}} />
                </Box>
            )}
            <Box>
                <Typography
                    sx={{
                        color: '#ffc2ff',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    sx={{
                        color: '#a3a3a3',
                        fontFamily: 'monospace',
                    }}
                >
                    {subtitle}
                </Typography>
                <Typography
                    component="ul"
                    sx={{
                        color: '#E5E4E2',
                        fontFamily: 'monospace',
                        marginTop: '8px',
                        paddingLeft: '20px',
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
