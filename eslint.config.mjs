import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**/*'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        project: './tsconfig.json',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // 기본 타입에 any 사용 불가 여부
      '@typescript-eslint/no-floating-promises': 'warn', // promise 를 .then(), await, catch() 없이 보내기 여부
      '@typescript-eslint/no-unsafe-argument': 'off', // 타입이 확실하지 않은 값을 함수에 인자 사용 여부
      '@typescript-eslint/no-unsafe-call': 'off', // 타입이 확실하지 않은 객체의 메서드나 함수 호출 여부
      '@typescript-eslint/no-unused-vars': 'off', // 사용하지 않는 변수 불가 여부
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'prettier/prettier': 'error', // prettier 포메팅 규칙을 강제로 eslint 에러로 간주 여부
      '@typescript-eslint/unbound-method': 'off',
      semi: ['error', 'never'], // 마지막에 semi-colon 여부, error: 에러처리, never: 세미클론 금지, always: 세미콜론 필수
    },
  },
)
