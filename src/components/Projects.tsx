import { Box, Typography } from "@mui/material";
import ProjectCarousel from "./ProjectCarousel";
import { PortableWifiOff } from "@mui/icons-material";

const Projects: React.FC = () => {
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
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> My Work <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <ProjectCarousel />
        </>
    );
}

export default Projects;