namespace Backend.Core.Services;

public record PdfFieldInfo(
    string Name,
    string DisplayLabel,
    string Type,
    string? Value,
    List<string>? Options,
    bool Required,
    int PageIndex,
    bool MultiSelect,
    string? Tooltip,
    int PageOrder
);

public interface IStirlingPdfService
{
    Task<List<PdfFieldInfo>> ExtractFormFieldsAsync(byte[] pdfBytes);
    Task<byte[]> FillPdfFormAsync(byte[] pdfBytes, Dictionary<string, object> formData, bool flatten = true);
}
