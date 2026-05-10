const config = {
  '**/*.ts?(x)': [
    'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit --incremental false --pretty',
  ],

  '*': 'prettier --write --ignore-unknown',
};

export default config;
