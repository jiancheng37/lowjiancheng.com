import { Box, Typography } from "@mui/material";
import { styled } from '@mui/material/styles';
import ProfileCard from "./ProfileCard";
import SchoolIcon from '@mui/icons-material/School';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import CalculateIcon from '@mui/icons-material/Calculate';
import WorkIcon from '@mui/icons-material/Work';
import React from "react";

const Experience = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div ref={ref}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                color: '#E5E4E2',
            }}>
                <Typography sx={{
                    fontSize: '3rem',
                    fontWeight: 'bold'
                }}>
                    <span style={{ color: '#ffc2ff' }}>&lt;</span> experience <span style={{ color: '#ffc2ff' }}>&gt;</span>
                </Typography>
            </Box>
            <ProfileCard
                icon={WorkIcon}
                title="nus fintech lab"
                subtitle="software engineer intern"
                descriptionItems={[
                    'developed a real-world asset tokenization project leveraging blockchain to streamline real estate investment',
                    'architected a full-stack solution utilizing the xrp ledger to enable secure tokenization and fractionalization of real estate assets',
                    'project was selected for demonstration at ubri connect 2024 international conference to showcase real world asset tokenization',
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="nus computer science"
                subtitle="uni student"
                descriptionItems={[
                    'decided i am an avid pain enjoyer',
                    'okay real reason i switched is because i realised the business side of information systems did not excite me at all'
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="nus information systems"
                subtitle="uni student"
                descriptionItems={[
                    'decided that i am a pain enjoyer',
                    `somehow ended up on this guy's list though... think his name was dean`
                ]}
            />
            <ProfileCard
                icon={LocalPoliceIcon}
                title="special operations command (singapore police force)"
                subtitle="staff assistant to comms and computer department"
                descriptionItems={[
                    'essentially slaved for 2 years',
                    'though i did meet some very cool people and saw first-hand how things are ran in the police force'
                ]}
            />
            <ProfileCard
                icon={WorkIcon}
                title="freelance"
                subtitle="h2 mathematics private tutor"
                descriptionItems={[
                    'taught 7 students how to add, subtract, multiply and divide',
                    'really happy that all my students improved their grades under my guidance',
                    `but also realised that teaching wasn't a viable career path for me as i found it too repetitive`
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="hwa chong junior college"
                subtitle="jc student"
                descriptionItems={[
                    'thought that i would have been bottom of the barrel, but i held my own surprisingly well',
                    'think the greatest achievement in jc was that i survived covid'
                ]}
            />
            <ProfileCard
                icon={SchoolIcon}
                title="st. joseph's institution"
                subtitle="secondary school student"
                descriptionItems={[
                    'best 4 years of my life',
                ]}
            />
        </div>
    );
});

export default Experience;