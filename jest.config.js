module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["<rootDir>/tests/**/*.ts"],
  testPathIgnorePatterns: ["/node_modules/", "\\.d\\.ts$"],
};