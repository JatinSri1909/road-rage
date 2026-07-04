/* eslint-disable */
module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // ── Errors ───────────────────────────────────────────────────────────
    'no-undef':        'error',
    'no-unused-vars':  ['warn', { argsIgnorePattern: '^_' }],
    'no-console':      ['warn', { allow: ['warn', 'error'] }],

    // ── Style ─────────────────────────────────────────────────────────────
    'semi':            ['error', 'always'],
    'quotes':          ['error', 'single', { avoidEscape: true }],
    'indent':          ['error', 2, { SwitchCase: 1 }],
    'comma-dangle':    ['error', 'always-multiline'],
    'eol-last':        ['error', 'always'],

    // ── Best practices ────────────────────────────────────────────────────
    'eqeqeq':          ['error', 'always'],
    'no-var':          'error',
    'prefer-const':    'error',
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
  },
};
