/** @type {import('stylelint').Config} */
const config = {
  ignoreFiles: ['src/_old/**'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recess-order',
    '@dreamsicle.io/stylelint-config-tailwindcss',
  ],
  plugins: ['stylelint-order'],
  rules: {
    'declaration-block-no-duplicate-properties': true,
    'block-no-empty': true,
    'font-family-name-quotes': 'always-where-recommended',
    'import-notation': 'string',
    'declaration-block-single-line-max-declarations': null,
    'keyframes-name-pattern': null,
  },
};

export default config;
