using System.Text.Json;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas;

namespace Backend.Pdf;

// Extension methods for annotation rendering
public static class PdfExporterAnnotations
{
    public static void RenderAnnotations(PdfDocument pdfDoc, string annotationsJson)
    {
        try
        {
            Console.WriteLine($"[DEBUG] RenderAnnotations called with JSON: {annotationsJson}");
            
            var annotations = JsonSerializer.Deserialize<List<TextAnnotation>>(annotationsJson);
            if (annotations == null || annotations.Count == 0)
            {
                Console.WriteLine("[DEBUG] No annotations to render or deserialization failed");
                return;
            }

            Console.WriteLine($"[DEBUG] Rendering {annotations.Count} annotations");

            foreach (var annotation in annotations)
            {
                Console.WriteLine($"[DEBUG] Rendering annotation: '{annotation.Text}' at ({annotation.X}, {annotation.Y}) size {annotation.FontSize}");
                
                // Get the page (1-indexed in annotation, 1-indexed in iText7)
                var pageNumber = annotation.PageNumber > 0 ? annotation.PageNumber : 1;
                if (pageNumber > pdfDoc.GetNumberOfPages()) continue;

                var page = pdfDoc.GetPage(pageNumber);
                var pageSize = page.GetPageSize();

                // Convert normalized coordinates (0-1) to absolute coordinates
                var absoluteX = annotation.X * pageSize.GetWidth();
                var absoluteY = pageSize.GetHeight() - (annotation.Y * pageSize.GetHeight()); // Flip Y axis
                
                Console.WriteLine($"[DEBUG] Absolute position: ({absoluteX}, {absoluteY}) on page size ({pageSize.GetWidth()}, {pageSize.GetHeight()})");

                // Get font
                var font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.HELVETICA);
                if (annotation.FontFamily?.ToLower() == "times")
                {
                    font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.TIMES_ROMAN);
                }
                else if (annotation.FontFamily?.ToLower() == "courier")
                {
                    font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.COURIER);
                }

                // Apply bold/italic if needed
                if (annotation.Bold && annotation.Italic)
                {
                    if (annotation.FontFamily?.ToLower() == "times")
                        font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.TIMES_BOLDITALIC);
                    else
                        font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.HELVETICA_BOLDOBLIQUE);
                }
                else if (annotation.Bold)
                {
                    if (annotation.FontFamily?.ToLower() == "times")
                        font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.TIMES_BOLD);
                    else
                        font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.HELVETICA_BOLD);
                }
                else if (annotation.Italic)
                {
                    if (annotation.FontFamily?.ToLower() == "times")
                        font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.TIMES_ITALIC);
                    else
                        font = iText.Kernel.Font.PdfFontFactory.CreateFont(iText.IO.Font.Constants.StandardFonts.HELVETICA_OBLIQUE);
                }

                // Parse color (hex format like "#000000")
                var color = iText.Kernel.Colors.ColorConstants.BLACK;
                if (!string.IsNullOrWhiteSpace(annotation.Color) && annotation.Color.StartsWith("#") && annotation.Color.Length == 7)
                {
                    try
                    {
                        var r = Convert.ToInt32(annotation.Color.Substring(1, 2), 16) / 255f;
                        var g = Convert.ToInt32(annotation.Color.Substring(3, 2), 16) / 255f;
                        var b = Convert.ToInt32(annotation.Color.Substring(5, 2), 16) / 255f;
                        color = new iText.Kernel.Colors.DeviceRgb(r, g, b);
                    }
                    catch
                    {
                        // Use default black if color parsing fails
                    }
                }

                // Calculate text width to center it horizontally
                var textWidth = font.GetWidth(annotation.Text ?? "", annotation.FontSize);
                var adjustedX = absoluteX - (textWidth / 2); // Center horizontally
                var adjustedY = absoluteY; // Use exact Y position from click
                
                Console.WriteLine($"[DEBUG] Text width: {textWidth}, Adjusted position: ({adjustedX}, {adjustedY})");

                // Draw text on the page
                var canvas = new PdfCanvas(page);
                canvas.BeginText()
                      .SetFontAndSize(font, annotation.FontSize)
                      .SetColor(color, true)
                      .MoveText(adjustedX, adjustedY)
                      .ShowText(annotation.Text ?? "")
                      .EndText();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to render annotations: {ex.Message}");
            // Silently fail if annotations can't be rendered
        }
    }

    // Helper class for deserializing annotations
    public class TextAnnotation
    {
        [System.Text.Json.Serialization.JsonPropertyName("id")]
        public string? Id { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("text")]
        public string? Text { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("x")]
        public float X { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("y")]
        public float Y { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("fontSize")]
        public float FontSize { get; set; } = 12;
        
        [System.Text.Json.Serialization.JsonPropertyName("fontFamily")]
        public string? FontFamily { get; set; } = "Helvetica";
        
        [System.Text.Json.Serialization.JsonPropertyName("color")]
        public string? Color { get; set; } = "#000000";
        
        [System.Text.Json.Serialization.JsonPropertyName("bold")]
        public bool Bold { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("italic")]
        public bool Italic { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("pageNumber")]
        public int PageNumber { get; set; } = 1;
    }
}
