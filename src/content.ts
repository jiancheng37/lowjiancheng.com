/* Page content. Kept out of the components so the copy can be edited without
   touching layout. Work experience and the dictionary entries are final. */

export const PROFILE = {
  name: 'Jian Cheng,',
  nameCJK: '建成',
  email: 'lowjiancheng3773@gmail.com',
  linkedin: 'https://linkedin.com/in/lowjc',
  github: 'https://github.com/jiancheng37',
  /* Shown under the name, one at a time, via the typewriter. */
  roles: [
    'a final-year Computer Science student',
    'an aspiring software engineer',
    'a pianist',
    'an F1 fanatic',
    'a (semi) retired police officer',
  ],
};

/* Hero portraits — a shuffleable stack of plates. First one is on top at load;
   add more here and the click-to-shuffle picks them up automatically. */
export interface ProfileFigure {
  src: string;
  alt: string;
  caption: string;
}

export const PROFILE_FIGURES: ProfileFigure[] = [
  {
    src: '/profile-photo.png',
    alt: 'Jian Cheng with a deer in Nara',
    caption: 'Making friends in Nara. The deer consented.',
  },
  {
    src: '/profile-rome.jpg',
    alt: 'Jian Cheng in front of the Colosseum in Rome',
    caption: 'Rome. Doing my best to look unbothered by the Colosseum.',
  },
  {
    src: '/profile-paris.jpg',
    alt: 'Jian Cheng in front of the Eiffel Tower at night',
    caption: 'Paris, slightly out of focus.',
  },
  {
    src: '/profile-alps.jpg',
    alt: 'Jian Cheng in the Swiss Alps at dusk',
    caption: 'Switzerland, last light on the peaks.',
  },
  {
    src: '/profile-hood.jpg',
    alt: 'Jian Cheng and his partner taking a mirror photo with a camera',
    caption: 'Me and my lobster 🦞.',
  },
];

export const NAV_ITEMS = [
  { id: 'c-me', label: 'Me' },
  { id: 'c-about', label: 'About' },
  { id: 'c-chapters', label: 'Chapters' },
  { id: 'c-work', label: 'Work' },
  { id: 'c-projects', label: 'Projects' },
];

/* ── about: the two characters of the name, set as dictionary headwords ──── */

export interface Sense {
  text: string;
  gloss?: string;
}

/* The note bodies carry inline italics, so they live in the About component
   as JSX rather than as strings here. */
export interface DictionaryEntry {
  glyph: string;
  pinyin: string;
  ipa: string;
  partOfSpeech: string;
  senses: Sense[];
  noteLabel: string;
}

export const DICTIONARY_ENTRIES: DictionaryEntry[] = [
  {
    glyph: '建',
    pinyin: 'jiàn',
    ipa: '/t͡ɕi̯ɛn˥˩/',
    partOfSpeech: 'verb',
    senses: [
      { text: 'to build; to construct.' },
      { text: 'to establish; to found', gloss: '— a city, an institution, a habit.' },
      { text: 'to propose; to put forward.' },
    ],
    noteLabel: 'Origin',
  },
  {
    glyph: '成',
    pinyin: 'chéng',
    ipa: '/ʈ͡ʂʰɤŋ˧˥/',
    partOfSpeech: 'verb · adj. · meas.',
    senses: [
      { text: 'to accomplish; to bring off.' },
      { text: 'to succeed', gloss: '— to become the thing intended.' },
    ],
    noteLabel: 'Note',
  },
];

/* ── life chapters — significant moments on the vertical timeline ────────── */

/** Reference note behind a chapter logo — what the place actually is, for
 *  anyone who hasn't spent their life in the Singapore school system. */
export interface OrgNote {
  name: string;
  kind: string;
  founded: string;
  blurb: string;
  href?: string;
}

