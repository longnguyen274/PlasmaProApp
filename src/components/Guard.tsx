import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { Button, Empty, Header, Screen } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Patient } from '@/lib/types';

/**
 * Quyền xem hồ sơ lâm sàng theo đặc tả mục 9: bác sĩ phụ trách, hoặc chính bệnh nhân.
 * Quản trị kỹ thuật không mặc định có quyền xem lâm sàng.
 */
export function useCanView(patient?: Patient) {
  const { me } = useStore();
  if (!me || !patient) return false;
  if (me.role === 'doctor') return patient.doctorId === me.id;
  if (me.role === 'patient') return me.patientId === patient.id;
  return false;
}

export function NoAccess({ title = 'Không có quyền truy cập' }: { title?: string }): ReactNode {
  return (
    <Screen header={<Header back title={title} />}>
      <Empty icon="lock-closed-outline" text="Tài khoản này không được phân công cho hồ sơ này, hoặc hồ sơ không tồn tại." />
      <Button label="Quay lại" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
