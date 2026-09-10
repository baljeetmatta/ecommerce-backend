import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateReturnEvidence } from '../src/utils/returnEvidence.js';
test('return evidence requires an existing store upload of the correct type', async () => {
 const root=await mkdtemp(path.join(tmpdir(),'return-evidence-'));
 try {
  await writeFile(path.join(root,'photo.webp'),'fixture');
  const entry={category:'Unboxing Photo',url:'https://store.example/uploads/photo.webp'};
  assert.deepEqual(await validateReturnEvidence([entry],'https://store.example',root),[entry]);
  const label={...entry,category:'Product Label Photo'};
  assert.deepEqual(await validateReturnEvidence([label],'https://store.example',root),[label]);
  await writeFile(path.join(root,'video.mp4'),'fixture');
  for (const category of ['Unboxing Video','Product Damage Video']) {
   const video={category,url:'https://store.example/uploads/video.mp4'};
   assert.deepEqual(await validateReturnEvidence([video],'https://store.example',root),[video]);
  }
  await assert.rejects(validateReturnEvidence([{...label,url:'https://store.example/uploads/video.mp4'}],'https://store.example',root));
  for (const evidence of [[],[{...entry,url:'https://elsewhere.example/uploads/photo.webp'}],[{...entry,url:'https://store.example/uploads/missing.webp'}],[{...entry,category:'Unboxing Video'}]]) {
   await assert.rejects(validateReturnEvidence(evidence,'https://store.example',root));
  }
 } finally { await rm(root,{recursive:true,force:true}); }
});
