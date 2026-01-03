import api from './client';

export interface Template {
  id: string;
  title: string;
  collegeName: string | null;
  originalFileName: string;
  hasFormFields: boolean;
  createdAtUtc: string;
}

export async function getTemplates(): Promise<Template[]> {
  const response = await api.get<Template[]>('/api/templates');
  return response.data;
}

export async function uploadTemplate(
  file: File,
  title: string,
  collegeName: string
): Promise<Template> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('collegeName', collegeName);

  const response = await api.post<Template>('/api/templates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export function getTemplateFileUrl(templateId: string): string {
  return `http://localhost:5263/api/templates/${templateId}/file`;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await api.delete(`/api/templates/${templateId}`);
}
