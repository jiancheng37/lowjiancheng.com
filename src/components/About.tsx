import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const About = React.forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div ref={ref}>
      {/* Heading */}
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
            fontSize: { xs: '1.25rem', md: '3rem' }, // Adjust heading size for mobile
            fontWeight: 'bold',
          }}
        >
          <span style={{ color: '#ffc2ff' }}>&lt;</span> About Me{' '}
          <span style={{ color: '#ffc2ff' }}>&gt;</span>
        </Typography>
      </Box>

      {/* Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row'}, // Stacks on small screens
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          textAlign: { xs: 'left', md: 'left' },
          width: { xs: '80%', md: '70%' },
          margin: 'auto'
        }}
      >
        {/* Image */}
        <Box
          component="img"
          src="./profile-photo.jpg"
          alt="Your Name"
          sx={{
            borderRadius: '50%',
            borderColor: '#ffc2ff',
            borderWidth: '1px',
            borderStyle: 'solid',
            width: '40%',
            maxWidth: { xs: '160px', md: '400px' },
            height: 'auto',
            objectFit: 'cover',
            marginRight: { xs: '0px', md: '100px',  },
            marginBottom: { xs: '20px', md: '0px' },
          }}
        />

        {/* Text */}
        <Box sx={{ maxWidth: '500px' }}>
          <Typography
            sx={{
              marginTop: 2,
              color: '#E5E4E2', 
              fontFamily: 'monospace',
              lineHeight: 1.8,
              fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
              letterSpacing: '0.05em',
            }}
          >
            I'm a Year 2 Computer Science student at the{' '}
            <a
              href="https://www.nus.edu.sg"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffc2ff', textDecoration: 'underline' }}
            >
              National University of Singapore
            </a>
            . I aspire to be a software developer, with a particular passion
            for backend technologies.
          </Typography>
          <Typography
            sx={{
              marginTop: 2,
              color: '#E5E4E2',
              fontFamily: 'monospace',
              lineHeight: 1.8,
              fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }, // Adjust font size for mobile
              letterSpacing: '0.05em',
            }}
          >
            But there's much more to me than the softwares I write! Outside of
            programming, you can find me attempting to get fit at the gym
            (<span style={{ fontStyle: "italic" }}>keyword: attempting</span>),
            watching video essays on YouTube (<span style={{ fontStyle: "italic" }}>I love watching </span> {' '}
              <a
              href="https://www.youtube.com/@veritasium"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffc2ff', textDecoration: 'underline', fontStyle: "italic"}}
            >
              Veritasium
            </a>
            !), or working on personal projects.
            Currently, I am on a mission to find the cafe that sells the best
            matcha latte in Singapore!
          </Typography>
        </Box>
      </Box>
    </div>
  );
});

export default About;
