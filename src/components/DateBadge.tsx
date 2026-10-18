import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { C } from '@/theme';

/** Ngày hiện tại ở góc phải thanh tiêu đề, như "15 May" của mẫu My Diary. */
export function DateBadge() {
  const d = new Date();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 }}>
      <Ionicons name="calendar-outline" size={18} color={C.grey} />
      <Text style={{ fontSize: 17, color: C.text, letterSpacing: -0.2 }}>{`${d.getDate()} Th${d.getMonth() + 1}`}</Text>
    </View>
  );
}
