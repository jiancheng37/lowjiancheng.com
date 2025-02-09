import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const Welcome: React.FC = () => {
  return (
    <Box sx={{
      padding: 4,
      textAlign: 'center',
      color: '#E5E4E2',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center', // Ensures proper centering on all devices
    }}>
      <Typography variant="h2" sx={{
        fontWeight: 'bold',
        fontSize: { xs: '2rem', sm: '3rem', md: '4rem' }, // Adjust for smaller screens
        fontFamily: 'monospace',
      }}>
        Hi, I am 
      </Typography>
      <Typography variant="h1" sx={{
        fontWeight: 'bold',
        fontSize: { xs: '3rem', sm: '6rem'}, // Adjusts dynamically
        color: '#ffc2ff',
        marginTop: 2,
        whiteSpace: 'nowrap', // Prevents wrapping on large screens
        overflow: 'hidden',
      }}>
        JIAN CHENG
      </Typography>
      <Typography sx={{
        fontWeight: 'normal',
        fontSize: { xs: '1.2rem', sm: '2rem' }, // Reduce font size for mobile
        fontFamily: 'monospace',
        marginTop: { xs: 4, sm: 8 }, // Reduce spacing on smaller screens
        color: '#a3a3a3',
      }}>
        Welcome to my website!
      </Typography>
    </Box>
  );
}

export default Welcome;
