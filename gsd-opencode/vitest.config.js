export default {
  test: {
    include: ['bin/dm/test/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/get-shit-done/**'],
    globals: true,
  },
}
