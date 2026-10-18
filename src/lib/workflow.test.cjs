/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  const full = path.resolve(__dirname, file + '.ts');
  if (cache[full]) return cache[full];
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(name), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
const { researchImages, latestEvaluation, patientSeverity, canManagePatient } = load('access');
const { researchCsv, researchCaptureMetadata } = load('research');
const doctor = { id: 'd1', role: 'doctor', researchAccess: true, locked: false };
const tech = { id: 't1', role: 'admin', researchAccess: true, locked: false };
const patient = { id: 'u1', role: 'patient', locked: false };
const p = { id: 'p1', code: 'BN001', researchCode: 'RS-A1B2', name: 'PRIVATE_NAME', phone: 'PRIVATE_PHONE', birthYear: 1980, doctorId: doctor.id, researchConsent: true };
const image = { id: 'IMG0001', patientId: p.id, woundId: 'w1', source: 'doctor', status: 'labeled', areaCm2: 12.5, researchReady: true, researchUri: 'safe.png', ext: 'png', filename: 'old.png', captureDate: '2026-10-12' };
const data = { patients: [p], accounts: [doctor,tech,patient], images:[image], wounds:[{ id:'w1', patientId:p.id, code:'VT01', status:'active' }], evaluations:[] };
assert.equal(canManagePatient(doctor,p),true);
assert.equal(canManagePatient({...doctor,id:'other'},p),false);
assert.equal(canManagePatient(patient,p),false);
assert.equal(researchImages(data,tech).length,1);
assert.equal(researchImages(data,doctor).length,1);
for(const actor of [null,patient,{...tech,locked:true},{...tech,pendingApproval:true},{...tech,researchAccess:false},{...doctor,id:'other'}]) assert.equal(researchImages(data,actor).length,0);
for(const patch of [{status:'unlabeled'},{status:'excluded'},{areaCm2:null},{areaCm2:-1},{areaCm2:Infinity},{source:'patient'},{researchReady:false},{researchUri:undefined}]) assert.equal(researchImages({...data, images:[{...image,...patch}]},tech).length,0);
assert.equal(researchImages({...data,patients:[{...p,researchConsent:false}]},tech).length,0);
const csv = researchCsv(data,[image,{...image,id:'IMG0002'}]);
const capture = { imageSource:'gallery',width:640,height:480,roi:{x:.15,y:.15,width:.7,height:.7},roiCoordinates:'saved_image_normalized',quality:{profileId:'experimental',profileValidated:false,lighting:'unknown',sharpness:'warn',metrics:null},visualReview:{framing:true,lighting:false,sharpness:false,reviewedAt:'PRIVATE_TIME'},manualReference:{confirmedBy:'PRIVATE_DOCTOR',method:'PRIVATE_NAME'},capabilities:{model:'PRIVATE_DEVICE'},sessionId:'PRIVATE_SESSION',capturedAt:'PRIVATE_TIME' };
const metadata = JSON.stringify(researchCaptureMetadata([{...image,capture}]));
for(const privateValue of ['PRIVATE_TIME','PRIVATE_DOCTOR','PRIVATE_NAME','PRIVATE_DEVICE','PRIVATE_SESSION']) assert.equal(metadata.includes(privateValue),false);
assert.equal(JSON.parse(metadata)[0].automatic_area_cm2,null);
assert.equal(JSON.parse(metadata)[0].area_reference_cm2,12.5);
for(const forbidden of [p.name,p.phone,p.code,String(p.birthYear),image.captureDate]) assert.equal(csv.includes(forbidden),false);
assert.match(csv,/RS-A1B2_VT01_IMG0001_area_12.5_cm2.png/);
assert.equal(csv.trim().split('\n')[1].split(',').at(-1),csv.trim().split('\n')[2].split(',').at(-1));
data.evaluations = [
  { id:'e1',woundId:'w1',date:'2026-10-12',severity:'mild',visibleToPatient:true },
  { id:'e2',woundId:'w1',date:'2026-10-12',severity:'severe',visibleToPatient:false },
];
assert.equal(latestEvaluation(data,'w1',true).severity,'mild');
assert.equal(latestEvaluation(data,'w1').severity,'severe');
assert.equal(patientSeverity(data,'p1'),'severe');
assert.equal(patientSeverity({...data,evaluations:[]},'p1'),undefined);
console.log('workflow: permission, consent, research privacy, grouping and severity checks passed');

