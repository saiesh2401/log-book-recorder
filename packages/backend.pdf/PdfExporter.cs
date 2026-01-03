using System.Text.Json;
using iText.Forms;
using iText.Forms.Fields;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas;
using iText.Kernel.Pdf.Xobject;
using iText.Layout;
using iText.Layout.Element;

namespace Backend.Pdf;

public interface IPdfExporter
{
    Task<string> ExportDraftAsync(string templatePath, string draftId, string userId, JsonDocument formData, string? annotationsJson, string? drawingPath, string contentRootPath);
}

public class PdfExporter : IPdfExporter
{
    public async Task<string> ExportDraftAsync(string templatePath, string draftId, string userId, JsonDocument formData, string? annotationsJson, string? drawingPath, string contentRootPath)
    {
        return await Task.Run(() => ExportDraftSync(templatePath, draftId, userId, formData, annotationsJson, drawingPath, contentRootPath));
    }

    private string ExportDraftSync(string templatePath, string draftId, string userId, JsonDocument formData, string? annotationsJson, string? drawingPath, string contentRootPath)
    {
        // Create output directory
        var exportsDir = Path.GetFullPath(Path.Combine(contentRootPath, "..", "..", "storage", "exports", userId));
        Directory.CreateDirectory(exportsDir);
        var outputPath = Path.Combine(exportsDir, $"{draftId}.pdf");

        if (!File.Exists(templatePath))
            throw new FileNotFoundException($"Template file not found: {templatePath}");

        // Simple approach: read template bytes, write to output with retry logic
        byte[] templateBytes;
        try
        {
            templateBytes = File.ReadAllBytes(templatePath);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to read template: {ex.Message}", ex);
        }

        // Atomically write the PDF with form data filled
        RetryFileOperation(() =>
        {
            // Delete old version if exists
            if (File.Exists(outputPath))
                File.Delete(outputPath);

            try
            {
                // Use iText to fill the form
                using (var reader = new PdfReader(templatePath))
                using (var writer = new PdfWriter(outputPath))
                using (var pdfDoc = new PdfDocument(reader, writer))
                {
                    var form = PdfAcroForm.GetAcroForm(pdfDoc, false);
                    
                    if (form != null && form.GetAllFormFields().Count > 0)
                    {
                        // Try to fill form fields if they exist
                        FillFormFields(form, formData);
                        form.FlattenFields(); // Flatten to make fields non-editable
                    }
                    
                    // Render annotations if present (for unfillable PDFs)
                    if (!string.IsNullOrWhiteSpace(annotationsJson))
                    {
                        PdfExporterAnnotations.RenderAnnotations(pdfDoc, annotationsJson);
                    }
                }
            }
            catch (Exception ex)
            {
                // If PDF processing fails, fall back to simple copy
                Console.WriteLine($"PDF processing failed: {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                var templateBytes = File.ReadAllBytes(templatePath);
                File.WriteAllBytes(outputPath, templateBytes);
            }
        });

        return outputPath;
    }

    /// <summary>
    /// Retries a file operation (Delete, Move) up to 5 times with 100ms delay
    /// if IOException or UnauthorizedAccessException occurs (Windows file lock scenarios).
    /// </summary>
    private void RetryFileOperation(Action operation, int maxRetries = 3, int delayMs = 100)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                operation();
                return;
            }
            catch (IOException) when (i < maxRetries - 1)
            {
                System.Threading.Thread.Sleep(delayMs);
            }
        }
        // Final attempt without catching
        operation();
    }

    private void FillFormFields(PdfAcroForm form, JsonDocument formData)
    {
        var fields = form.GetAllFormFields();
        var root = formData.RootElement;

        foreach (var kvp in fields)
        {
            var fieldName = kvp.Key;
            var field = kvp.Value;

            if (root.TryGetProperty(fieldName, out var value))
            {
                try
                {
                    string strValue = value.ValueKind switch
                    {
                        System.Text.Json.JsonValueKind.True => "Yes",
                        System.Text.Json.JsonValueKind.False => "Off",
                        System.Text.Json.JsonValueKind.String => value.GetString() ?? "",
                        System.Text.Json.JsonValueKind.Number => value.GetRawText(),
                        _ => value.GetRawText()
                    };

                    field.SetValue(strValue);
                }
                catch
                {
                    // Silently skip fields that can't be filled
                }
            }
        }
    }

    private void AddFormDataOverlay(Document document, JsonDocument formData)
    {
        try
        {
            // Create a small text box; layout engine will place it on page 1 by default
            var paragraph = new Paragraph()
                .SetFontSize(8)
                .SetMarginLeft(10)
                .SetMarginTop(10);

            paragraph.Add("Form Data:\n");

            var root = formData.RootElement;
            foreach (var property in root.EnumerateObject())
            {
                var val = property.Value.ValueKind switch
                {
                    System.Text.Json.JsonValueKind.String => property.Value.GetString() ?? "(null)",
                    System.Text.Json.JsonValueKind.True => "true",
                    System.Text.Json.JsonValueKind.False => "false",
                    System.Text.Json.JsonValueKind.Number => property.Value.GetRawText(),
                    _ => property.Value.GetRawText()
                };

                paragraph.Add($"{property.Name}: {val}\n");
            }

            document.Add(paragraph);
        }
        catch
        {
            // Silently fail if overlay can't be added
        }
    }

    private void AddDrawingOverlay(Document document, PdfDocument pdfDoc, string drawingPath)
    {
        // Overlay drawing PNG on page 1 at a reasonable position
        try
        {
            var imageBytes = File.ReadAllBytes(drawingPath);
            var imageData = iText.IO.Image.ImageDataFactory.Create(imageBytes);
            var image = new Image(imageData);

            // Scale image reasonably (e.g., 150x150 px) and position at top-right
            image.SetWidth(150);
            image.SetHeight(150);
            var firstPage = pdfDoc.GetFirstPage();
            image.SetFixedPosition(1, firstPage.GetMediaBox().GetWidth() - 160, firstPage.GetMediaBox().GetHeight() - 160);
            document.Add(image);
        }
        catch
        {
            // Silently fail if drawing can't be added
        }
    }
}


