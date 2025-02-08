import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';  // For navigation to different sections

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
    }}>
      <Typography variant="h2" sx={{
        fontWeight: 'bold',
        fontSize: '3rem',
        fontFamily: 'monospace',
      }}>
        hi, my name is
      </Typography>
      <Typography variant="h1" sx={{
        fontWeight: 'bold',
        fontSize: '10rem',
        color: '#ffc2ff', // Lighter color for the name
        marginTop: 2,
      }}>
        jian cheng
      </Typography>
      <Typography sx={{
        fontWeight: 'normal',
        fontSize: '2rem',
        fontFamily: 'monospace',
        marginTop: 8,
        color: '#a3a3a3', // Light gray color for the tagline
      }}>
        welcome to my humble abode!
      </Typography>
    </Box>
  );
}

export default Welcome;
