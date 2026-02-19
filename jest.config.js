module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.ts"],
  testPathIgnorePatterns: ["/node_modules/", "\\.d\\.ts$"],
  coverageThreshold: {
    global: {
      branches: 63,
      functions: 55,
      lines: 81.46,
      statements: 81,
    },
  },
};
