/* ──────────────────────────────────────────────────────────────────────────
   off the keys — what fills the time away from a keyboard.
   Carried over from the previous site for now. Photos live in public/off/.
   Blank lines in `body` start a new paragraph.
   ────────────────────────────────────────────────────────────────────────── */

export type Pastime = {
  label: string;
  title: string;
  photo: string;
  alt: string;
  caption: string;
  body: string;
};

export const OFF_KEYS: Pastime[] = [
  {
    label: 'music',
    title: 'a listener, and a player.',
    photo: 'music.jpg',
    alt: 'Jian Cheng on stage at a keyboard',
    caption: 'stage nights.',
    body:
      'My listening taste is fairly uncomplicated: mostly pop, acoustic, and hip-hop, with the same few favourites inevitably finding their way back into every playlist. Playing, however, feels much more personal. There is something deeply therapeutic about sitting at a piano and singing—the kind of release that listening alone never quite gives me. For a little while, everything else becomes quieter, and the music feels less like something I consume and more like somewhere I can retreat to.\n\nAt NUS, I was also part of a band in my residential college, where I had the chance to perform twice before a packed auditorium. Both times were equal parts nerve-racking and exhilarating: the rehearsals, the anticipation backstage, and then the strange rush of playing for a room full of people. They remain some of my favourite university memories—the kind I knew I would miss even while they were happening.',
  },
  {
    label: 'gaming',
    title: 'actually, just overwatch.',
    photo: 'gaming.jpg',
    alt: 'A Pharah figure from Overwatch',
    caption: 'justice rains.',
    body:
      'I have played plenty of games, but only one ever took over my life. I started Overwatch in the open beta and have been a Pharah main more or less ever since. I could not tell you why projectiles come easily to me—something about leading a shot just makes sense. My first ever income came from boosting people up the ranks through Carousell listings, which is a strange line to have on a resume and a very good way to be paid for something you would have done anyway. A few teams even asked me to play for them.\n\nWhat I actually remember is the people. Every week through secondary school, the same group of us would pile into a lobby and play until someone had to go to bed. It was how I socialised, and the thing I looked forward to all week. We do not talk much anymore, but those nights still mean the world to me.\n\nI have since hung up the gloves. The game has moved on without me—new heroes, new maps, modes I have never touched. Other games have come and gone, but Overwatch is still the one I look back on most fondly.',
  },
  {
    label: 'photography',
    title: 'pretty views, mostly.',
    photo: 'photography.jpg',
    alt: 'Mount Fuji above a quiet road',
    caption: 'fuji.',
    body:
      'I have no real idea what I am doing. ISO, shutter speed, aperture—I could recite the words, but ask me to explain the triangle properly and I will smile and change the subject. I do not chase technical perfection. I just like pretty views, and pointing a camera at them feels like a good enough reason to stop and look.\n\nThe camera itself has a slightly ridiculous origin story. I won two thousand dollars at a casino and, instead of doing anything sensible with it, bought a Fujifilm X100V. It has been my companion ever since. My favourite film simulation is Portra 400—warm, a little soft, the kind of look that makes ordinary light feel worth keeping. I am not trying to be a photographer. I am just trying not to walk past the good bits.',
  },
  {
    label: 'formula 1',
    title: 'cars going in circles.',
    photo: 'formula1.jpg',
    alt: 'Jian Cheng in the stands at the Singapore Grand Prix',
    caption: 'marina bay, 2024.',
    body:
      'For years I did not get Formula 1. It looked like cars going round a track, and then going round it again. Then in 2022 a friend of my dad’s came into free tickets, the family went to the Grand Prix, and something about being there stuck. I have followed it ever since.\n\nI still cannot properly explain why. It is not the engineering—I could not tell you what most of the technical talk actually means. It is not the drivers as personalities either, though I will happily admit to being a Max and a Lewis fan. Whatever the reason, I have not missed a qualifying or a race since. Even the ones where nothing happens for fifty laps, I somehow cannot bring myself to turn the television off.',
  },
  {
    label: 'mma',
    title: 'strictly a spectator.',
    photo: 'mma.jpg',
    alt: 'Israel Adesanya after knocking out Alex Pereira at UFC 287',
    caption: 'ufc 287.',
    body:
      'I do not train, and I have no illusions about how I would do in a cage. I just follow the UFC closely. There is something primal about two people trying to knock each other out that scratches an itch nothing else does, and a clean knockout spikes my dopamine in a way no other sport manages.\n\nThe build-up is part of it too. A fight with real history behind it—two people who actually want to settle something—lands very differently from two strangers matched on a card. By the time the walkouts start, I am usually far more invested than I have any right to be.\n\nMy favourite moment watching live was UFC 287: Israel Adesanya knocking out Alex Pereira in their rematch. Pereira had already beaten him three times before—twice in kickboxing, once in the Octagon—and the narrative was basically written. Then Izzy walked in, closed the chapter in the second round, and reminded everyone what it looks like when someone refuses to stay on the wrong side of a rivalry. The knockout was great, but the history behind it was what really made the moment.',
  },
];
