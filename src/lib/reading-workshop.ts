// Reading Workshop static program data (client-safe).
export const RW_LEVELS = [
  { code: "A1", label: "Beginner", fr: "Débutant" },
  { code: "A2", label: "Elementary", fr: "Élémentaire" },
  { code: "B1", label: "Intermediate", fr: "Intermédiaire" },
  { code: "B2", label: "Upper-Intermediate", fr: "Intermédiaire avancé" },
  { code: "C1", label: "Advanced", fr: "Avancé" },
] as const;
export type RwLevel = (typeof RW_LEVELS)[number]["code"];

export const RW_OBJECTIVES = [
  "Improve Reading Skills",
  "Expand English Vocabulary",
  "Develop Pronunciation",
  "Strengthen Reading Comprehension",
  "Improve Listening Skills",
  "Develop Critical Thinking",
  "Discover History and Culture",
  "Improve Speaking Confidence",
] as const;

export const RW_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type RwWeek = { week: number; title: string; sessions: string[] };
export const RW_PROGRAM: RwWeek[] = [
  {
    "week": 1,
    "title": "The Power of Education",
    "sessions": [
      "Why Education Matters",
      "The Importance of Reading",
      "Education and Opportunity",
      "Learning from Difficulties",
      "The Power of Knowledge",
      "Building a Better Future Through Education"
    ]
  },
  {
    "week": 2,
    "title": "Identity, Family and Personal Values",
    "sessions": [
      "Understanding Who We Are",
      "The Importance of Family",
      "Respect and Responsibility",
      "Cultural Identity",
      "Family Traditions Around the World",
      "What Makes a Good Person?"
    ]
  },
  {
    "week": 3,
    "title": "Daily Life and Personal Discipline",
    "sessions": [
      "The Power of Daily Habits",
      "Managing Your Time",
      "The Importance of Discipline",
      "Healthy Choices",
      "Learning from Everyday Experiences",
      "Small Actions, Big Results"
    ]
  },
  {
    "week": 4,
    "title": "Dreams, Ambition and the Future",
    "sessions": [
      "Having a Dream",
      "Setting Personal Goals",
      "Overcoming Fear",
      "The Importance of Patience",
      "Turning Ideas into Action",
      "Designing Your Future"
    ]
  },
  {
    "week": 5,
    "title": "Self-Confidence",
    "sessions": [
      "Believe in Yourself",
      "Understanding Your Strengths",
      "Overcoming Self-Doubt",
      "Learning from Failure",
      "The Courage to Try",
      "Becoming a Confident Person"
    ]
  },
  {
    "week": 6,
    "title": "Hard Work and Determination",
    "sessions": [
      "Success Requires Effort",
      "The Value of Persistence",
      "Learning from Mistakes",
      "Staying Motivated",
      "The Importance of Consistency",
      "The Road to Achievement"
    ]
  },
  {
    "week": 7,
    "title": "Leadership and Responsibility",
    "sessions": [
      "What Makes a Good Leader?",
      "Leading by Example",
      "Responsibility in Society",
      "The Power of Teamwork",
      "Leadership and Integrity",
      "Serving the Community"
    ]
  },
  {
    "week": 8,
    "title": "Personal Development and Success",
    "sessions": [
      "The Meaning of Success",
      "Developing Good Habits",
      "Emotional Intelligence",
      "Learning Throughout Life",
      "The Importance of Self-Improvement",
      "Becoming a Better Version of Yourself"
    ]
  },
  {
    "week": 9,
    "title": "Culture and Traditions",
    "sessions": [
      "Understanding Different Cultures",
      "Cultural Diversity",
      "Languages Around the World",
      "African Cultural Heritage",
      "Traditions and Modern Society",
      "Respecting Cultural Differences"
    ]
  },
  {
    "week": 10,
    "title": "History and Great Leaders",
    "sessions": [
      "Nelson Mandela and Freedom",
      "Barack Obama and Leadership",
      "Michelle Obama and Education",
      "John F. Kennedy and Public Service",
      "Martin Luther King Jr. and Equality",
      "Lessons from History"
    ]
  },
  {
    "week": 11,
    "title": "Society and Community",
    "sessions": [
      "The Importance of Community",
      "Helping Other People",
      "Poverty and Opportunity",
      "Education and Social Change",
      "The Role of Young People",
      "Building Stronger Communities"
    ]
  },
  {
    "week": 12,
    "title": "Communication and Human Relationships",
    "sessions": [
      "The Importance of Communication",
      "Listening to Others",
      "Respectful Disagreement",
      "Friendship and Trust",
      "Communication Across Cultures",
      "The Art of Public Speaking"
    ]
  },
  {
    "week": 13,
    "title": "Democracy and Citizenship",
    "sessions": [
      "Understanding Democracy",
      "Rights and Responsibilities",
      "Freedom of Expression",
      "The Importance of Participation",
      "Citizenship in Modern Society",
      "Building a Responsible Society"
    ]
  },
  {
    "week": 14,
    "title": "Human Rights and Equality",
    "sessions": [
      "Understanding Human Rights",
      "Equality and Justice",
      "The Right to Education",
      "Fighting Discrimination",
      "Women and Equal Opportunities",
      "Dignity and Human Freedom"
    ]
  },
  {
    "week": 15,
    "title": "Environment and Climate Change",
    "sessions": [
      "Protecting Our Planet",
      "Understanding Climate Change",
      "Forests and Biodiversity",
      "Water and Natural Resources",
      "Pollution and Its Consequences",
      "Sustainable Development"
    ]
  },
  {
    "week": 16,
    "title": "Economy and Entrepreneurship",
    "sessions": [
      "Understanding Money",
      "The Meaning of Entrepreneurship",
      "Starting a Small Business",
      "Innovation and Opportunity",
      "Financial Responsibility",
      "Building an Entrepreneurial Mindset"
    ]
  },
  {
    "week": 17,
    "title": "Technology and Innovation",
    "sessions": [
      "Technology in Everyday Life",
      "The Internet and Communication",
      "Artificial Intelligence",
      "Digital Education",
      "Technology and Employment",
      "The Future of Innovation"
    ]
  },
  {
    "week": 18,
    "title": "Global Challenges",
    "sessions": [
      "Understanding Globalization",
      "International Cooperation",
      "Migration and Human Mobility",
      "Global Health",
      "Peace and Conflict Resolution",
      "The Role of International Organizations"
    ]
  },
  {
    "week": 19,
    "title": "Critical Thinking and Public Speaking",
    "sessions": [
      "Learning to Think Critically",
      "Facts and Opinions",
      "Understanding Arguments",
      "Media and Information",
      "Persuasion and Public Speaking",
      "Expressing Your Ideas Clearly"
    ]
  },
  {
    "week": 20,
    "title": "The Future and Personal Vision",
    "sessions": [
      "The Future of Education",
      "The World in 2050",
      "Young People and Innovation",
      "The Future of Africa",
      "Personal Vision and Ambition",
      "What Have You Learned?"
    ]
  }
];
