export type CapabilityTone = 'accent' | 'good' | 'warn';

export interface CapabilityDescriptor {
  id: string;
  title: string;
  summary: string;
  access: string[];
  route: string;
  example: string;
  promptTemplate: string;
  tone: CapabilityTone;
}

export interface CapabilityCatalog {
  version: string;
  defaultCapabilityId: string;
  capabilities: CapabilityDescriptor[];
}

export const defaultCapabilityCatalog: CapabilityCatalog = {
  version: '1.0.0',
  defaultCapabilityId: 'workspace.audit',
  capabilities: [
    {
      id: 'workspace.audit',
      title: 'Workspace Audit',
      summary: 'Inspect the current Nexus state and identify what the first UI pass still needs.',
      access: ['Workspace snapshot', 'Tasks', 'Logs'],
      route: '/api/workspace',
      example: 'Review the current workspace and list the three highest-priority UI gaps.',
      promptTemplate: [
        'You are reviewing the Nexus workspace control surface.',
        'Summarize the current state, highlight design gaps, and propose the next UI slice to build.',
        'Focus on clarity, layout hierarchy, and missing interaction affordances.'
      ].join(' '),
      tone: 'accent',
    },
    {
      id: 'filesystem.read_file',
      title: 'Read a File',
      summary: 'Inspect source files before changing the design or wiring new controls.',
      access: ['Read-only filesystem', 'Workspace root constraint'],
      route: 'tool:filesystem.read_file',
      example: 'Read apps/web/src/render.ts and summarize the current layout structure.',
      promptTemplate: [
        'Use the file-reading capability if you need source context.',
        'Inspect the relevant file, extract the structural facts, and report only the important findings.'
      ].join(' '),
      tone: 'good',
    },
    {
      id: 'filesystem.list_directory',
      title: 'List a Directory',
      summary: 'Map the repository structure before selecting files or building a plan.',
      access: ['Read-only filesystem', 'Directory listing'],
      route: 'tool:filesystem.list_directory',
      example: 'List the apps/web/src directory and show the files that matter for the UI shell.',
      promptTemplate: [
        'Use the directory-listing capability to map the workspace.',
        'Return the smallest useful tree with a focus on UI, API, and capability layers.'
      ].join(' '),
      tone: 'warn',
    },
    {
      id: 'http.get',
      title: 'Fetch a URL',
      summary: 'Pull public documentation or reference material into a task context.',
      access: ['Network GET', 'Public HTTP targets'],
      route: 'tool:http.get',
      example: 'Fetch the public documentation URL and summarize any relevant control-surface notes.',
      promptTemplate: [
        'Use the HTTP capability when you need a public reference.',
        'Fetch the URL, summarize the useful parts, and ignore unrelated noise.'
      ].join(' '),
      tone: 'accent',
    },
  ],
};

export function getCapabilityById(catalog: CapabilityCatalog, capabilityId: string): CapabilityDescriptor | undefined {
  return catalog.capabilities.find((capability) => capability.id === capabilityId);
}
