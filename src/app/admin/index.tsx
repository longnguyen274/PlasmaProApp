import { Switch, View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Choices, Header, IconBadge, Muted, Screen, SectionTitle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

const ROLE = { doctor: 'Bác sĩ', patient: 'Bệnh nhân', admin: 'Quản trị' } as const;

// Quản trị: quản lý tài khoản, khóa/mở, cấp quyền nghiên cứu, phân công bác sĩ (đặc tả mục 9).
export default function AdminAccounts() {
  const { data, me, updateAccount, updatePatient } = useStore();
  const doctors = data.accounts.filter((a) => a.role === 'doctor' && !a.locked && !a.pendingApproval);
  return (
    <Screen header={<Header title="Quản lý tài khoản" subtitle="Quản trị kỹ thuật" />}>
      <Muted>Quản trị không mặc định có quyền xem dữ liệu lâm sàng; màn hình chỉ hiển thị mã hồ sơ.</Muted>
      {data.accounts.map((a) => (
        <Card key={a.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBadge icon={a.role === 'doctor' ? 'medkit-outline' : a.role === 'patient' ? 'person-outline' : 'construct-outline'} tone={a.role === 'doctor' ? 'blue' : a.role === 'patient' ? 'green' : 'violet'} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: C.text }}>{a.role === 'patient' ? data.patients.find((p) => p.id === a.patientId)?.code : a.name}</Text>
              <Text style={{ color: C.textSoft, fontSize: 12 }}>{ROLE[a.role]} · @{a.username}</Text>
            </View>
            <Chip label={a.pendingApproval ? 'Chờ duyệt' : a.locked ? 'Đã khóa' : 'Hoạt động'} tone={a.locked ? 'red' : 'green'} />
          </View>
          {a.pendingApproval && <Button label="Duyệt tài khoản" onPress={() => updateAccount(a.id, { pendingApproval: false, locked: false })} />}
          {a.id !== me?.id && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: C.text }}>Khóa tài khoản</Text>
              <Switch value={a.locked} onValueChange={(v) => updateAccount(a.id, { locked: v })} />
            </View>
          )}
          {(a.role === 'doctor' || a.role === 'admin') && !a.pendingApproval && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: C.text }}>Quyền xuất dữ liệu nghiên cứu</Text>
              <Switch value={!!a.researchAccess} onValueChange={(v) => updateAccount(a.id, { researchAccess: v })} />
            </View>
          )}
        </Card>
      ))}

      <SectionTitle icon="git-network-outline">Phân công bác sĩ phụ trách</SectionTitle>
      {data.patients.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: '700', color: C.text }}>{p.code}</Text>
          <Choices value={p.doctorId} onChange={(v) => updatePatient(p.id, { doctorId: v })} options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
        </Card>
      ))}
    </Screen>
  );
}
