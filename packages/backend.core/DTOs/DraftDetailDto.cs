using System.Text.Json;

namespace Backend.Core.DTOs;

public record DraftDetailDto(
    Guid Id,
    Guid TemplateId,
    int Version,
    JsonElement FormData,
    JsonElement? Annotations,
    bool HasDrawing,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
