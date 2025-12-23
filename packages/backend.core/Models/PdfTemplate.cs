// Purpose: Domain entity for a PDF template.

namespace Backend.Core.Models;

public class PdfTemplate
{
    public Guid Id { get; set; }
    public string? CollegeName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredPath { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    
    // Navigation property
    public ICollection<PdfDraft> Drafts { get; set; } = new List<PdfDraft>();
}
