module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  passWithNoTests: true,
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}