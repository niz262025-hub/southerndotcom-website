// Descriptive contact details only. These fields never establish a tenant or role.
const fields = {
  companyName: ['company_name', 200],
  ssmNumber: ['ssm_number', 50],
  companyEmail: ['company_email', 254],
  contactNumber: ['contact_number', 40],
  address: ['address', 1000],
  personInCharge: ['person_in_charge', 100],
};
export function profileFields(input, { requireComplete = input.profileVersion === '1' } = {}) {
  const data = {};
  for (const [name, [key, limit]] of Object.entries(fields)) {
    if (input[name] === undefined) continue; // Preserve existing details on legacy updates.
    if (typeof input[name] !== 'string' || input[name].trim().length > limit
      || [...input[name]].some((character) => {
        const code = character.charCodeAt(0);
        return code === 127 || (code < 32 && ![9, 10, 13].includes(code));
      })) {
      throw new Error(`Invalid ${name}. Maximum ${limit} characters.`);
    }
    data[key] = input[name].trim();
  }
  if (data.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.company_email)) throw new Error('Enter a valid company email.');
  if (data.contact_number && (!/^[+\d\s().-]{5,40}$/.test(data.contact_number) || !/^[0-9]{7,15}$/.test(data.contact_number.replace(/\D/g, '')))) throw new Error('Enter a valid contact number.');
  if (data.ssm_number && !/^[A-Za-z0-9 ()/-]{5,50}$/.test(data.ssm_number)) throw new Error('Enter a valid SSM registration number.');
  // Versioned forms require the approved fields; old saved profiles can still be read.
  if (requireComplete) {
    for (const key of ['contact_number', 'address', ...(input.accountType === 'business'
      ? ['company_name', 'ssm_number', 'company_email', 'person_in_charge'] : [])]) {
      if (!data[key]) throw new Error(`Please complete ${key.replaceAll('_', ' ')}.`);
    }
  }
  return data;
}

export function descriptiveProfile(metadata) {
  const result = {};
  for (const [key, limit] of Object.values(fields)) {
    if (typeof metadata?.[key] === 'string' && metadata[key].trim().length <= limit) result[key] = metadata[key].trim();
  }
  return result;
}
