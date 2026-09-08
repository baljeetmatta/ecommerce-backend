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
  for (const evidence of [[],[{...entry,url:'https://elsewhere.example/uploads/photo.webp'}],[{...entry,url:'https://store.example/uploads/missing.webp'}],[{...entry,category:'Unboxing Video'}]]) {
   await assert.rejects(validateReturnEvidence(evidence,'https://store.example',root));
  }
 } finally { await rm(root,{recursive:true,force:true}); }
});
