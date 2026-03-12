import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    postcssImport({
      filter: (id) => !/^https?:\/\//.test(id),
    }),
    tailwindcss(),
    autoprefixer(),
  ],
};
