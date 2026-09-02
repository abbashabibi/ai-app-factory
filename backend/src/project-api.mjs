import { createProject, advanceProject } from './project-service.mjs';

export function registerProjectRoutes(server, json, readBody) {
  const projects = new Map();

  server.on('request', async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/projects') {
      try {
        const body = await readBody(req);
        const project = createProject(body);
        projects.set(project.projectId, project);
        return json(res, 201, project);
      } catch {
        return json(res, 400, { error: 'INVALID_PROJECT' });
      }
    }

    const match = req.url?.match(/^\/api\/v1\/projects\/([^/]+)\/advance$/);
    if (req.method === 'POST' && match) {
      try {
        const body = await readBody(req);
        const project = projects.get(match[1]);
        return json(res, 200, advanceProject(project, body.stage));
      } catch (error) {
        return json(res, 400, { error: error.message === 'INVALID_STAGE' ? 'INVALID_STAGE' : 'INVALID_PROJECT' });
      }
    }
  });

  return projects;
}
