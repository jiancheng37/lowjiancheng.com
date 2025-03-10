import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { LinkedIn } from '@mui/icons-material';

interface NavbarProps {
  onNavigate: (section: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleDrawer = (open: boolean) => () => {
    setMobileOpen(open);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' }, // Hide on small screens
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid white',
          padding: 2,
          maxWidth: '80%',
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
        {/* Logo on the Left */}
        <Box 
          sx={{ display: 'flex', flex: 1, justifyContent: 'flex-start', cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Box 
            component="img" 
            src="/logo.png" 
            alt="logo" 
            sx={{ width: 60, height: 'auto' }} 
          />
        </Box>
        {/* Centered Navigation Links */}
        <Box sx={{ display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap', flex: 1, gap: { xs: 5, lg: 8 }}}>
          {['about', 'experience', 'skills'].map((section) => (
            <Box
              key={section}
              sx={{
                fontSize: { xs: 15, lg: 18 },
                cursor: 'pointer',
                padding: '8px 12px',
                transition: 'color 0.3s ease',
                '&:hover': { color: '#ffc2ff' },
              }}
              onClick={() => onNavigate(section)}
            >
              <span style={{ color: '#ffc2ff' }}>&lt;</span> {section.charAt(0).toUpperCase() + section.slice(1)}{' '}
              <span style={{ color: '#ffc2ff' }}>&gt;</span>
            </Box>
          ))}
        </Box>

        {/* Social Icons on the Right */}
        <Box sx={{ display: 'flex', gap: { xs: 1, lg: 1.5 }, flex: 1, justifyContent: 'flex-end' }}>  
          <IconButton component="a" href="/resume.pdf" target="_blank" rel="noopener noreferrer" sx={{ color: '#ffc2ff' }}>
            <ArticleIcon />
          </IconButton>
          <IconButton component="a" href="https://github.com/jiancheng37" target="_blank" rel="noopener noreferrer" sx={{ color: '#ffc2ff' }}>
            <GitHubIcon />
          </IconButton>
          <IconButton component="a" href="https://linkedin.com/in/lowjc" target="_blank" rel="noopener noreferrer" sx={{ color: '#ffc2ff' }}>
            <LinkedInIcon />
          </IconButton>
        </Box>
      </Box>


      {/* Mobile Navbar - Hamburger Menu */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' }, // Show only on small screens
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 2,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: '#494d5f',
          color: '#E5E4E2',
        }}
      >
        <IconButton sx={{ display: 'flex', flexGrow: 1, color: '#E5E4E2', justifyContent: 'flex-start' }}>
          <MenuIcon onClick={toggleDrawer(true)} fontSize="medium" />
        </IconButton>
        <Box 
          sx={{ display: 'flex', justifyContent: 'center', flex: 1, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Box 
            component="img" 
            src="/logo.png" 
            alt="logo" 
            sx={{ width: 40, height: 'auto' }} 
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end',  flexGrow: 1, }}>
          <IconButton component="a" href="/resume.pdf" target="_blank" rel="noopener noreferrer" sx={{ color: '#ffc2ff' }}>
            <ArticleIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Drawer (Sidebar) for Mobile Navigation */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 250,
            backgroundColor: '#494d5f',
            color: '#E5E4E2',
            padding: 2,
          },
        }}
      >
        <IconButton onClick={toggleDrawer(false)} sx={{ color: '#E5E4E2', alignSelf: 'flex-end' }}>
          <CloseIcon />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: 2,
            textAlign: 'center',
          }}
        >
          {['about', 'experience', 'skills'].map((section) => (
            <Box
              key={section}
              sx={{
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '12px',
                transition: 'color 0.3s ease',
                '&:hover': { color: '#ffc2ff' },
              }}
              onClick={() => {
                onNavigate(section);
                setMobileOpen(false); // Close menu on selection
              }}
            >
              <span style={{ color: '#ffc2ff' }}>&lt;</span> {section.charAt(0).toUpperCase() + section.slice(1)}{' '}
              <span style={{ color: '#ffc2ff' }}>&gt;</span>
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
