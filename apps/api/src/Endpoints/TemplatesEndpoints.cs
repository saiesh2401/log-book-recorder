// Purpose: Minimal API endpoints for uploading/listing templates.

using Backend.Core.DTOs;
using Backend.Data;
using Backend.Infrastructure.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace DigitalLogbook.Api.Endpoints;

public static class TemplatesEndpoints
{
	public static IEndpointRouteBuilder MapTemplateEndpoints(this IEndpointRouteBuilder endpoints)
	{
		// POST /api/templates - upload
		endpoints.MapPost("/api/templates", async (HttpRequest request, IHostEnvironment env, AppDbContext db) =>
		{
			var form = await request.ReadFormAsync();
			var file = form.Files.GetFile("file");
			var title = form["title"].FirstOrDefault();
			var collegeName = form["collegeName"].FirstOrDefault();

			if (file is null)
				return Results.BadRequest(new { error = "Missing file field 'file'." });

			if (file.Length <= 0)
				return Results.BadRequest(new { error = "File is empty." });

			const long MaxSize = 20 * 1024 * 1024; // 20 MB
			if (file.Length > MaxSize)
				return Results.BadRequest(new { error = "File exceeds 20 MB limit." });

			var ext = Path.GetExtension(file.FileName);
			var isPdfByExt = string.Equals(ext, ".pdf", StringComparison.OrdinalIgnoreCase);
			var isPdfByContentType = string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase);
			if (!isPdfByExt && !isPdfByContentType)
				return Results.BadRequest(new { error = "Only PDF files are allowed (.pdf or application/pdf)." });

			// Sniff first 4 bytes for "%PDF"
			await using var uploadStream = file.OpenReadStream();
			var header = new byte[4];
			var read = await uploadStream.ReadAsync(header, 0, 4);
			if (read != 4 || header[0] != (byte)'%' || header[1] != (byte)'P' || header[2] != (byte)'D' || header[3] != (byte)'F')
				return Results.BadRequest(new { error = "Uploaded file does not appear to be a PDF." });

			// Reset stream to copy full content
			uploadStream.Position = 0;

			var id = Guid.NewGuid();
			var storageRoot = StoragePaths.GetStorageRoot(env.ContentRootPath);
			var templatesDir = StoragePaths.GetTemplatesDir(env.ContentRootPath);
			Directory.CreateDirectory(templatesDir);

			var storedFilePath = Path.Combine(templatesDir, $"{id}.pdf");

			await using (var outStream = new FileStream(storedFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
			{
				await uploadStream.CopyToAsync(outStream);
			}

			// Detect if PDF has form fields using iText7
			bool hasFormFields = false;
			try
			{
				using var pdfReader = new iText.Kernel.Pdf.PdfReader(storedFilePath);
				using var pdfDoc = new iText.Kernel.Pdf.PdfDocument(pdfReader);
				var acroForm = iText.Forms.PdfAcroForm.GetAcroForm(pdfDoc, false);
				hasFormFields = acroForm?.GetAllFormFields()?.Count > 0;
			}
			catch
			{
				// If detection fails, assume no form fields
				hasFormFields = false;
			}

			var createdAtUtc = DateTime.UtcNow;
			var entity = new Backend.Core.Models.PdfTemplate
			{
				Id = id,
				Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title!,
				CollegeName = string.IsNullOrWhiteSpace(collegeName) ? null : collegeName,
				OriginalFileName = file.FileName,
				StoredPath = storedFilePath, // store absolute path for consistency
				HasFormFields = hasFormFields,
				CreatedAtUtc = createdAtUtc,
			};

			db.PdfTemplates.Add(entity);
			await db.SaveChangesAsync();

			var dto = new TemplateDto(entity.Id, entity.Title, entity.CollegeName, entity.OriginalFileName, entity.HasFormFields, entity.CreatedAtUtc);
			return Results.Created($"/api/templates/{entity.Id}", dto);
		})
		.WithName("UploadTemplate")
		.Accepts<IFormFile>("multipart/form-data")
		.Produces<TemplateDto>(StatusCodes.Status201Created)
		.Produces(StatusCodes.Status400BadRequest);

		// GET /api/templates - list
		endpoints.MapGet("/api/templates", async (AppDbContext db) =>
		{
			var list = await db.PdfTemplates
				.OrderByDescending(t => t.CreatedAtUtc)
				.Select(t => new TemplateDto(t.Id, t.Title, t.CollegeName, t.OriginalFileName, t.HasFormFields, t.CreatedAtUtc))
				.ToListAsync();
			return Results.Ok(list);
		})
		.WithName("ListTemplates")
		.Produces<List<TemplateDto>>(StatusCodes.Status200OK);

		// GET /api/templates/{id}/file - stream PDF (inline + range)
endpoints.MapGet("/api/templates/{id:guid}/file", async (Guid id, AppDbContext db, HttpContext ctx) =>
{
    var tpl = await db.PdfTemplates.FirstOrDefaultAsync(t => t.Id == id);
    if (tpl is null)
        return Results.NotFound(new { error = "Template not found." });

    if (string.IsNullOrWhiteSpace(tpl.StoredPath) || !File.Exists(tpl.StoredPath))
        return Results.NotFound(new { error = "Template file missing on disk." });

    var stream = new FileStream(tpl.StoredPath, FileMode.Open, FileAccess.Read, FileShare.Read);

    // Force inline preview (NOT attachment download)
    ctx.Response.Headers["Content-Disposition"] =
        $"inline; filename=\"{tpl.OriginalFileName}\"";

    // Enable range requests (helps browser PDF viewer)
    return Results.File(stream, "application/pdf", enableRangeProcessing: true);
})
.WithName("GetTemplateFile")
.Produces(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

		// DELETE /api/templates/{id} - delete template
		endpoints.MapDelete("/api/templates/{id:guid}", async (Guid id, AppDbContext db) =>
		{
			var template = await db.PdfTemplates.FirstOrDefaultAsync(t => t.Id == id);
			if (template is null) return Results.NotFound();

			// Delete the file from disk
			if (File.Exists(template.StoredPath))
			{
				try
				{
					File.Delete(template.StoredPath);
				}
				catch
				{
					// Continue even if file deletion fails
				}
			}

			// Delete from database
			db.PdfTemplates.Remove(template);
			await db.SaveChangesAsync();

			return Results.NoContent();
		})
		.WithName("DeleteTemplate")
		.Produces(StatusCodes.Status204NoContent)
		.Produces(StatusCodes.Status404NotFound);

		return endpoints;
	}
}
