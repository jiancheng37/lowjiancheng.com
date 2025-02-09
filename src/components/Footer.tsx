import { Box, Typography, IconButton } from "@mui/material";

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        backgroundColor: "transparent",
        color: "#E5E4E2",
        textAlign: "center",
        py: 3,
        mt: 5,
      }}
    >
      <Typography variant="body1" sx={{ fontFamily: "monospace", fontSize: { xs: '0.65rem', sm: '0.9rem', md: '1rem', lg: '1.1rem' }}}>
        © {new Date().getFullYear()} Low Jian Cheng. All rights reserved.
      </Typography>
    
    </Box>
  );
};

export default Footer;
