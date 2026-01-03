// Purpose: Domain entity for a PDF draft.

namespace Backend.Core.Models;

public class PdfDraft
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public Guid UserId { get; set; }
    public int Version { get; set; }
    public string FormDataJson { get; set; } = string.Empty;
    public string? AnnotationsJson { get; set; }  // JSON array of text annotations for unfillable PDFs
    public string? DrawingImagePath { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    
    // Navigation property
    public PdfTemplate Template { get; set; } = null!;
}