export const ORG_NOTES: Record<string, OrgNote> = {
  nus: {
    name: 'National University of Singapore',
    kind: 'Public research university · Kent Ridge, Singapore',
    founded: '1905',
    blurb:
      'Singapore’s oldest institution of higher learning. It began in 1905 as a government medical school with 23 students, paid for by a public subscription the local community raised themselves, and took its present form in 1980 when the University of Singapore merged with Nanyang University. It now sits inside the world’s top ten in the QS rankings. My degree comes from its School of Computing.',
    href: 'https://nus.edu.sg',
  },
  cpf: {
    name: 'Central Provident Fund Board',
    kind: 'Statutory board under the Ministry of Manpower · Singapore',
    founded: '1 July 1955',
    blurb:
      'The CPF is Singapore’s compulsory savings scheme: a slice of every working person’s pay goes in each month, and comes back out for retirement, healthcare and housing. The British colonial government set it up in 1955 as a cheaper answer than a state pension, and it has since become the thing that quietly determines how most Singaporeans retire and buy their homes. The Board administers all of it.',
    href: 'https://www.cpf.gov.sg',
  },
  epfl: {
    name: 'École Polytechnique Fédérale de Lausanne',
    kind: 'Federal institute of technology · Lausanne, Switzerland',
    founded: '1853, federal since 1969',
    blurb:
      'Founded in 1853 as a private engineering school with eleven students, and made Switzerland’s second federal institute of technology — the French-speaking counterpart to ETH Zürich — on 1 January 1969. The campus runs along the shore of Lake Geneva with the Alps on the far side, which does permanent damage to your expectations of a lecture hall.',
    href: 'https://www.epfl.ch',
  },
  privyr: {
    name: 'Privyr',
    kind: 'SaaS startup · Singapore',
    founded: '2018',
    blurb:
      'A mobile-first CRM for salespeople who run their entire business out of WhatsApp. It pulls leads in from places like Facebook and TikTok ads, auto-personalises the follow-ups, and tracks what happens after you hit send — built for B2C sellers in markets where a chat app, not email, is where deals actually close. Used by a few hundred thousand salespeople across more than a hundred countries.',
    href: 'https://privyr.com',
  },
  'fintech-lab': {
    name: 'NUS FinTech Lab',
    kind: 'Research and industry hub, NUS School of Computing',
    founded: 'November 2019',
    blurb:
      'Set up in 2019 with a gift from Ripple’s University Blockchain Research Initiative, the lab sits between academics, regulators and startups, working on digital payments, blockchain, and financial inclusion. A good share of the actual building gets handed to students, which is how a first-year intern ends up shipping something on a live ledger.',
    href: 'https://fintechlab.nus.edu.sg',
  },
  spf: {
    name: 'Singapore Police Force',
    kind: 'Home Team department, Ministry of Home Affairs',
    founded: 'May 1820',
    blurb:
      'One of the oldest organisations in the country: twelve men under Francis James Bernard, keeping order in a trading post that was barely a year old. It now runs to roughly 15,000 regular officers, civilian staff and full-time national servicemen — that last group being conscripts posted to the police rather than the military, which is how I spent two years of my life. Motto: Setia dan Bakti, loyalty and service.',
    href: 'https://www.police.gov.sg',
  },
  hci: {
    name: 'Hwa Chong Institution',
    kind: 'Independent school · Bukit Timah, Singapore',
    founded: '1919',
    blurb:
      'Founded by the philanthropist Tan Kah Kee in 1919 as The Chinese High School, the first Chinese-language secondary school in Southeast Asia, and merged with Hwa Chong Junior College in 2005 into a single six-year institution. Its clock tower is a gazetted national monument. The motto, 自强不息, is best read as: never stop making yourself better.',
    href: 'https://hci.edu.sg',
  },
  sji: {
    name: 'Saint Joseph’s Institution',
    kind: 'Catholic boys’ school · Singapore',
    founded: '1852',
    blurb:
      'Singapore’s first Catholic school and its third oldest school of any kind, started in 1852 by six De La Salle Brothers who sailed from Europe at the urging of a French priest, Father Jean-Marie Beurel. It opened as a free school on Bras Basah Road; that original building is now the Singapore Art Museum. Motto: Ora et Labora — pray and work.',
    href: 'https://www.sji.edu.sg',
  },
  sg: {
    name: 'Singapore',
    kind: 'Island city-state · Southeast Asia',
    founded: 'Independent 9 August 1965',
    blurb:
      'Roughly 730 square kilometres of island at the tip of the Malay Peninsula, independent since 1965 — not by choice, but by being asked to leave Malaysia. Home to about six million people, four official languages, and exactly one kind of weather.',
  },
};

