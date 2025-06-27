import type { AsanaProject, NangoSync } from '../../../models';

export default async function fetchAsanaProjects(nango: NangoSync) {
  // Basic Asana projects sync
  const projects: AsanaProject[] = [];
  
  // Placeholder - real implementation would call Asana API
  // const response = await nango.get({
  //   endpoint: '/projects',
  //   params: { limit: 100 }
  // });
  
  // Save projects to Nango
  if (projects.length > 0) {
    await nango.batchSave(projects, 'AsanaProject');
  }
  
  return projects;
}