import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function text(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function check(name, ok, detail = '') {
  checks.push({ name, ok: Boolean(ok), detail });
}

const room = text('components/live-class/providers/livekit/livekit-teleclass-room.tsx');
const pdf = text('components/live-class/providers/livekit/pdf-deck.tsx');
const types = text('lib/live-class/providers/livekit-types.ts');
const resource = text('app/api/live-class/resource/route.ts');
const css = text('app/globals.css');

check('PDF.js no webpack-generated dynamic module import',
  !pdf.includes("await import('pdfjs-dist')") && !pdf.includes('await import("pdfjs-dist")'));
check('PDF.js loads stable public browser module', pdf.includes('/vendor/pdfjs/pdf.mjs'));
check('PDF.js uses stable public worker', pdf.includes('/vendor/pdfjs/pdf.worker.min.mjs'));
check('PDF browser module exists', exists('public/vendor/pdfjs/pdf.mjs'));
check('PDF worker exists', exists('public/vendor/pdfjs/pdf.worker.min.mjs'));
check('Files tab has a multiple-file input', room.includes('ref={resourceInputRef}') && room.includes('multiple'));
check('Files tab has plus uploader', room.includes('lk-file-upload-button') && room.includes('<Plus size={16}'));
check('Files can stack multiple resources', room.includes('lk-file-stack'));
check('Generic class-resource uploader exists', room.includes('uploadClassResources'));
check('Files can be presented from the stack', room.includes('presentStoredResource'));
check('Files can be deleted by teacher', room.includes('deleteClassResource'));
check('PDF stored URL presentation exists', room.includes("type: 'pdf-url'"));
check('Generic resource stage sync exists', room.includes("type: 'resource-present'"));
check('Resource presentation type is declared', types.includes("'resource'"));
check('Class resource API supports common presentation files',
  resource.includes('"mp3"') && resource.includes('"mp4"') && resource.includes('"pptx"') && resource.includes('"docx"') && resource.includes('"xlsx"'));
check('Dangerous executable/script extensions are blocked',
  resource.includes('"exe"') && resource.includes('"ps1"') && resource.includes('"bat"'));
check('Resource files preserve stack ordering', resource.includes('nextSortOrder'));
check('Files panel responsive styles exist', css.includes('.lk-file-upload-button') && css.includes('.lk-file-stack'));
check('Generic media stage styles exist', css.includes('.resource-stage-media') && css.includes('.resource-stage-audio'));
check('Existing raised-hand queue preserved', room.includes('Raised Hands') && room.includes('raisedParticipants'));
check('Existing PIP preserved', room.includes('studio.pip') && room.includes('PIP'));
check('Existing watermark preserved', room.includes('studio.watermark'));
check('Existing network indicator preserved', room.includes('networkQuality'));

let failed = 0;
for (const item of checks) {
  if (item.ok) {
    console.log(`PASS ${item.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} Live Now V5.4.8 checks passed.`);
if (failed) process.exit(1);
