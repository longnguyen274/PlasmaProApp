import { View } from 'react-native';
import { Text } from './Text';
import { Card, Chip, Muted } from './ui';
import { SEVERITY } from '@/lib/access';
import { fmtDate } from '@/lib/format';
import type { Evaluation } from '@/lib/types';
import { C } from '@/theme';

export function SeverityCard({ title, evaluation, doctor }: { title: string; evaluation?: Evaluation; doctor?: string }) {
  const level = evaluation?.severity;
  return <Card>
    <Text style={{ fontSize: 16, fontWeight: '700' }}>{title}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['mild', 'moderate', 'severe'] as const).map(value => <View key={value} style={{ flex: 1, gap: 8, opacity: level && level !== value ? 0.45 : 1 }}>
        <View style={{ height: level === value ? 8 : 4, borderRadius: 4, backgroundColor: value === 'mild' ? C.green : value === 'moderate' ? C.amber : C.red }} />
        <Chip label={SEVERITY[value].label} tone={SEVERITY[value].tone} />
      </View>)}
    </View>
    {level ? <><Text style={{ fontWeight: '700' }}>Mức hiện tại: {SEVERITY[level].label}</Text><Muted>{doctor || 'Bác sĩ phụ trách'} · {fmtDate(evaluation!.date)}</Muted></> : <Muted>Chưa có đánh giá mức độ được công bố. Không suy ra mức độ từ diện tích.</Muted>}
    {evaluation?.instructions ? <Text style={{ lineHeight: 21 }}>{evaluation.instructions}</Text> : null}
  </Card>;
}

