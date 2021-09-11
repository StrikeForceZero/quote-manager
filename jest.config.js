module.exports = {
    roots: [
        "<rootDir>/src",
    ],
    testMatch: [
        "**/__tests__/**/*.+(ts|tsx|js)",
        "**/?(*.)+(spec|test).+(ts|tsx|js)",
    ],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    moduleDirectories: ["<rootDir>/node_modules", "<rootDir>"],
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
    },
}
