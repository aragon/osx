module.exports = {
  purge: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F5F8FF',
          100: '#C4D7FF',
          200: '#93B2FF',
          300: '#628CFE',
          400: '#3164FA',
          500: '#003BF5',
          600: '#0037D2',
          700: '#0031AD',
          800: '#002985',
          900: '#001F5C',
        },
        ui: {
          0: '#FFFFFF',
          50: '#F5F7FA',
          100: '#E4E7EB',
          200: '#CBD2D9',
          300: '#9AA5B1',
          400: '#7B8794',
          500: '#616E7C',
          600: '#52606D',
          700: '#3E4C59',
          800: '#323F4B',
          900: '#1F2933',
        },
      },
    },
    fontFamily: {
      sans: ['Manrope'],
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
