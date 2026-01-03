using Backend.Core.Auth;
using Backend.Core.Services.Auth;
using Backend.Data;
using Backend.Infrastructure.Auth;
using Backend.Infrastructure.Storage;
using Backend.Pdf;
using DigitalLogbook.Api.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Ensure storage directories exist
var storageRoot = StoragePaths.GetStorageRoot(builder.Environment.ContentRootPath);
Directory.CreateDirectory(storageRoot);
Directory.CreateDirectory(StoragePaths.GetTemplatesDir(builder.Environment.ContentRootPath));
Directory.CreateDirectory(StoragePaths.GetImagesRoot(builder.Environment.ContentRootPath));
Directory.CreateDirectory(StoragePaths.GetExportsRoot(builder.Environment.ContentRootPath));

// Create an absolute db path under the repo-root storage folder
var dbPath = Path.Combine(storageRoot, "app.db");

// Use absolute path so dotnet-ef and runtime resolve the same location
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// JWT Configuration
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DigitalLogbook";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DigitalLogbookUsers";
var jwtExpirationHours = int.Parse(builder.Configuration["Jwt:ExpirationHours"] ?? "24");

// Authentication services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, JwtCurrentUserService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<ITokenService>(new TokenService(jwtSecretKey, jwtIssuer, jwtAudience, jwtExpirationHours));

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey))
        };
    });

builder.Services.AddAuthorization();

// PDF exporter
builder.Services.AddScoped<IPdfExporter, PdfExporter>();

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();

app.UseHttpsRedirection();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Health endpoint
app.MapGet("/health", () => Results.Ok("ok"))
    .WithName("Health");

// Auth endpoints
app.MapAuthEndpoints();

// Template endpoints
app.MapTemplateEndpoints();

// Draft endpoints
app.MapDraftEndpoints();

app.Run();

