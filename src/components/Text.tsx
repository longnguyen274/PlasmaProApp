import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';

import { C, F } from '@/theme';

/** Chọn tệp GoogleSansFlex theo độ đậm, vì font tùy chỉnh trên iOS cần tên riêng cho từng độ đậm. */
function withGoogleSansFlex(style: TextProps['style'], base: TextStyle): TextStyle {
  const flat = StyleSheet.flatten([base, style]) ?? {};
  if (flat.fontFamily && !flat.fontFamily.startsWith('GoogleSansFlex')) return flat;
  const w = String(flat.fontWeight ?? '400');
  const family = w === 'bold' || Number(w) >= 700 ? F.bold : Number(w) >= 500 ? F.medium : F.regular;
  const { fontWeight: _drop, ...rest } = flat;
  return { ...rest, fontFamily: family };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withGoogleSansFlex(style, { color: C.textBody })} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={withGoogleSansFlex(style, {})} />;
}
