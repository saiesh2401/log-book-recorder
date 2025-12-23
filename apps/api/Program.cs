using Backend.Core.Auth;
using Backend.Data;
using Backend.Infrastructure.Auth;
using Backend.Infrastructure.Storage;
using DigitalLogbook.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Ensure storage directories exist
var storageRoot = StoragePaths.GetStorageRoot(builder.Environment.ContentRootPath);
Directory.CreateDirectory(storageRoot);
Directory.CreateDirectory(StoragePaths.GetTemplatesDir(builder.Environment.ContentRootPath));

// Create an absolute db path under the repo-root storage folder
var dbPath = Path.Combine(storageRoot, "app.db");

// Use absolute path so dotnet-ef and runtime resolve the same location
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Current user stub
builder.Services.AddScoped<ICurrentUserService, StubCurrentUserService>();

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Health endpoint
app.MapGet("/health", () => Results.Ok("ok"))
    .WithName("Health");

// Template endpoints
app.MapTemplateEndpoints();

// Draft endpoints
app.MapDraftEndpoints();

app.Run();

