using System.Net.Http.Headers;
using System.Text.Json;
using Backend.Core.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.Services;

public class StirlingPdfService : IStirlingPdfService
{
    private readonly HttpClient _httpClient;
    private readonly string _stirlingBaseUrl;
    private readonly ILogger<StirlingPdfService> _logger;

    public StirlingPdfService(
        HttpClient httpClient, 
        IConfiguration configuration,
        ILogger<StirlingPdfService> logger)
    {
        _httpClient = httpClient;
        _stirlingBaseUrl = configuration["StirlingPdfUrl"] ?? "http://localhost:8080";
        _logger = logger;
    }

    public async Task<List<PdfFieldInfo>> ExtractFormFieldsAsync(byte[] pdfBytes)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            var fileContent = new ByteArrayContent(pdfBytes);
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
            content.Add(fileContent, "file", "document.pdf");

            var response = await _httpClient.PostAsync(
                $"{_stirlingBaseUrl}/api/v1/form/extract",
                content
            );

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Stirling PDF field extraction failed: {Error}", error);
                throw new HttpRequestException($"Failed to extract PDF fields: {response.StatusCode}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<StirlingFormExtractResponse>(json);
            
            return result?.Fields ?? new List<PdfFieldInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting PDF fields from Stirling");
            throw;
        }
    }

    public async Task<byte[]> FillPdfFormAsync(
        byte[] pdfBytes, 
        Dictionary<string, object> formData, 
        bool flatten = true)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            
            // Add PDF file
            var fileContent = new ByteArrayContent(pdfBytes);
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
            content.Add(fileContent, "file", "document.pdf");

            // Add form data as JSON
            var formDataJson = JsonSerializer.Serialize(formData);
            content.Add(new StringContent(formDataJson), "data");

            // Add flatten option
            content.Add(new StringContent(flatten.ToString().ToLower()), "flatten");

            var response = await _httpClient.PostAsync(
                $"{_stirlingBaseUrl}/api/v1/form/fill",
                content
            );

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Stirling PDF form fill failed: {Error}", error);
                throw new HttpRequestException($"Failed to fill PDF form: {response.StatusCode}");
            }

            return await response.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error filling PDF form with Stirling");
            throw;
        }
    }

    private class StirlingFormExtractResponse
    {
        public List<PdfFieldInfo>? Fields { get; set; }
    }
}
