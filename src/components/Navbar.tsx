import React from 'react';
import Box from '@mui/material/Box';

interface NavbarProps {
  onNavigate: (section: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderBottom: '2px solid white',
        padding: 2,
        maxWidth: '62%',
        margin: 'auto',
        borderRadius: 1,
        color: '#E5E4E2',
        height: '8vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#494d5f',
        fontWeight: 'bold',
      }}
    >
      <Box
        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
        onClick={() => onNavigate('about')}
      >
        <span style={{ color: '#ffc2ff' }}>&lt;</span> about{' '}
        <span style={{ color: '#ffc2ff' }}>&gt;</span>
      </Box>
      <Box
        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
        onClick={() => onNavigate('experience')}
      >
        <span style={{ color: '#ffc2ff' }}>&lt;</span> experience{' '}
        <span style={{ color: '#ffc2ff' }}>&gt;</span>
      </Box>
      <Box
        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
        onClick={() => onNavigate('skills')}
      >
        <span style={{ color: '#ffc2ff' }}>&lt;</span> skills{' '}
        <span style={{ color: '#ffc2ff' }}>&gt;</span>
      </Box>
    </Box>
  );
};

export default Navbar;
