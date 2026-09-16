// Validated chart palette — kept identical to frontend/src/utils/chartColors.js
// (see the dataviz skill's references/palette.md). These exact hex values
// already pass the CVD / contrast / lightness gates for light mode. If you
// ever change one, change it in both places and re-run the validator.

export const SEQUENTIAL_BLUE = '#2a78d6'; // single-hue magnitude bars/areas (revenue rankings, trend)

export const CATEGORICAL = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
];

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
};
