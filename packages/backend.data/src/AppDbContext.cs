using Backend.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<PdfTemplate> PdfTemplates => Set<PdfTemplate>();
    public DbSet<PdfDraft> PdfDrafts => Set<PdfDraft>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.LastLoginUtc).IsRequired(false);
            
            // Unique email constraint
            entity.HasIndex(e => e.Email).IsUnique();
            
            // One user has many drafts
            entity.HasMany(e => e.Drafts)
                .WithOne()
                .HasForeignKey(e => e.UserId)
                .HasPrincipalKey(e => e.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure PdfTemplate
        modelBuilder.Entity<PdfTemplate>(entity =>
        {
            entity.ToTable("PdfTemplates");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.CollegeName).IsRequired(false);
            entity.Property(e => e.Title).IsRequired();
            entity.Property(e => e.OriginalFileName).IsRequired();
            entity.Property(e => e.StoredPath).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            
            // One template has many drafts
            entity.HasMany(e => e.Drafts)
                .WithOne(e => e.Template)
                .HasForeignKey(e => e.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure PdfDraft
        modelBuilder.Entity<PdfDraft>(entity =>
        {
            entity.ToTable("PdfDrafts");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.TemplateId).IsRequired();
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Version).IsRequired();
            entity.Property(e => e.FormDataJson).IsRequired();
            entity.Property(e => e.DrawingImagePath).IsRequired(false);
            entity.Property(e => e.Status).IsRequired().HasDefaultValue("Draft");
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.UpdatedAtUtc).IsRequired();
            
            // Index on (UserId, TemplateId) for fast lookups
            entity.HasIndex(e => new { e.UserId, e.TemplateId });
            
            // Index on TemplateId
            entity.HasIndex(e => e.TemplateId);
            
            // Unique constraint on (UserId, TemplateId, Version)
            entity.HasIndex(e => new { e.UserId, e.TemplateId, e.Version })
                .IsUnique();
        });
    }
}
