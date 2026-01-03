// Purpose: Authentication endpoints for user registration and login

using System.Text.RegularExpressions;
using Backend.Core.DTOs;
using Backend.Core.Models;
using Backend.Core.Services.Auth;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace DigitalLogbook.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // POST /api/auth/register
        endpoints.MapPost("/api/auth/register", async (RegisterRequest req, AppDbContext db, IPasswordHasher hasher, ITokenService tokenService) =>
        {
            // Validate email
            if (string.IsNullOrWhiteSpace(req.Email) || !IsValidEmail(req.Email))
                return Results.BadRequest(new { error = "Invalid email address." });

            // Validate password
            if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 6)
                return Results.BadRequest(new { error = "Password must be at least 6 characters long." });

            // Validate full name
            if (string.IsNullOrWhiteSpace(req.FullName))
                return Results.BadRequest(new { error = "Full name is required." });

            // Check if email already exists
            var existingUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
            if (existingUser is not null)
                return Results.BadRequest(new { error = "Email already registered." });

            // Hash password
            var passwordHash = hasher.HashPassword(req.Password);

            // Create user
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = req.Email.ToLower(),
                PasswordHash = passwordHash,
                FullName = req.FullName,
                CreatedAtUtc = DateTime.UtcNow,
                LastLoginUtc = DateTime.UtcNow
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            // Generate token
            var token = tokenService.GenerateToken(user.Id, user.Email);

            var response = new AuthResponse(user.Id, user.Email, user.FullName, token);
            return Results.Created($"/api/users/{user.Id}", response);
        })
        .WithName("Register")
        .Produces<AuthResponse>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);

        // POST /api/auth/login
        endpoints.MapPost("/api/auth/login", async (LoginRequest req, AppDbContext db, IPasswordHasher hasher, ITokenService tokenService) =>
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "Email and password are required." });

            // Find user
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
            if (user is null)
                return Results.Unauthorized();

            // Verify password
            if (!hasher.VerifyPassword(req.Password, user.PasswordHash))
                return Results.Unauthorized();

            // Update last login
            user.LastLoginUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Generate token
            var token = tokenService.GenerateToken(user.Id, user.Email);

            var response = new AuthResponse(user.Id, user.Email, user.FullName, token);
            return Results.Ok(response);
        })
        .WithName("Login")
        .Produces<AuthResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status400BadRequest);

        // GET /api/auth/me
        endpoints.MapGet("/api/auth/me", async (HttpContext context, AppDbContext db) =>
        {
            // Get user ID from claims
            var userIdClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null)
                return Results.NotFound();

            var dto = new UserDto(user.Id, user.Email, user.FullName, user.CreatedAtUtc);
            return Results.Ok(dto);
        })
        .WithName("GetCurrentUser")
        .RequireAuthorization()
        .Produces<UserDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static bool IsValidEmail(string email)
    {
        var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
        return emailRegex.IsMatch(email);
    }
}
