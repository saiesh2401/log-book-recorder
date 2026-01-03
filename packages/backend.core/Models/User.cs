// Purpose: Domain entity representing a user.

namespace Backend.Core.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLoginUtc { get; set; }
    
    // Navigation properties
    public ICollection<PdfDraft> Drafts { get; set; } = new List<PdfDraft>();
}
