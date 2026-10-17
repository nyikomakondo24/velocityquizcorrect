import { Quiz } from '../types/quiz';

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'speed-tech-science',
    title: 'Velocity Science & Tech Blitz',
    description: 'Lightning-round trivia spanning cutting-edge science, computing history, space, and physics.',
    category: 'Science & Technology',
    createdAt: Date.now(),
    questions: [
      {
        id: 'q1',
        text: 'What is the approximate speed of light in a vacuum?',
        options: [
          '300,000 km/s',
          '150,000 km/s',
          '1,080,000 km/s',
          '30,000 km/s'
        ],
        correctOptionIndex: 0,
        timeLimit: 12,
        points: 1000,
        category: 'Physics',
        explanation: 'Light travels at approximately 299,792 kilometers per second in a vacuum.'
      },
      {
        id: 'q2',
        text: 'Which programming language was created by Brendan Eich in just 10 days in 1995?',
        options: [
          'Python',
          'JavaScript',
          'Ruby',
          'PHP'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Technology',
        explanation: 'JavaScript was famously designed and built in 10 days for Netscape Navigator.'
      },
      {
        id: 'q3',
        text: 'What planet in our Solar System has the shortest day (fastest rotation)?',
        options: [
          'Mercury',
          'Mars',
          'Jupiter',
          'Saturn'
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        category: 'Astronomy',
        explanation: 'Jupiter rotates once every 9 hours and 55 minutes, making its day the shortest of all planets.'
      },
      {
        id: 'q4',
        text: 'What fundamental particle carries the electromagnetic force?',
        options: [
          'Gluon',
          'Photon',
          'Higgs Boson',
          'Graviton'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Physics',
        explanation: 'The photon is the quantum gauge boson for electromagnetism.'
      },
      {
        id: 'q5',
        text: 'In computer science, what is the time complexity of binary search on a sorted array?',
        options: [
          'O(1)',
          'O(n)',
          'O(log n)',
          'O(n log n)'
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        category: 'Computer Science',
        explanation: 'Binary search halves the search space each step, running in O(log n) logarithmic time.'
      },
      {
        id: 'q6',
        text: 'Which chemical element has the highest electrical conductivity at room temperature?',
        options: [
          'Copper',
          'Gold',
          'Silver',
          'Aluminum'
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        category: 'Chemistry',
        explanation: 'Silver has the highest electrical conductivity of all metals, followed closely by copper.'
      },
      {
        id: 'q7',
        text: 'How many bits are in a single byte?',
        options: [
          '4 bits',
          '8 bits',
          '16 bits',
          '32 bits'
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1000,
        category: 'Technology',
        explanation: 'A standard byte consists of 8 bits.'
      },
      {
        id: 'q8',
        text: 'Which human organ consumes approximately 20% of the body’s total metabolic energy?',
        options: [
          'Heart',
          'Liver',
          'Brain',
          'Lungs'
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        category: 'Biology',
        explanation: 'Despite making up only about 2% of body weight, the human brain consumes 20% of resting energy.'
      }
    ]
  },
  {
    id: 'world-geography-blitz',
    title: 'World Capitals & Geography Sprint',
    description: 'Fast-paced identification of global capitals, flags, continents, and geographical records.',
    category: 'Geography',
    createdAt: Date.now() - 10000,
    questions: [
      {
        id: 'g1',
        text: 'What is the capital city of Australia?',
        options: [
          'Sydney',
          'Melbourne',
          'Canberra',
          'Brisbane'
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        category: 'Capitals',
        explanation: 'Canberra was selected as Australia’s compromise capital between Sydney and Melbourne in 1908.'
      },
      {
        id: 'g2',
        text: 'Which is the deepest lake in the world, holding 20% of Earth’s unfrozen surface fresh water?',
        options: [
          'Lake Superior',
          'Lake Baikal',
          'Lake Victoria',
          'Lake Tanganyika'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Nature',
        explanation: 'Lake Baikal in Siberia plunges to 1,642 meters (5,387 feet) deep.'
      },
      {
        id: 'g3',
        text: 'Which country has the most natural lakes in the world?',
        options: [
          'Canada',
          'Russia',
          'United States',
          'Finland'
        ],
        correctOptionIndex: 0,
        timeLimit: 12,
        points: 1000,
        category: 'Geography',
        explanation: 'Canada contains over 60% of all the lakes in the world (over 879,000 lakes).'
      },
      {
        id: 'g4',
        text: 'Which strait separates Europe from Africa at its narrowest point of only 14 km?',
        options: [
          'Strait of Malacca',
          'Strait of Hormuz',
          'Strait of Gibraltar',
          'Bosphorus Strait'
        ],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        category: 'Geography',
        explanation: 'The Strait of Gibraltar connects the Atlantic Ocean to the Mediterranean Sea.'
      },
      {
        id: 'g5',
        text: 'What is the only country in the world that is also a continent?',
        options: [
          'Greenland',
          'Australia',
          'Madagascar',
          'Iceland'
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1000,
        category: 'Continents',
        explanation: 'Australia is uniquely classified as both a sovereign country and a distinct continent.'
      },
      {
        id: 'g6',
        text: 'What is the capital city of Canada?',
        options: [
          'Toronto',
          'Montreal',
          'Vancouver',
          'Ottawa'
        ],
        correctOptionIndex: 3,
        timeLimit: 12,
        points: 1000,
        category: 'Capitals',
        explanation: 'Ottawa was named the capital of the Province of Canada by Queen Victoria in 1857.'
      }
    ]
  },
  {
    id: 'pop-culture-cinema',
    title: 'Pop Culture & Cinema Velocity',
    description: 'Fast reflex questions on blockbuster movies, music history, iconic games, and entertainment.',
    category: 'Entertainment',
    createdAt: Date.now() - 20000,
    questions: [
      {
        id: 'p1',
        text: 'In the Marvel Cinematic Universe, what is the fictional metal mined in Wakanda?',
        options: [
          'Adamantium',
          'Vibranium',
          'Uru',
          'Beskar'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Movies',
        explanation: 'Vibranium is the legendary kinetic-energy absorbing metal of Wakanda.'
      },
      {
        id: 'p2',
        text: 'Which Nintendo franchise features the protagonist Link and Princess Zelda?',
        options: [
          'Metroid',
          'Fire Emblem',
          'The Legend of Zelda',
          'Super Mario'
        ],
        correctOptionIndex: 2,
        timeLimit: 10,
        points: 1000,
        category: 'Gaming',
        explanation: 'The Legend of Zelda first launched in 1986 on the Famicom/NES.'
      },
      {
        id: 'p3',
        text: 'What movie won the Academy Award for Best Picture in 2024?',
        options: [
          'Barbie',
          'Oppenheimer',
          'Poor Things',
          'Killers of the Flower Moon'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Cinema',
        explanation: 'Christopher Nolan’s Oppenheimer won seven Oscars including Best Picture.'
      },
      {
        id: 'p4',
        text: 'Which album by Michael Jackson is the best-selling studio album of all time?',
        options: [
          'Bad',
          'Thriller',
          'Off the Wall',
          'Dangerous'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Music',
        explanation: 'Released in 1982, Thriller has sold an estimated 70+ million copies worldwide.'
      },
      {
        id: 'p5',
        text: 'Which film pioneered bullet-time visual effects in 1999?',
        options: [
          'The Matrix',
          'Fight Club',
          'Star Wars: The Phantom Menace',
          'Gladiator'
        ],
        correctOptionIndex: 0,
        timeLimit: 12,
        points: 1000,
        category: 'Cinema',
        explanation: 'The Wachowskis’ The Matrix revolutionized action cinema with its green tint and 360-degree camera rigs.'
      }
    ]
  },
  {
    id: 'rapid-math-logic',
    title: 'Rapid Mental Math & Logic Riddles',
    description: 'High-speed calculations and tricky logic riddles where quick intuition beats overthinking.',
    category: 'Math & Logic',
    createdAt: Date.now() - 30000,
    questions: [
      {
        id: 'm1',
        text: 'What is 15% of 80?',
        options: [
          '10',
          '12',
          '14',
          '16'
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1000,
        category: 'Mental Math',
        explanation: '10% of 80 is 8, 5% is 4. 8 + 4 = 12!'
      },
      {
        id: 'm2',
        text: 'If a bat and ball cost $1.10 in total, and the bat costs $1.00 more than the ball, how much does the ball cost?',
        options: [
          '$0.10',
          '$0.05',
          '$0.01',
          '$0.15'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Logic',
        explanation: 'Ball = $0.05, Bat = $1.05. Total = $1.10, and Bat is exactly $1.00 more than Ball.'
      },
      {
        id: 'm3',
        text: 'What is the square of 13?',
        options: [
          '144',
          '156',
          '169',
          '196'
        ],
        correctOptionIndex: 2,
        timeLimit: 10,
        points: 1000,
        category: 'Mental Math',
        explanation: '13 × 13 = 169.'
      },
      {
        id: 'm4',
        text: 'How many sides does a regular heptagon have?',
        options: [
          '6',
          '7',
          '8',
          '9'
        ],
        correctOptionIndex: 1,
        timeLimit: 10,
        points: 1000,
        category: 'Geometry',
        explanation: 'A heptagon (or septagon) is a polygon with 7 sides and 7 angles.'
      },
      {
        id: 'm5',
        text: 'What comes next in the sequence: 2, 6, 12, 20, 30, ...?',
        options: [
          '40',
          '42',
          '44',
          '46'
        ],
        correctOptionIndex: 1,
        timeLimit: 12,
        points: 1000,
        category: 'Patterns',
        explanation: 'Differences are +4, +6, +8, +10, so next difference is +12. 30 + 12 = 42.'
      }
    ]
  }
];

export const FUN_AVATARS = [
  '⚡', '🚀', '🔥', '🦁', '🦊', '🐯', '🦄', '🐼',
  '🦅', '🐺', '🦈', '🤖', '👾', '🎯', '👑', '💎',
  '🌟', '🍕', '🎸', '🏎️', '🏆', '🌪️', '💥', '🛸'
];

export const BOT_NAMES = [
  'SpeedySam', 'QuantumQuizzer', 'TriviaNinja', 'NeonVolt', 'TurboTina',
  'PixelPilot', 'FlashGordon', 'BlazeRider', 'CyberNova', 'RapidRay',
  'EchoPulse', 'AeroAce', 'SonicSpecter', 'VortexVince', 'HyperHawk',
  'AstroAlex', 'CosmicCleo', 'BlitzBot', 'ZenithZoe', 'OmegaOwl',
  'FalconFury', 'MatrixMax', 'SparkySteve', 'ChronoChris', 'NebulaNick',
  'ApexArcher', 'SolarSprint', 'DynamoDan', 'VelocityVal', 'PhantomPip',
  'PrismPete', 'TitanToby', 'RacerRyan', 'BoltBella', 'ShadowSam',
  'StarlightSue', 'VectorVic', 'MirageMaya', 'ThunderTom', 'GlitchGabe',
  'CipherClara', 'ByteBen', 'RocketRita', 'FrostFox', 'KineticKai',
  'PulsePaul', 'ApexAnna', 'SpecterSyd', 'WhizKidWill', 'NovaNathan',
  'Stratosphere', 'HorizonHank', 'TurboTrixie', 'ZenonZack', 'QuarkQuinn',
  'LaserLuke', 'MeteorMolly', 'VerveVera', 'WarpWalker', 'DriftDave'
];
