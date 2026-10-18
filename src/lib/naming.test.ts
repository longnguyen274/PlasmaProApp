// Chạy: node src/lib/naming.test.ts  (Node ≥ 23 tự bỏ kiểu TypeScript)
import assert from 'node:assert/strict';
import { buildFilename, checkFullFilename, formatAreaDisplay, parseArea, splitForPatient } from './naming.ts';

// Dấu phẩy thập phân → dấu chấm (đặc tả 4.4, mục 10)
assert.deepEqual(parseArea('12,5'), { ok: true, value: 12.5, needsZeroConfirm: false });
assert.deepEqual(parseArea('12.5'), { ok: true, value: 12.5, needsZeroConfirm: false });
// Quy đổi mm² → cm²
assert.deepEqual(parseArea('1250', 'mm2'), { ok: true, value: 12.5, needsZeroConfirm: false });
// Chặn số âm, chữ, rỗng
assert.equal(parseArea('-3').ok, false);
assert.equal(parseArea('abc').ok, false);
assert.equal(parseArea('').ok, false);
assert.equal(parseArea('1e3').ok, false);
// 0 cần bác sĩ xác nhận lại
assert.deepEqual(parseArea('0'), { ok: true, value: 0, needsZeroConfirm: true });

// Tên tệp đúng ví dụ trong đặc tả
assert.equal(buildFilename('BN001', 'VT01', 'IMG0001', 12.5, 'jpg'), 'BN001_VT01_IMG0001_area_12.5_cm2.jpg');
assert.equal(buildFilename('BN002', 'VT01', 'IMG0003', 8, 'png'), 'BN002_VT01_IMG0003_area_8.0_cm2.png');
assert.equal(buildFilename('BN001', 'VT01', 'IMG0001', null, 'jpg'), 'BN001_VT01_IMG0001.jpg');
// Hai ảnh cùng diện tích vẫn khác tên nhờ mã ảnh
assert.notEqual(
  buildFilename('BN001', 'VT01', 'IMG0001', 10, 'jpg'),
  buildFilename('BN001', 'VT01', 'IMG0002', 10, 'jpg'),
);

const exp = { patientCode: 'BN001', woundCode: 'VT01', imageId: 'IMG0001', ext: 'png' };
assert.deepEqual(checkFullFilename('BN001_VT01_IMG0001_area_12.5_cm2.png', exp), { ok: true, area: 12.5, needsZeroConfirm: false });
// Không cho đổi PNG thành JPG
assert.equal(checkFullFilename('BN001_VT01_IMG0001_area_12.5_cm2.jpg', exp).ok, false);
// Thiếu đơn vị / thiếu diện tích / đổi mã ảnh
assert.equal(checkFullFilename('BN001_VT01_IMG0001_area_12.5.png', exp).ok, false);
assert.equal(checkFullFilename('BN001_VT01_IMG0001.png', exp).ok, false);
assert.equal(checkFullFilename('BN001_VT01_IMG0009_area_12.5_cm2.png', exp).ok, false);
assert.equal(checkFullFilename('BN001_VT01_IMG0001_area_-1_cm2.png', exp).ok, false);

assert.equal(formatAreaDisplay(null), 'Chưa có nhãn diện tích');
assert.equal(formatAreaDisplay(12.5), '12,5 cm²');

// Cùng bệnh nhân luôn cùng tập
assert.equal(splitForPatient('BN001'), splitForPatient('BN001'));

console.log('naming: tất cả kiểm thử đạt');
