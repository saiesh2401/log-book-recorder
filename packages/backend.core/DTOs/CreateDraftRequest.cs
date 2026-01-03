// Purpose: DTO for creating a draft.
using System.Text.Json;

namespace Backend.Core.DTOs;

public record CreateDraftRequest(
	Guid TemplateId,
	JsonElement FormData,
	JsonElement? Annotations,
	string? DrawingDataUrl
);
