import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import SupportTicket from '../src/models/SupportTicket.js';
import Sequence from '../src/models/Sequence.js';
import WorkAssignment from '../src/models/WorkAssignment.js';
import StaffAuditLog from '../src/models/StaffAuditLog.js';
import { createCustomerTicket, customerTicketReply, updateTicket } from '../src/controllers/supportController.js';
import { normalizeTicketAttachments } from '../src/utils/ticketAttachments.js';

const account = '507f1f77bcf86cd799439011';
const id = '507f1f77bcf86cd799439012';
const image = 'https://example.com/uploads/support-ticket/2026-10/example-optimized.webp';
const query = value => ({ populate() { return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const invoke = (handler, req) => new Promise((resolve, reject) => {
  const res = { code: 200, status(value) { this.code = value; return this; }, json(value) { resolve({ status: this.code, data: value }); } };
  handler(req, res, error => { error.status = res.code; reject(error); });
});
afterEach(() => mock.restoreAll());

test('attachments accept uploaded images and reject unsupported or excessive input', () => {
  assert.deepEqual(normalizeTicketAttachments([image, image]), [image]);
  for (const invalid of [null, {}, Array(7).fill(image), ['data:image/png;base64,test'], ['javascript:alert(1)'], ['https://example.com/file.svg'], ['https://example.com/file.webp']]) {
    assert.throws(() => normalizeTicketAttachments(invalid));
  }
});

test('new customer tickets retain attachments in the first message', async () => {
  mock.method(WorkAssignment, 'findOne', () => query(null));
  mock.method(Sequence, 'findOneAndUpdate', async () => ({ value: 1 }));
  let created;
  mock.method(SupportTicket, 'create', async payload => { created = payload; return { _id: id }; });
  mock.method(SupportTicket, 'findById', () => query(created));
  const result = await invoke(createCustomerTicket, { customer: { _id: account, name: 'Customer' }, body: { subject: 'Damaged item', message: 'Here is a photo.', attachments: [image] } });
  assert.equal(result.status, 201);
  assert.deepEqual(created.messages[0].attachments, [image]);
  assert.equal(created.requester, account);
});

test('image-only customer replies save and leave the waiting status', async () => {
  const ticket = { _id: id, status: 'Waiting for Customer', assignedStaff: account, messages: [], history: [], async save() {} };
  mock.method(SupportTicket, 'findOne', filter => { assert.equal(filter.requester, account); assert.equal(filter.requesterType, 'Customer'); return Promise.resolve(ticket); });
  mock.method(SupportTicket, 'findById', () => query(ticket));
  const result = await invoke(customerTicketReply, { customer: { _id: account, name: 'Customer' }, params: { id }, body: { attachments: [image] } });
  assert.deepEqual(result.data.messages[0].attachments, [image]);
  assert.equal(result.data.status, 'In Progress');
  assert.equal(result.data.messages[0].authorType, 'Customer');
  const document = new SupportTicket({ ticketNumber: 'C-TEST', requesterType: 'Customer', requester: account, subject: 'Issue', messages: result.data.messages });
  await document.validate();
});

test('requesters cannot reply to another account’s ticket or a closed ticket', async () => {
  mock.method(SupportTicket, 'findOne', async () => null);
  await assert.rejects(invoke(customerTicketReply, { customer: { _id: account }, params: { id }, body: { message: 'Hello' } }), error => error.status === 404);
  mock.restoreAll();
  mock.method(SupportTicket, 'findOne', async () => ({ status: 'Closed' }));
  await assert.rejects(invoke(customerTicketReply, { customer: { _id: account }, params: { id }, body: { message: 'Hello' } }), error => error.status === 400);
});

test('staff attachments save inside their assignment scope and are returned to admin', async () => {
  const ticket = { _id: id, ticketNumber: 'C-TEST', requesterType: 'Customer', requester: account, status: 'Assigned', messages: [], history: [], async save() {} };
  mock.method(SupportTicket, 'findOne', filter => { assert.equal(filter.assignedStaff, account); return Promise.resolve(ticket); });
  mock.method(SupportTicket, 'findById', () => query(ticket));
  mock.method(StaffAuditLog, 'create', async () => ({}));
  const result = await invoke(updateTicket, { user: { _id: account, role: 'Staff', name: 'Support' }, params: { id }, body: { message: 'Please follow this guide.', attachments: [image], status: 'In Progress' } });
  assert.equal(result.data.messages[0].authorType, 'User');
  assert.deepEqual(result.data.messages[0].attachments, [image]);
});