export interface Chapter {
  year: string;
  title: string;
  place?: string;
  body: string;
  /** Optional mark in public/. Rendered in a shared ink/sepia tone. */
  logo?: string;
  /** Short fallback when no logo file (e.g. "EPFL", "CPF"). */
  mark?: string;
  /** Key into ORG_NOTES — clicking the logo opens the reference note. */
  org?: keyof typeof ORG_NOTES;
}

export const CHAPTERS: Chapter[] = [
  {
    year: 'Now',
    title: 'NUS, Bachelor of Computing in Computer Science',
    place: 'Student',
    logo: '/nus.png',
    org: 'nus',
    mark: 'NUS',
    body:
      'Final year. You got this, Cheng.',
  },
  {
    year: '2026',
    title: 'Central Provident Fund Board',
    place: 'AI Developer Intern',
    logo: '/cpf.png',
    org: 'cpf',
    mark: 'CPF',
    body:
      'First real look at AI agents — LangGraph loops, MCPs, the whole circus. Eye-opening.',
  },
  {
    year: '2025',
    title: 'EPFL, Bachelor in Computer Science',
    place: 'Student Exchange Program',
    logo: '/epfl.png',
    org: 'epfl',
    mark: 'EPFL',
    body:
      'Did not know what to expect. Turned out to be the best 5 months of my life. Never got tired of waking up to the Alps right outside my room. Lausanne will always have a special place in my heart.',
  },
  {
    year: '2025',
    title: 'Privyr',
    place: 'Software Engineer Intern',
    logo: '/privyr.png',
    org: 'privyr',
    mark: 'PV',
    body:
      'Favourite internship yet. First time shipping code to real users. Liked the people, liked the work — and loved clocking in at 10am. Try finding that elsewhere in tech.',
  },
  {
    year: '2024',
    title: 'NUS FinTech Lab',
    place: 'Software Engineer Intern',
    logo: '/fintech-lab.png',
    org: 'fintech-lab',
    mark: 'FTL',
    body:
      'First software engineering internship. Or rather first internship ever. ( woo! ) Mostly developed proof-of-concepts, but having the opportunity to build on blockchain was cool, especially after years being on the other side of it: trading, memecoins, and the rest of the degeneracy.',
  },
  {
    year: '2023',
    title: 'NUS, Bachelor of Computing in Information Systems',
    place: 'Student',
    logo: '/nus.png',
    org: 'nus',
    mark: 'NUS',
    body:
      'Enrolled. Changed to Computer Science after a year. Why? Told people I was an avid pain enjoyer; the more honest reason was wanting a more technical path into software engineering.',
  },
  {
    year: '2021',
    title: 'Singapore Police Force',
    place: 'Policeman · Tech Support',
    logo: '/spf.png',
    org: 'spf',
    mark: 'SPF',
    body:
      'Two months of basic training — endless law lectures and walking laps around the field billed as “Physical Training” — then twenty-two long months on tech support. Mostly asking officers if they’d tried unplugging the LAN cable and plugging it back in. Probably the loneliest I’ve ever felt. Would not repeat.',
  },
  {
    year: '2019',
    title: 'Hwa Chong Institution',
    place: 'Student',
    logo: '/hci.png',
    org: 'hci',
    mark: 'HCI',
    body:
      'Two years went by in a blur, especially once Covid took the second half. Overall, my time here was alright. Nothing much to rave about. 6 out of 10. (Apparently we’re ranking life stages now.)',
  },
  {
    year: '2016',
    title: "Saint Joseph's Institution",
    place: 'Student',
    logo: '/sji.png',
    org: 'sji',
    mark: 'SJI',
    body:
      'Probably the best four years of my schooling life. Ora et labora.',
  },
  {
    year: '2002',
    title: 'Born',
    place: 'Singapore',
    logo: '/sg.png',
    org: 'sg',
    mark: 'SG',
    body:
      'Arrived.',
  },
];

