// jest.config.js
export default {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testEnvironment: 'jsdom',
  moduleNameMapper: {},
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 75,
    },
  },
};
