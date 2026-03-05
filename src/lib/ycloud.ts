import type { YCloudTemplate, CreateTemplateParams } from '@/types/ycloud';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callYCloudFunction(action: string, params: any = {}) {
  console.log('Calling YCloud function:', action, params);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ycloud-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  console.log('YCloud function response status:', response.status);
  
  if (!response.ok) {
    const error = await response.json();
    console.error('YCloud function error:', error);
    throw new Error(error.error || 'YCloud API error');
  }

  const data = await response.json();
  console.log('YCloud function response data:', data);
  return data;
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
