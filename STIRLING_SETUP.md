# Stirling-PDF Integration

## Setup Instructions

### 1. Start Docker Desktop
Make sure Docker Desktop is running on your Mac.

### 2. Start Stirling-PDF
```bash
cd /Users/saieshsingh/Desktop/projects/logbook-recorder
docker-compose up -d stirling-pdf
```

### 3. Verify Stirling is Running
```bash
curl http://localhost:8080/api/v1/info/status
```

You should see a JSON response indicating Stirling is running.

### 4. Restart Your Backend
The C# backend is already configured to use Stirling-PDF. Just restart it:
```bash
# Stop the current backend (Ctrl+C in the terminal)
# Then restart:
cd /Users/saieshsingh/Desktop/projects/logbook-recorder
dotnet run --project apps/api
```

### 5. Test the Integration
1. Go to http://localhost:5173 (your frontend)
2. Upload a fillable PDF (like W-8BEN)
3. The form fields should now be extracted by Stirling-PDF
4. Fill in the fields and download - Stirling will fill the PDF

## What Changed

### New Files
- `docker-compose.yml` - Runs Stirling-PDF in Docker
- `packages/backend.core/Services/IStirlingPdfService.cs` - Service interface
- `packages/backend.infrastructure/Services/StirlingPdfService.cs` - Service implementation

### Modified Files
- `apps/api/Program.cs` - Registered Stirling service
- `apps/api/appsettings.json` - Added Stirling URL config

### Next Steps (TODO)
- Update `TemplatesEndpoints.cs` to use Stirling for field extraction
- Update `PdfExporter.cs` to use Stirling for form filling

## Troubleshooting

### Docker not running
```
Error: Cannot connect to the Docker daemon
```
**Solution**: Start Docker Desktop application

### Stirling not responding
```bash
# Check if container is running
docker ps

# View logs
docker logs stirling-pdf

# Restart container
docker-compose restart stirling-pdf
```

### Port 8080 already in use
Edit `docker-compose.yml` and change the port:
```yaml
ports:
  - "8081:8080"  # Use 8081 instead
```

Then update `appsettings.json`:
```json
"StirlingPdfUrl": "http://localhost:8081"
```

## Stirling-PDF API Documentation

Full API docs: https://registry.scalar.com/@stirlingpdf/apis/stirling-pdf-processing-api/

Key endpoints we use:
- `POST /api/v1/form/extract` - Extract form fields
- `POST /api/v1/form/fill` - Fill PDF forms