/* ── work experience ─────────────────────────────────────────────────────── */

export interface Job {
  company: string;
  role: string;
  dates: string;
  location?: string;
  tags: string[];
  bullets: string[];
  /** Mark in public/, shown beside the company name in full colour. */
  logo?: string;
  /** Key into ORG_NOTES — company name and logo open the reference note. */
  org?: keyof typeof ORG_NOTES;
}

export const JOBS: Job[] = [
  {
    company: 'CPF Board',
    logo: '/cpf.png',
    org: 'cpf',
    role: 'AI Developer Intern',
    dates: 'May 2026 – Aug 2026',
    tags: ['LangGraph', 'Playwright', 'Python'],
    bullets: [
      'Developed a LangGraph-based AI testing harness orchestrating planning, Playwright test generation, execution, failure classification, healing and reruns from natural-language UAT scenarios.',
      'Implemented domain-specific guardrails and validation rules to preserve test intent, restricting automated healing to selector, timing and browser-interaction issues.',
      'Automated structured test reporting and traceable execution workflows, reducing reliance on manual UI testing by non-technical users.',
    ],
  },
  {
    company: 'Privyr',
    logo: '/privyr.png',
    org: 'privyr',
    role: 'Software Engineer Intern',
    dates: 'May 2025 – Aug 2025',
    tags: ['Django', 'Nuxt.js', 'AWS S3', 'Cloudflare'],
    bullets: [
      'Built and shipped 5+ customer-facing web pages using Django templates.',
      'Designed a secure media upload architecture with Cloudflare request validation and AWS S3 pre-signed URLs, strengthening abuse resistance and storage security.',
      'Built and integrated a Nuxt.js onboarding module for call scheduling, improving the activation flow for new users.',
      'Developed a Django admin operation to safely delete user organisations and related data at scale, reducing manual ops effort.',
    ],
  },
  {
    company: 'NUS FinTech Lab',
    logo: '/fintech-lab.png',
    org: 'fintech-lab',
    role: 'Software Engineer Intern',
    dates: 'Jul 2024 – Jan 2025',
    tags: ['React', 'Node.js', 'PostgreSQL', 'XRPL'],
    bullets: [
      'Built an end-to-end real estate tokenisation platform on XRPL with React, Node.js/Express, PostgreSQL and Docker.',
      'Shipped REST APIs for auth, tokenisation, listings and buy/sell, keeping ledger and database state in sync.',
      'Engineered XRPL issuance and marketplace flows, including balance and trustline checks.',
      'Selected for UBRI Connect 2024; partnered with Unlockit on Singapore fractionalisation use cases.',
    ],
  },
];

/* ── projects ────────────────────────────────────────────────────────────── */

export type ProjectLinkKind = 'live' | 'code' | 'slides' | 'demo';

export interface ProjectLink {
  kind: ProjectLinkKind;
  href: string;
  label: string;
}

export interface Project {
  title: string;
  image: string;
  /** Extra plates; click cycles. First entry is on top at load. */
  images?: string[];
  imageAlt: string;
  description: string;
  tags: string[];
  links: ProjectLink[];
}

