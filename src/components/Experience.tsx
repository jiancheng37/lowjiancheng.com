import { Box, Typography } from "@mui/material";
import ProfileCard from "./ProfileCard";
import SchoolIcon from '@mui/icons-material/School';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import WorkIcon from '@mui/icons-material/Work';
import React from "react";

const Experience = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div ref={ref}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                color: '#E5E4E2',
                padding: 2, // Adds spacing for mobile
            }}>
                <Typography sx={{
                    fontSize: { xs: '1.25rem', md: '3rem' }, // Responsive font size
                    fontWeight: 'bold',
                    textAlign: 'center', // Centers text on small screens
                }}>
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> Experience <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <ProfileCard
                icon={WorkIcon}
                title="NUS Fintech Lab"
                subtitle="Software Engineer Intern"
                time="August 2024 - January 2025"
                descriptionItems={[
                    "Developed a real-world asset tokenisation project leveraging blockchain to streamline real estate investment.",
                    "Architected a full-stack solution to enable secure tokenization and fractionalisation of real estate assets.",
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="NUS Computer Science"
                subtitle="University Student"
                time="May 2024 - Present"
                descriptionItems={[
                    "Decided I am an avid pain enjoyer.",
                    "Okay, the real reason I switched is because I realized the business side of Information Systems did not excite me at all.",
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="NUS Information Systems"
                subtitle="University Student"
                time="August 2023 - May 2024"
                descriptionItems={[
                    "Decided that I am a pain enjoyer.",
                    "Somehow ended up on this guy's list though... Think his name was Dean.",
                ]}
            />
            <ProfileCard
                icon={LocalPoliceIcon}
                title="Special Operations Command (Singapore Police Force)"
                subtitle="Staff Assistant to Communications & Computer Department"
                time="April 2021 - April 2023"
                descriptionItems={[
                    "Essentially slaved for two years.",
                    "Though I did meet some very cool people and saw firsthand how things are run in the police force.",
                ]}
            />
            <ProfileCard
                icon={WorkIcon}
                title="Freelance"
                subtitle="H2 Mathematics Private Tutor"
                time="December 2020 - December 2022"
                descriptionItems={[
                    "Taught seven students how to add, subtract, multiply, and divide.",
                    "Really happy that all my students improved their grades under my guidance.",
                    "But I also realized that teaching wasn't a viable career path for me as I found it too repetitive.",
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="Hwa Chong Junior College"
                subtitle="JC Student"
                time="January 2019 - December 2020"
                descriptionItems={[
                    "Thought that I would have been at the bottom of the barrel, but I held my own surprisingly well.",
                    "I think my greatest achievement in JC was surviving COVID-19.",
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="St. Joseph's Institution"
                subtitle="Secondary School Student"
                time="January 2015 - December 2018"
                descriptionItems={[
                    "The best four years of my life.",
                ]}
            />
        </div>
    );
});

export default Experience;
