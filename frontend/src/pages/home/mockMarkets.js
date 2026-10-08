// Shared mock data for Home and MarketDetail.
// Later: replace with a fetch to your Go backend (GET /v0/markets etc.)

export const categories = [
  'Trending',
  'Breaking',
  'New',
  'Politics',
  'Sports',
  'Crypto',
  'Finance',
  'Tech',
  'Culture',
  'Economy',
  'Weather',
  'Geopolitics',
];

export const markets = [
  {
    id: '1',
    category: 'Politics',
    title: 'Will Donald Trump make a major announcement this week?',
    probability: 68,
    volume: '$1.24M',
    volumeNum: 1240000,
    volume24h: '$92K',
    liquidity: '$210K',
    change: 4,
    image: 'US',
    ends: 'October 31, 2026',
    rules:
      'This market resolves to Yes if an official, widely reported major announcement is made within the stated period. Otherwise it resolves to No.',
  },
  {
    id: '2',
    category: 'Crypto',
    title: 'Will Bitcoin reach $120,000 before November?',
    probability: 74,
    volume: '$892K',
    volumeNum: 892000,
    volume24h: '$38K',
    liquidity: '$124K',
    change: 8,
    image: '₿',
    ends: 'November 30, 2026',
    rules:
      'This market resolves to Yes if the BTC/USD price reaches $120,000 on a major exchange at any time before the end date. Public market data will be used for resolution.',
  },
  {
    id: '3',
    category: 'Sports',
    title: 'Will Real Madrid win their next match?',
    probability: 61,
    volume: '$486K',
    volumeNum: 486000,
    volume24h: '$21K',
    liquidity: '$80K',
    change: -2,
    image: 'RM',
    ends: 'October 20, 2026',
    rules:
      'Resolves to Yes if Real Madrid win the match in regular time. A draw or a loss resolves to No.',
  },
  {
    id: '4',
    category: 'Tech',
    title: 'Will OpenAI release a major new model this month?',
    probability: 56,
    volume: '$735K',
    volumeNum: 735000,
    volume24h: '$45K',
    liquidity: '$96K',
    change: 6,
    image: 'AI',
    ends: 'October 31, 2026',
    rules:
      'Resolves to Yes if OpenAI officially announces and releases a new flagship model during the month.',
  },
  {
    id: '5',
    category: 'Politics',
    title: 'Will the US government announce a new policy this month?',
    probability: 43,
    volume: '$321K',
    volumeNum: 321000,
    volume24h: '$12K',
    liquidity: '$54K',
    change: 1,
    image: 'US',
    ends: 'October 31, 2026',
    rules:
      'Resolves to Yes if an official government announcement of a new policy is made during the month.',
  },
  {
    id: '6',
    category: 'Crypto',
    title: 'Will Ethereum trade above $5,000 this year?',
    probability: 39,
    volume: '$618K',
    volumeNum: 618000,
    volume24h: '$27K',
    liquidity: '$88K',
    change: -3,
    image: 'Ξ',
    ends: 'December 31, 2026',
    rules:
      'Resolves to Yes if ETH/USD trades above $5,000 on a major exchange before the end of the year.',
  },
];

export const formatChange = (n) => `${n > 0 ? '+' : ''}${n}%`;