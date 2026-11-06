import test from 'node:test';
import assert from 'node:assert/strict';
import { profileFields, descriptiveProfile } from '../server/profile-fields.js';

const person = { profileVersion: '1', accountType: 'personal', contactNumber: '+60 12-345 6789', address: ' Johor Bahru ' };
const company = { ...person, accountType: 'business', companyName: ' MYOPS ', ssmNumber: '202303050959 (003472425-X)', companyEmail: 'office@example.com', personInCharge: 'Owner' };
test('individual and company contacts are normalized and authority fields excluded', () => {
  assert.deepEqual(profileFields({ ...person, role: 'admin', organization_id: 'victim' }), { contact_number: '+60 12-345 6789', address: 'Johor Bahru' });
  const result = profileFields(company);
  assert.equal(result.company_name, 'MYOPS');
  assert.equal(result.ssm_number, company.ssmNumber);
  assert.deepEqual(descriptiveProfile({ ...result, role: 'admin' }), result);
});
test('new forms require all approved contact fields and reject malformed or oversized values', () => {
  for (const key of ['contactNumber', 'address', 'companyName', 'ssmNumber', 'companyEmail', 'personInCharge']) {
    assert.throws(() => profileFields({ ...company, [key]: '' }));
  }
  for (const extra of [{ companyEmail: 'bad email' }, { contactNumber: '<script>' }, { address: 'x'.repeat(1001) }, { companyName: ['bad'] }, { personInCharge: '\u0000owner' }]) {
    assert.throws(() => profileFields({ ...company, ...extra }));
  }
});
test('legacy partial updates preserve omitted details and cannot introduce arbitrary metadata', () => {
  assert.deepEqual(profileFields({ companyName: 'New company', access_mode: 'paid' }), { company_name: 'New company' });
});
