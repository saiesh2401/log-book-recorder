import apiClient from './client';

export interface Draft {
    id: string;
    templateId: string;
    version: number;
    createdAtUtc: string;
    updatedAtUtc: string;
}

export interface DraftDetail {
    id: string;
    templateId: string;
    version: number;
    formData: Record<string, any>;
    hasDrawing: boolean;
    createdAtUtc: string;
    updatedAtUtc: string;
}

export interface CreateDraftRequest {
    templateId: string;
    formData: Record<string, any>;
    drawingDataUrl?: string;
}

export async function createDraft(data: CreateDraftRequest): Promise<Draft> {
    const response = await apiClient.post<Draft>('/api/drafts', data);
    return response.data;
}

export async function getDrafts(templateId: string): Promise<Draft[]> {
    const response = await apiClient.get<Draft[]>(`/api/drafts?templateId=${templateId}`);
    return response.data;
}

export async function getDraft(id: string): Promise<DraftDetail> {
    const response = await apiClient.get<DraftDetail>(`/api/drafts/${id}`);
    return response.data;
}

export async function exportDraft(id: string): Promise<{ id: string; exportPath: string }> {
    const response = await apiClient.post(`/api/drafts/${id}/export`);
    return response.data;
}

export function getDraftExportUrl(id: string): string {
    return `http://localhost:5263/api/drafts/${id}/export/file`;
}
