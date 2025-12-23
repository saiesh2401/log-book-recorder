// Purpose: Minimal API endpoints for managing PDF drafts.

using System.Text.Json;
using Backend.Core.Auth;
using Backend.Core.DTOs;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace DigitalLogbook.Api.Endpoints;

public static class DraftsEndpoints
{
	public static IEndpointRouteBuilder MapDraftEndpoints(this IEndpointRouteBuilder endpoints)
	{
		// POST /api/drafts
		endpoints.MapPost("/api/drafts", async (CreateDraftRequest req, ICurrentUserService currentUser, AppDbContext db, IHostEnvironment env) =>
		{
			var userId = currentUser.GetUserId();

			var templateExists = await db.PdfTemplates.AsNoTracking().AnyAsync(t => t.Id == req.TemplateId);
			if (!templateExists)
				return Results.BadRequest(new { error = "Template does not exist." });

			var maxVersion = await db.PdfDrafts.AsNoTracking()
				.Where(d => d.UserId == userId && d.TemplateId == req.TemplateId)
				.MaxAsync(d => (int?)d.Version) ?? 0;
			var nextVersion = maxVersion + 1;

			var formDataJson = JsonSerializer.Serialize(req.FormData);

			var id = Guid.NewGuid();
			string? drawingPath = null;
			var now = DateTime.UtcNow;

			if (!string.IsNullOrWhiteSpace(req.DrawingDataUrl))
			{
				const string prefix = "data:image/png;base64,";
				var dataUrl = req.DrawingDataUrl!;
				var idx = dataUrl.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
				if (idx >= 0)
				{
					var b64 = dataUrl[(idx + prefix.Length)..];
					try
					{
						var bytes = Convert.FromBase64String(b64);
						var imagesRoot = Path.Combine(Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "storage")), "images", userId);
						Directory.CreateDirectory(imagesRoot);
						drawingPath = Path.Combine(imagesRoot, $"{id}.png");
						await File.WriteAllBytesAsync(drawingPath, bytes);
					}
					catch
					{
						return Results.BadRequest(new { error = "Invalid drawingDataUrl base64 payload." });
					}
				}
				else
				{
					return Results.BadRequest(new { error = "drawingDataUrl must be a data:image/png;base64 URL." });
				}
			}

			var entity = new Backend.Core.Models.PdfDraft
			{
				Id = id,
				TemplateId = req.TemplateId,
				UserId = userId,
				Version = nextVersion,
				FormDataJson = formDataJson,
				DrawingImagePath = drawingPath,
				Status = "Draft",
				CreatedAtUtc = now,
				UpdatedAtUtc = now,
			};

			db.PdfDrafts.Add(entity);
			await db.SaveChangesAsync();

			var dto = new DraftDto(entity.Id, entity.TemplateId, entity.Version, entity.CreatedAtUtc, entity.UpdatedAtUtc);
			return Results.Created($"/api/drafts/{entity.Id}", dto);
		})
		.WithName("CreateDraft")
		.Produces<DraftDto>(StatusCodes.Status201Created)
		.Produces(StatusCodes.Status400BadRequest);

		// GET /api/drafts?templateId={id}
		endpoints.MapGet("/api/drafts", async (Guid templateId, ICurrentUserService currentUser, AppDbContext db) =>
		{
			var userId = currentUser.GetUserId();
			var drafts = await db.PdfDrafts.AsNoTracking()
				.Where(d => d.UserId == userId && d.TemplateId == templateId)
				.OrderByDescending(d => d.Version)
				.Select(d => new DraftDto(d.Id, d.TemplateId, d.Version, d.CreatedAtUtc, d.UpdatedAtUtc))
				.ToListAsync();
			return Results.Ok(drafts);
		})
		.WithName("ListDrafts")
		.Produces<List<DraftDto>>(StatusCodes.Status200OK);

		// GET /api/drafts/{id}
		endpoints.MapGet("/api/drafts/{id:guid}", async (Guid id, ICurrentUserService currentUser, AppDbContext db) =>
		{
			var userId = currentUser.GetUserId();
			var draft = await db.PdfDrafts.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
			if (draft is null) return Results.NotFound();

			JsonElement formData;
			try
			{
				formData = JsonSerializer.Deserialize<JsonElement>(draft.FormDataJson);
			}
			catch
			{
				formData = JsonDocument.Parse("{}").RootElement.Clone();
			}

			var detail = new DraftDetailDto(
				draft.Id,
				draft.TemplateId,
				draft.Version,
				formData,
				HasDrawing: !string.IsNullOrWhiteSpace(draft.DrawingImagePath) && File.Exists(draft.DrawingImagePath),
				draft.CreatedAtUtc,
				draft.UpdatedAtUtc
			);
			return Results.Ok(detail);
		})
		.WithName("GetDraft")
		.Produces<DraftDetailDto>(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status404NotFound);

		// GET /api/drafts/{id}/drawing
		endpoints.MapGet("/api/drafts/{id:guid}/drawing", async (Guid id, ICurrentUserService currentUser, AppDbContext db) =>
		{
			var userId = currentUser.GetUserId();
			var draft = await db.PdfDrafts.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
			if (draft is null) return Results.NotFound();

			if (string.IsNullOrWhiteSpace(draft.DrawingImagePath) || !File.Exists(draft.DrawingImagePath))
				return Results.NotFound();

			var stream = new FileStream(draft.DrawingImagePath, FileMode.Open, FileAccess.Read, FileShare.Read);
			return Results.File(stream, "image/png", fileDownloadName: Path.GetFileName(draft.DrawingImagePath));
		})
		.WithName("GetDraftDrawing")
		.Produces(StatusCodes.Status200OK)
		.Produces(StatusCodes.Status404NotFound);

		return endpoints;
	}
}
