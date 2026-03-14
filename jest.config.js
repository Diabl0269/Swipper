module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.ts"],
  testPathIgnorePatterns: ["/node_modules/", "\\.d\\.ts$"],
  runner: "jest-runner",
  globals: {
    __NODE_OPTIONS__: "--experimental-vm-modules",
  },
  coverageThreshold: {
    global: {
      branches: 63,
      functions: 55,
      lines: 81.46,
      statements: 81,
    },
  },
};
