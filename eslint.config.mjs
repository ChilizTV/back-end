import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // Allow console in backend
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.js',
      'eslint.config.mjs',
      'scripts/**',
      'public/**',
    ],
  }
);