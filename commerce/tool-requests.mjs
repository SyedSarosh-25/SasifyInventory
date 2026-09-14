const priorities = new Set(['urgent', 'moderate', 'low']);

function text(value, max) {
  return String(value ?? '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, max);
}

export function normalizeToolRequest(body) {
  const toolName = text(body?.toolName, 160);
  const requirement = text(body?.requirement, 4000);
  const priority = text(body?.priority, 20).toLowerCase();
  const contactNumber = text(body?.contactNumber, 40);
  const digits = contactNumber.replace(/\D/g, '');
  if (toolName.length < 2) throw new Error('Enter the name of the tool you need.');
  if (requirement.length < 10) throw new Error('Describe what you need from the tool.');
  if (!priorities.has(priority)) throw new Error('Select a valid request priority.');
  if (digits.length < 7 || digits.length > 15 || !/^\+?[0-9][0-9\s().-]{6,38}$/.test(contactNumber))
    throw new Error('Enter a valid contact number, including the country code if needed.');
  return { toolName, requirement, priority, contactNumber };
}

export const toolRequestPriorities = [...priorities];
