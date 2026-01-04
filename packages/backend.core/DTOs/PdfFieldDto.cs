namespace Backend.Core.DTOs;

public record PdfFieldDto(
    string Name,
    string Type,
    string? Label,
    bool Required,
    string? DefaultValue,
    string[]? Options
);

public record PdfFieldsResponseDto(
    bool HasFormFields,
    PdfFieldDto[] Fields
);