export const PROJECTS: Project[] = [
  {
    title: 'Fractionate',
    image: '/fractionate.png',
    images: ['/fractionate.png', '/fractionate-pitch.png'],
    imageAlt: 'Fractionate dashboard and UBRI Connect pitch mockups',
    description:
      'Split real property into tokens you can trade, built on XRPL at the NUS FinTech Lab. Most of the work was making the ledger and the database stop disagreeing about who owns what. Shown at UBRI Connect 2024 — which is where I learned that explaining crypto to strangers is its own sport.',
    tags: ['React', 'Express', 'PostgreSQL', 'XRPL'],
    links: [
      { kind: 'slides', href: '/fract-slides.pdf', label: 'Pitch deck' },
      { kind: 'demo', href: '/fract-demo.mp4', label: 'Demo video' },
    ],
  },
  {
    title: 'Tandem',
    image: '/tandem-buyer.png',
    images: ['/tandem-buyer.png', '/tandem.png'],
    imageAlt: 'Tandem buyer view and seller cockpit for livestream AI co-host',
    description:
      'An AI co-host for livestream sellers on Shopee Live. Chat flies by at fifty messages a minute — Tandem triages it, auto-answers the safe ones, escalates the rest, and lets the seller run the storefront by voice while their hands stay busy. Say “rosewood lip tint, twenty percent off for ten minutes” and the buyer’s screen updates. No clicking.',
    tags: ['Next.js', 'OpenAI Realtime', 'DynamoDB', 'AWS Lambda'],
    links: [
      {
        kind: 'demo',
        href: 'https://drive.google.com/file/d/1ft9exipWJyIGdVr5oc9XytxJC7wEvDK2/view',
        label: 'Demo video',
      },
      { kind: 'code', href: 'https://github.com/clarissatjx/stop-sign', label: 'Frontend' },
      { kind: 'code', href: 'https://github.com/noth-k/tandem', label: 'Backend' },
    ],
  },
  {
    title: 'Personal Portfolio',
    image: '/portfolio.png',
    images: ['/portfolio.png', '/portfolio-chapters.png', '/portfolio-work.png'],
    imageAlt: 'Screens from this portfolio — hero, chapters, and work',
    description:
      'This site. Rebuilt more times than I’ll admit before finally settling on paper, punch cards, and the occasional deer. One thing I constantly reminded myself throughout this process was to let my personality shine through. By the end of it, I wanted someone reading this to come away with at least a rough sense of who I am as a person.',
    tags: ['React', 'TypeScript', 'Framer Motion'],
    links: [
      { kind: 'live', href: 'https://lowjiancheng.com', label: 'Live site' },
      { kind: 'code', href: 'https://github.com/jiancheng37/portfolio', label: 'Source code' },
    ],
  },
];

/* ── curiosities ─────────────────────────────────────────────────────────── */

export interface Curiosity {
  id: string;
  label: string;
  title: string;
  body: string;
  /** Plates in public/ — one shows full-bleed; several become a small grid. */
  images?: string[];
  /** Optional image set used by the compact layout at 1023px and below. */
  responsiveImages?: string[];
  imageAlt?: string;
  caption?: string;
  /** Per-plate captions; falls back to `caption` when missing. */
  captions?: string[];
}

