const stuff = {
  fruits: ['apple', 'banana'] as const,
  brands: ['Samsung', 'Adidas'] satisfies string[],
  enum: {
    FIRST: 'FIRST',
    SECOND: 'SECOND',
  },
};

module.exports = { stuff };
