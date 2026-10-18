/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mod = { exports: {} };
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'ar.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const { arGuidance, distanceSource, assessCapture, estimateAreaCm2, tiltCos, lightCheck } = mod.exports;
const base = { sessionId: 's', planes: 0, depthEnabled: false };
assert.equal(arGuidance(null, null, 0).canCapture, false, 'No event yet');
assert.equal(arGuidance({ ...base, state: 'normal' }, 0, 5000).canCapture, false, 'Stale event must block capture');
assert.equal(arGuidance({ ...base, state: 'not_available' }, 0, 0).tone, 'red');
const init = arGuidance({ ...base, state: 'limited', reason: 'initializing' }, 0, 0);
assert.equal(init.canCapture, false); assert.equal(init.step, 1); assert.match(init.text, /Di chuyển máy chậm/);
assert.equal(arGuidance({ ...base, state: 'limited', reason: 'excessive_motion' }, 0, 0).label, 'Máy di chuyển nhanh');
assert.equal(arGuidance({ ...base, state: 'limited', reason: 'weird' }, 0, 0).label, 'Theo dõi hạn chế');
const noSurface = arGuidance({ ...base, state: 'normal' }, 0, 0);
assert.equal(noSurface.canCapture, true); assert.equal(noSurface.step, 2);
assert.match(arGuidance({ ...base, state: 'normal', centerDistanceM: 0.1 }, 0, 0).label, /Quá gần/);
assert.match(arGuidance({ ...base, state: 'normal', centerDistanceM: 0.9 }, 0, 0).label, /Quá xa/);
const ready = arGuidance({ ...base, state: 'normal', centerDistanceM: 0.32, centerSource: 'plane' }, 0, 100);
assert.equal(ready.tone, 'green'); assert.equal(ready.step, 3); assert.equal(ready.label, 'Sẵn sàng · 32 cm');
assert.equal(arGuidance({ ...base, state: 'normal', centerDistanceM: NaN }, 0, 0).step, 2);
assert.equal(distanceSource('plane'), 'ar_plane');
assert.equal(distanceSource(undefined), 'none');

// Chỉ cho chụp khi AR ổn định, đã khoanh vết thương, đủ sáng và đúng khoảng cách.
const wound = { found: true, meanLuma: 140, clippedFraction: 0 };
const good = { ...base, state: 'normal', centerDistanceM: 0.3, pixelIntensity: 0.45, cameraForward: [0, -1, 0], planeNormal: [0, 1, 0] };
const ok = assessCapture({ ar: true, tracking: good, trackingAt: 0, wound, woundAt: 0, now: 100 });
assert.equal(ok.ready, true, ok.headline); assert.equal(ok.tone, 'green');
assert.equal(assessCapture({ ar: true, tracking: { ...good, centerDistanceM: 0.1 }, trackingAt: 0, wound, woundAt: 0, now: 100 }).ready, false, 'too close');
assert.match(assessCapture({ ar: true, tracking: { ...good, centerDistanceM: 0.9 }, trackingAt: 0, wound, woundAt: 0, now: 100 }).headline, /quá xa/);
assert.equal(assessCapture({ ar: true, tracking: { ...good, pixelIntensity: 0.05 }, trackingAt: 0, wound, woundAt: 0, now: 100 }).ready, false, 'dark room');
assert.equal(assessCapture({ ar: true, tracking: good, trackingAt: 0, wound: { ...wound, meanLuma: 30 }, woundAt: 0, now: 100 }).ready, false, 'dark wound');
assert.equal(assessCapture({ ar: true, tracking: good, trackingAt: 0, wound: { ...wound, clippedFraction: 0.4 }, woundAt: 0, now: 100 }).ready, false, 'glare');
assert.equal(assessCapture({ ar: true, tracking: good, trackingAt: 0, wound, woundAt: 0, now: 5000 }).ready, false, 'stale wound/tracking');
assert.equal(assessCapture({ ar: true, tracking: { ...good, centerDistanceM: undefined }, trackingAt: 0, wound, woundAt: 0, now: 100 }).ready, false, 'distance unknown');
assert.equal(assessCapture({ ar: true, tracking: { ...good, state: 'limited', reason: 'initializing' }, trackingAt: 0, wound, woundAt: 0, now: 100 }).ready, false);
assert.equal(assessCapture({ ar: true, tracking: { ...good, cameraForward: [1, 0, 0] }, trackingAt: 0, wound, woundAt: 0, now: 100 }).ready, false, 'oblique');
assert.equal(assessCapture({ ar: true, tracking: { ...good, planeNormal: undefined }, trackingAt: 0, wound, woundAt: 0, now: 100 }).ready, true, 'unknown angle does not block');
assert.equal(assessCapture({ ar: true, tracking: good, trackingAt: 0, wound: { found: false, meanLuma: null, clippedFraction: 0 }, woundAt: 0, now: 100 }).ready, false, 'no wound');
// Không có AR (Expo Go, web): chỉ cần khoanh được vết thương và đủ sáng.
assert.equal(assessCapture({ ar: false, tracking: null, trackingAt: null, wound, woundAt: 0, now: 100 }).ready, true);
assert.equal(assessCapture({ ar: false, tracking: null, trackingAt: null, wound: null, woundAt: null, now: 100 }).ready, false);
assert.equal(lightCheck({ ...base, state: 'normal', ambientIntensity: 200 }, null).ok, false, 'ARKit lumens');

assert.equal(tiltCos([0, 0, -1], [0, 0, 1]), 1);
assert.equal(tiltCos(undefined, [0, 1, 0]), null);
const k = { fx: 1500, fy: 1500, cx: 720, cy: 960, width: 1440, height: 1920 };
const est = estimateAreaCm2({ areaFraction: 0.05, imageWidth: 1440, imageHeight: 1920, intrinsics: k, distanceM: 0.3, point: { x: 0.5, y: 0.5 } });
assert.equal(est.areaCm2, 55.3);
const half = estimateAreaCm2({ areaFraction: 0.05, imageWidth: 720, imageHeight: 960, intrinsics: k, distanceM: 0.3, point: { x: 0.5, y: 0.5 } });
assert.equal(half.areaCm2, 55.3, 'independent of saved resolution');
const tilted = estimateAreaCm2({ areaFraction: 0.05, imageWidth: 1440, imageHeight: 1920, intrinsics: k, distanceM: 0.3, point: { x: 0.5, y: 0.5 }, cameraForward: [0, -1, 0], planeNormal: [0, Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)] });
assert.ok(tilted.areaCm2 > 63 && tilted.areaCm2 < 64.5, String(tilted.areaCm2));
assert.equal(estimateAreaCm2({ areaFraction: 0.05, imageWidth: 1440, imageHeight: 1920, intrinsics: k, distanceM: 0.3, point: { x: 0.5, y: 0.5 }, cameraForward: [1, 0, 0], planeNormal: [0, 1, 0] }), null, 'too oblique');
assert.equal(estimateAreaCm2({ areaFraction: 0, imageWidth: 1440, imageHeight: 1920, intrinsics: k, distanceM: 0.3, point: { x: 0.5, y: 0.5 } }), null);
console.log('ar: tất cả kiểm thử đạt');
