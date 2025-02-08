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
                margin: '40px'
            }}>
                <Typography sx={{
                    fontSize: '3rem',
                    fontWeight: 'bold'
                }}>
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> my work <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <ProjectCarousel />
        </>
    );
}

export default Projects;