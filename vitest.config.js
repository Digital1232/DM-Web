import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['**/*.test.js'],
        exclude: [
            '**/node_modules/**',
            // Build/app-shell copies of the web files (Capacitor, dist) – not source
            'www/**',
            'android/**',
            'dist/**',
            '_archive/**',
            // PostgreSQL schema integration test from the old db/ setup: needs a live
            // Postgres connection and is not part of the Firebase app
            'db/schema.test.js'
        ],
        reporters: ['verbose']
    }
});
