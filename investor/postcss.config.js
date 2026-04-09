export default {
  plugins: {
    'postcss-import': {
      filter: (id) => !/^https?:\/\//.test(id),
    },
    tailwindcss: {},
    autoprefixer: {},
  },
};
