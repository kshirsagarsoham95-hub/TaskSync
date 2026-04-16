export function selectTemplate(templates) {
  if (!templates.length) {
    return null;
  }
  const options = templates.map((template, index) => `${index + 1}. ${template.template_name || template.title}`).join('\n');
  const choice = window.prompt(`Choose a template number:\n${options}`);
  const index = Number(choice) - 1;
  return Number.isInteger(index) && templates[index] ? templates[index] : null;
}