export const CURIOSITIES: Curiosity[] = [
  {
    id: 'music',
    label: 'Music',
    title: 'A listener, and a player.',
    images: [
      '/curiosities/music-2.png',
      '/curiosities/music-1.png',
      '/curiosities/music-3.png',
      '/curiosities/music-4.png',
    ],
    responsiveImages: ['/curiosities/music-3.png'],
    imageAlt: 'On stage at the keys',
    caption: 'Stage nights.',
    body:
      'My listening taste is fairly uncomplicated: mostly pop, acoustic, and hip-hop, with the same few favourites inevitably finding their way back into every playlist. Playing, however, feels much more personal. There is something deeply therapeutic about sitting at a piano and singing—the kind of release that listening alone never quite gives me. For a little while, everything else becomes quieter, and the music feels less like something I consume and more like somewhere I can retreat to.\n\nAt NUS, I was also part of a band in my residential college, where I had the chance to perform twice before a packed auditorium. Both times were equal parts nerve-racking and exhilarating: the rehearsals, the anticipation backstage, and then the strange rush of playing for a room full of people. They remain some of my favourite university memories—the kind I knew I would miss even while they were happening. ',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    title: 'Actually, just Overwatch',
    images: ['/curiosities/gaming-1.jpg'],
    responsiveImages: ['/curiosities/gaming-responsive.jpg'],
    imageAlt: 'Pharah figure from Overwatch',
    caption: 'Justice rains.',
    body:
      'I have played plenty of games, but only one ever took over my life. I started Overwatch in the open beta and have been a Pharah main more or less ever since. I could not tell you why projectiles come easily to me—something about leading a shot just makes sense. My first ever income came from boosting people up the ranks through Carousell listings, which is a strange line to have on a resume and a very good way to be paid for something you would have done anyway. A few teams even asked me to play for them.\n\nWhat I actually remember is the people. Every week through secondary school, the same group of us would pile into a lobby and play until someone had to go to bed. It was how I socialised, and the thing I looked forward to all week. We do not talk much anymore, but those nights still mean the world to me.\n\nI have since hung up the gloves. The game has moved on without me—new heroes, new maps, modes I have never touched. Other games have come and gone, but Overwatch is still the one I look back on most fondly.',
  },
  {
    id: 'photography',
    label: 'Photography',
    title: 'Pretty views, mostly',
    images: [
      '/curiosities/photography-1.jpg',
      '/curiosities/photography-2.jpg',
      '/curiosities/photography-3.jpg',
    ],
    responsiveImages: [
      '/curiosities/photography-responsive-1.jpg',
      '/curiosities/photography-responsive-2.jpg',
      '/curiosities/photography-responsive-3.jpg',
    ],
    imageAlt: 'Mount Fuji from a recent trip',
    caption: 'Fuji.',
    body:
      'I have no real idea what I am doing. ISO, shutter speed, aperture—I could recite the words, but ask me to explain the triangle properly and I will smile and change the subject. I do not chase technical perfection. I just like pretty views, and pointing a camera at them feels like a good enough reason to stop and look.\n\nThe camera itself has a slightly ridiculous origin story. I won two thousand dollars at a casino and, instead of doing anything sensible with it, bought a Fujifilm X100V. It has been my companion ever since. My favourite film simulation is Portra 400—warm, a little soft, the kind of look that makes ordinary light feel worth keeping. I am not trying to be a photographer. I am just trying not to walk past the good bits.',
  },
  {
    id: 'formula1',
    label: 'Formula 1',
    title: 'Cars going in circles',
    images: ['/curiosities/formula1-1.jpg', '/curiosities/formula1-2.jpg'],
    responsiveImages: [
      '/curiosities/formula1-1.jpg',
      '/curiosities/formula1-responsive-2.jpg',
    ],
    imageAlt: 'Singapore Grand Prix',
    caption: 'Marina Bay, 2024.',
    captions: [
      'Marina Bay, 2024',
      'Ferrari — my favourite way to be disappointed.',
    ],
    body:
      'For years I did not get Formula 1. It looked like cars going round a track, and then going round it again. Then in 2022 a friend of my dad\u2019s came into free tickets, the family went to the Grand Prix, and something about being there stuck. I have followed it ever since.\n\nI still cannot properly explain why. It is not the engineering—I could not tell you what most of the technical talk actually means. It is not the drivers as personalities either, though I will happily admit to being a Max and a Lewis fan. Whatever the reason, I have not missed a qualifying or a race since. Even the ones where nothing happens for fifty laps, I somehow cannot bring myself to turn the television off.',
  },
  {
    id: 'mma',
    label: 'Mixed Martial Arts',
    title: 'Strictly a spectator',
    images: ['/curiosities/mma-1.jpg'],
    responsiveImages: ['/curiosities/mma-responsive.jpg'],
    imageAlt: 'Israel Adesanya after knocking out Alex Pereira at UFC 287',
    caption: 'UFC 287.',
    body:
      'I do not train, and I have no illusions about how I would do in a cage. I just follow the UFC closely. There is something primal about two people trying to knock each other out that scratches an itch nothing else does, and a clean knockout spikes my dopamine in a way no other sport manages.\n\nThe build-up is part of it too. A fight with real history behind it—two people who actually want to settle something—lands very differently from two strangers matched on a card. By the time the walkouts start, I am usually far more invested than I have any right to be.\n\nMy favourite moment watching live was UFC 287: Israel Adesanya knocking out Alex Pereira in their rematch. Pereira had already beaten him three times before—twice in kickboxing, once in the Octagon—and the narrative was basically written. Then Izzy walked in, closed the chapter in the second round, and reminded everyone what it looks like when someone refuses to stay on the wrong side of a rivalry. The knockout was great, but the history behind it was what really made the moment.”',
  },
];
