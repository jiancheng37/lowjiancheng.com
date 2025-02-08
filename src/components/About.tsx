import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

// Styled component for the image to make it circular
const ProfileImage = styled('img')({
  borderRadius: '50%',
  borderColor: '#ffc2ff',
  borderWidth: '1px',
  borderStyle: 'solid',
  width: '400px',
  height: '400px',
  objectFit: 'cover',
  marginRight: '100px',
});

// Update the component to use React.forwardRef
const About = React.forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div ref={ref}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          color: '#E5E4E2',
          padding: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: '3rem',
            fontWeight: 'bold',
          }}
        >
          <span style={{ color: '#ffc2ff' }}>&lt;</span> about me{' '}
          <span style={{ color: '#ffc2ff' }}>&gt;</span>
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          textAlign: 'left',
        }}
      >
        <ProfileImage src="./profile-photo.jpg" alt="Your Name" />
        <Box sx={{ maxWidth: '500px' }}>
          <Typography
            sx={{
              marginTop: 2,
              color: '#E5E4E2',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
              lineHeight: 1.8,
              letterSpacing: '0.05em',
            }}
          >
            i'm a year 2 computer science student at the{' '}
            <a
              href="https://www.nus.edu.sg"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffc2ff', textDecoration: 'underline' }}
            >
              national university of singapore
            </a>
            . i aspire to be a software developer, with a particular passion
            for backend technologies.
          </Typography>
          <Typography
            sx={{
              marginTop: 2,
              color: '#E5E4E2',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
              lineHeight: 1.8,
              letterSpacing: '0.05em',
            }}
          >
            but there's much more to me than the softwares i write! outside of
            programming, you can find me attempting to get fit at the gym,
            watching video essays on youtube or working on personal projects.
            currently, i am on a mission to find the cafe that sells the best
            matcha latte in singapore!
          </Typography>
        </Box>
      </Box>
    </div>
  );
});

export default About;
