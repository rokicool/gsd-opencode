export default {
  test: {
    include: ['bin/dm/test/**/*.test.js', 'get-shit-done/bin/test/**/*.test.cjs'],
    exclude: ['**/node_modules/**'],
    globals: true,
  },
}
