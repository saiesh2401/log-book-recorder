namespace Backend.Core.DTOs;

public record DraftDto(
    Guid Id,
    Guid TemplateId,
    int Version,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
