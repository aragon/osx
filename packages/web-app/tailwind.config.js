module.exports = {
  purge: false, // purge: ['./src/**/*.html', './src/**/*.tsx'], TODO: investigate
  darkMode: false,
  theme: {
    extend: {
      // extends colors according to design system
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
        info: {
          100: '#D1FDFA',
          200: '#A4F9FB',
          300: '#75E8F3',
          400: '#52CFE7',
          500: '#1EADD8',
          600: '#1588B9',
          700: '#0F669B',
          800: '#09497D',
          900: '#053467',
        },
        success: {
          100: '#F3FCCC',
          200: '#E4F99A',
          300: '#CCEF66',
          400: '#B2E040',
          500: '#8ECC0A',
          600: '#74AF07',
          700: '#5C9205',
          800: '#467603',
          900: '#366101',
        },
        warning: {
          100: '#FFF3D6',
          200: '#FFE4AD',
          300: '#FFD083',
          400: '#FFBE65',
          500: '#FF9F32',
          600: '#DB7D24',
          700: '#B75E19',
          800: '#93430F',
          900: '#7A3009',
        },
        critical: {
          100: '#FEE4D6',
          200: '#FEC3AE',
          300: '#FD9A86',
          400: '#FB7467',
          500: '#F93636',
          600: '#D62736',
          700: '#B31B35',
          800: '#901132',
          900: '#770A30',
        },
      },
      // extends spacing according to design system
      spacing: {
        0.25: '2px',
        0.5: '4px',
        0.75: '6px',
        1: '8px',
        1.5: '12px',
        1.75: '14px',
        2: '16px',
        2.5: '20px',
        3: '24px',
        3.5: '28px',
        4: '32px',
        5: '40px',
        6: '48px',
        8: '64px',
        10: '80px',
        12: '96px',
        14: '112px',
        16: '128px',
        25: '200px',
        40: '320px',
        30: '240px',
        50: '400px',
      },
      borderRadius: {
        larger: '10px',
      },
    },
    fontWeight: {
      normal: 500,
      bold: 700,
    },
    // overrides screen breakpoints according to design system
    screens: {
      tablet: '768px',
      lg: '1280px',
      desktop: '1280px',
      wide: '1680px',
    },
    fontFamily: {
      sans: ['Manrope'],
    },
    // overrides font sizes according to design system
    // These are to be used on components (labels, etc.).
    fontSize: {
      xs: ['0.64rem', 1.5],
      sm: ['0.8rem', 1.5],
      base: ['1rem', 1.5],
      lg: ['1.25rem', 1.5],
      xl: ['1.563rem', 1.2],
      '2xl': ['1.953rem', 1.2],
      '3xl': ['2.441rem', 1.2],
      '4xl': ['3.052rem', 1.2],
      '5xl': ['3.185rem', 1.2],
    },
    fluidType: {
      settings: {
        fontSizeMin: 0.875, // 0.875rem === 14px
        fontSizeMax: 1, // 1rem === 16px
        ratioMin: 1.2, // Multiplicator Min: Minor Third
        ratioMax: 1.25, // Multiplicator Max Major Third
        screenMin: 20, // 20rem === 320px
        screenMax: 96, // 96rem === 1536px
        unit: 'rem',
        prefix: 'ft',
      },
      // Creates the ft-text-xx classes. These are to be used for inline text
      // and headings.
      // 'lineHeight' is unitless.
      values: {
        xs: [-2, 1.5],
        sm: [-1, 1.5],
        base: [0, 1.5],
        lg: [1, 1.5],
        xl: [2, 1.2],
        '2xl': [3, 1.2],
        '3xl': [4, 1.2],
        '4xl': [5, 1.2],
        '5xl': [6, 1.2],
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
      borderColor: ['active', 'disabled'],
    },
    fluidType: ['responsive'],
  },
  plugins: [require('tailwindcss-fluid-type')],
};
