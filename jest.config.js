module.exports = {
  roots: ['<rootDir>'],
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.jsx?$',
  testPathIgnorePatterns: ['/node_modules/', '/__fixtures__/', '/__utils__/'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    './*.js',
    '!**/tests/**',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/generated/**',
  ],
  verbose: true,
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
}
