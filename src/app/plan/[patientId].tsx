import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '@/components/Text';

import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Choices, Field, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, PLAN_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import type { PlanStatus, TreatmentPlan } from '@/lib/types';
import { C } from '@/theme';

const toVn = (iso: string) => (iso ? fmtDate(iso) : '');
const fromVn = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

function PlanCard({ plan, editorName }: { plan: TreatmentPlan; editorName?: string }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>Phiên bản {plan.version}</Text>
        <Chip label={PLAN_STATUS[plan.status].label} tone={PLAN_STATUS[plan.status].tone} />
      </View>
      <InfoRow label="Hiệu lực" value={`${fmtDate(plan.startDate)} – ${fmtDate(plan.endDate)}`} />
      <InfoRow label="Số lần điều trị / ngày" value={plan.sessionsPerDay ?? 'Chưa đặt'} />
      <InfoRow label="Giãn cách tối thiểu" value={plan.minIntervalMin !== null ? `${plan.minIntervalMin} phút` : 'Chưa đặt'} />
      <InfoRow label="Năng lượng mục tiêu / lần" value={plan.targetEnergyWh !== null ? `${plan.targetEnergyWh} Wh` : 'Chưa đặt'} />
      <InfoRow label="Lịch đánh giá" value={plan.reviewSchedule || '—'} />
      {plan.notes ? <Muted>Ghi chú: {plan.notes}</Muted> : null}
      <Muted>Sửa bởi {editorName ?? '—'} lúc {fmtDateTime(plan.editedAt)} · Lý do: {plan.reason || '—'}</Muted>
      <Chip label={plan.confirmed ? 'Bác sĩ đã xác nhận' : 'Chưa xác nhận'} tone={plan.confirmed ? 'green' : 'gray'} />
    </Card>
  );
}

// BS07 – Liệu trình: tạo/sửa theo phiên bản, lưu người sửa, lý do (đặc tả 7.1).
export default function Plan() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { data, me, savePlan } = useStore();
  const { patient, account } = useLookups();
  const p = patient(patientId);
  const canView = useCanView(p);
  const plans = data.plans.filter((x) => x.patientId === patientId).sort((a, b) => b.version - a.version);
  const latest = plans[0];

  const [status, setStatus] = useState<PlanStatus>(latest?.status ?? 'draft');
  const [perDay, setPerDay] = useState(latest?.sessionsPerDay?.toString() ?? '');
  const [gap, setGap] = useState(latest?.minIntervalMin?.toString() ?? '');
  const [energy, setEnergy] = useState(latest?.targetEnergyWh?.toString() ?? '');
  const [start, setStart] = useState(toVn(latest?.startDate ?? ''));
  const [end, setEnd] = useState(toVn(latest?.endDate ?? ''));
  const [review, setReview] = useState(latest?.reviewSchedule ?? '');
  const [notes, setNotes] = useState(latest?.notes ?? '');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!p || !canView) return <NoAccess />;

  if (me?.role === 'patient') {
    // Bệnh nhân chỉ xem kế hoạch đã được bác sĩ xác nhận.
    const visible = plans.filter((x) => x.confirmed && x.status !== 'draft');
    return (
      <Screen header={<Header back title="Liệu trình của tôi" />}>
        {visible.length === 0 ? <Card><Muted>Chưa có liệu trình được bác sĩ xác nhận.</Muted></Card> : <PlanCard plan={visible[0]} editorName={account(visible[0].editedBy)?.name} />}
      </Screen>
    );
  }

  const save = () => {
    const s = fromVn(start);
    const e = fromVn(end);
    if (!s || !e) return setErr('Ngày theo dạng dd/mm/yyyy.');
    if (e < s) return setErr('Ngày kết thúc phải sau ngày bắt đầu.');
    const nums = [perDay, gap, energy].map(numOrNull);
    if (nums.some((n) => n !== null && (!Number.isFinite(n) || n < 0))) return setErr('Thông số phải là số không âm.');
    if (!reason.trim()) return setErr('Nhập lý do thay đổi để lưu vết phiên bản.');
    if (status === 'active' && !confirmed) return setErr('Liệu trình "Đang áp dụng" cần bác sĩ xác nhận.');
    setErr(null);
    savePlan({
      patientId: p.id, status, sessionsPerDay: nums[0], minIntervalMin: nums[1], targetEnergyWh: nums[2],
      startDate: s, endDate: e, reviewSchedule: review.trim(), notes: notes.trim(), reason: reason.trim(), confirmed,
    });
    setReason('');
    notify('Đã lưu phiên bản mới', 'Thiết bị nhận liệu trình khi đồng bộ (bản demo: mô phỏng).');
  };

  return (
    <Screen header={<Header back title="Liệu trình điều trị" subtitle={`${p.name} · ${p.code}`} />}>
      <Card>
        <SectionTitle icon="flash-outline">Thiết lập phiên bản mới</SectionTitle>
        <Muted>Giá trị điều trị cụ thể do nhóm chuyên môn thiết lập; ứng dụng không đặt sẵn lịch hay liều. Để trống nếu chưa áp dụng.</Muted>
        <Choices<PlanStatus> value={status} onChange={setStatus} options={(['draft', 'active', 'paused', 'ended'] as const).map((v) => ({ value: v, label: PLAN_STATUS[v].label }))} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Số lần / ngày" value={perDay} onChangeText={setPerDay} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Giãn cách (phút)" value={gap} onChangeText={setGap} keyboardType="number-pad" /></View>
        </View>
        <Field label="Năng lượng mục tiêu / lần (Wh)" value={energy} onChangeText={setEnergy} keyboardType="decimal-pad" hint="Chỉ dùng khi phần cứng đo được đại lượng này." />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Ngày bắt đầu" value={start} onChangeText={setStart} placeholder="dd/mm/yyyy" /></View>
          <View style={{ flex: 1 }}><Field label="Ngày kết thúc" value={end} onChangeText={setEnd} placeholder="dd/mm/yyyy" /></View>
        </View>
        <Field label="Lịch đánh giá" value={review} onChangeText={setReview} placeholder="Ví dụ: tái đánh giá mỗi 7 ngày" />
        <Field label="Ghi chú" value={notes} onChangeText={setNotes} multiline />
        <Field label="Lý do thay đổi" value={reason} onChangeText={setReason} placeholder="Bắt buộc" error={err} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: C.text }}>Bác sĩ xác nhận liệu trình (bệnh nhân sẽ xem được)</Text>
          <Switch value={confirmed} onValueChange={setConfirmed} />
        </View>
        <Button label="Lưu phiên bản mới" icon="save-outline" onPress={save} />
      </Card>

      <SectionTitle icon="git-branch-outline">Các phiên bản</SectionTitle>
      {plans.length === 0 && <Muted>Chưa có phiên bản nào.</Muted>}
      {plans.map((pl) => (
        <PlanCard key={pl.id} plan={pl} editorName={account(pl.editedBy)?.name} />
      ))}
    </Screen>
  );
}
