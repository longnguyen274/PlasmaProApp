// Ngôn ngữ thiết kế lấy theo Best Flutter UI Templates / Fitness App (fitness_app_theme.dart):
// nền xám nhạt, thẻ trắng bo 8/8/8/68, xanh "nearlyDarkBlue", thẻ gradient, font Google Sans Flex từ gói do người dùng cung cấp.
export const C = {
  primary: '#2633C5', // nearlyDarkBlue
  primaryDark: '#1E1466',
  primarySoft: '#E8EBFB',
  accent: '#00B6F0', // nearlyBlue
  periwinkle: '#87A0E5',
  bg: '#F2F3F8', // background
  card: '#FFFFFF',
  text: '#17262A', // darkerText
  textBody: '#253840', // darkText
  textSoft: '#4A6572', // lightText
  textFaint: '#8A9AA6',
  grey: '#3A5160',
  border: '#E6E8F0',
  green: '#1F9D63',
  greenSoft: '#E3F5EC',
  amber: '#C46A12',
  amberSoft: '#FDEFE0',
  red: '#E2445C',
  redSoft: '#FDE7EB',
  violet: '#5C5EDD',
  violetSoft: '#ECECFC',
  teal: '#0E9AB8',
  tealSoft: '#E0F4FA',
} as const;

/** Bộ gradient của thẻ "Meals today" và nút giữa thanh tab. */
export const G = {
  coral: ['#FA7D82', '#FFB295'],
  indigo: ['#738AE6', '#5C5EDD'],
  pink: ['#FE95B6', '#FF5287'],
  night: ['#6F72CA', '#1E1466'],
  fab: ['#2633C5', '#6A88E5'],
} as const;
export type GradientName = keyof typeof G;

export const gradient = G.fab;

export const radius = { s: 8, m: 12, l: 16 } as const;

/** Thẻ bất đối xứng của mẫu: ba góc 8, góc trên phải lớn. */
export const cardShape = (topRight = 32) => ({
  borderTopLeftRadius: 8,
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
  borderTopRightRadius: topRight,
});

export const shadow = {
  shadowColor: '#3A5160',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 1.1, height: 1.1 },
  elevation: 3,
} as const;

export const F = {
  regular: 'GoogleSansFlex-Regular',
  medium: 'GoogleSansFlex-Medium',
  bold: 'GoogleSansFlex-Bold',
} as const;
