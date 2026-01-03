// Purpose: DTO for PDF templates

namespace Backend.Core.DTOs;

public record TemplateDto(
    Guid Id,
    string Title,
    string? CollegeName,
    string OriginalFileName,
    bool HasFormFields,
    DateTime CreatedAtUtc
);
