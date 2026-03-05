import type { YCloudTemplate, CreateTemplateParams } from '@/types/ycloud';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callYCloudFunction(action: string, params: any = {}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ycloud-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'YCloud API error');
  }

  return response.json();
}

export async function createTemplate(params: CreateTemplateParams): Promise<YCloudTemplate> {
  return callYCloudFunction('create', params);
}

export async function getTemplates(): Promise<YCloudTemplate[]> {
  const data = await callYCloudFunction('list');
  return data.templates || [];
}

export async function syncTemplateStatus(name: string, language: string): Promise<YCloudTemplate> {
  return callYCloudFunction('sync', { name, language });
}
