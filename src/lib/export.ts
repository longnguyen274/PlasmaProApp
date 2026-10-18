import { Asset } from 'expo-asset';
import JSZip from 'jszip';
import { Platform } from 'react-native';

import { researchImages } from './access';
import { researchCaptureMetadata, researchCsv, researchFilename } from './research';
import { DEMO_ASSETS } from './seed';
import type { AppData, WoundImage } from './types';

export function exportableImages(data: AppData, actorId: string): WoundImage[] {
  return researchImages(data, data.accounts.find(a => a.id === actorId));
}
export const buildCsv = researchCsv;

export async function readImageBytes(im: WoundImage): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const url = im.uri ?? Asset.fromModule(DEMO_ASSETS[im.demoAsset ?? 1]).uri;
    return new Uint8Array(await (await fetch(url)).arrayBuffer());
  }
  const { File } = await import('expo-file-system');
  if (im.uri) return new File(im.uri).bytes();
  const asset = await Asset.fromModule(DEMO_ASSETS[im.demoAsset ?? 1]).downloadAsync();
  return new File(asset.localUri ?? asset.uri).bytes();
}

export interface ExportResult {
  count: number;
  zipName: string;
  shared: boolean;
  location: string;
}

/** Tạo ZIP chứa ảnh mang tên đã sửa + labels.csv, rồi mở bảng chia sẻ của iOS để lưu/gửi. */
export async function exportDataset(data: AppData, images: WoundImage[], actorId: string): Promise<ExportResult> {
  const allowed = new Map(exportableImages(data, actorId).map(im => [im.id, im]));
  if (!images.length || images.some(im => !allowed.has(im.id))) throw new Error('Ảnh hoặc tài khoản không đủ quyền xuất dữ liệu.');
  images = images.map(im => allowed.get(im.id)!);
  const zip = new JSZip();
  const folder = zip.folder('images')!;
  for (const im of images) {
    // Tệp trong ZIP mang tên đã sửa, không chỉ đổi tiêu đề hiển thị (đặc tả 4.4, 12).
    folder.file(researchFilename(data, im), await readImageBytes({ ...im, uri: im.researchUri === 'demo' ? null : im.researchUri! }));
  }
  zip.file('labels.csv', buildCsv(data, images));
  zip.file('capture-quality.json', JSON.stringify(researchCaptureMetadata(images), null, 2));
  zip.file(
    'README.txt',
    [
      'Bo du lieu anh vet thuong co nhan dien tich (cm2) do bac si do ben ngoai app.',
      'Ten tep: <ma_nghien_cuu>_<ma_vet_thuong>_<ma_anh>_area_<dien_tich>_cm2.png',
      'Chi gom anh da duoc bac si kiem tra va benh nhan dong y nghien cuu.',
      'Anh PNG la ban sao nghien cuu da bo metadata; anh goc duoc giu rieng.',
      'CSV khong co ho ten, dien thoai, nam sinh, ngay chup hay ma ho so lam sang.',
      'Cot split: chia train/val/test theo benh nhan.',
      'capture-quality.json: nguon anh, ROI, chat luong thu nghiem va so do tham chieu; khong co ID thiet bi/bac si, thoi gian hay ghi chu tu do.',
      'automatic_area_cm2: uoc luong AR (vung khoanh theo mau + khoang cach + noi tham so camera), CHUA KIEM CHUNG; null neu khong co AR. Nhan chuan la area_reference_cm2 do bac si xac nhan. Nhan synthetic_demo chi la du lieu mo phong.',
      `Xuat luc: ${new Date().toISOString()}`,
    ].join('\n'),
  );
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '').replace('T', '_');
  const zipName = `plasmapro_dataset_${stamp}.zip`;

  if (Platform.OS === 'web') {
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return { count: images.length, zipName, shared: true, location: 'Thư mục Tải xuống của trình duyệt' };
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'exports');
  if (!dir.exists) dir.create();
  const out = new File(dir, zipName);
  out.create();
  out.write(bytes);
  const Sharing = await import('expo-sharing');
  let shared = false;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(out.uri, { UTI: 'public.zip-archive', mimeType: 'application/zip', dialogTitle: zipName });
    shared = true;
  }
  return { count: images.length, zipName, shared, location: out.uri };
}
