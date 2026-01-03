// Purpose: DTOs for user authentication

namespace Backend.Core.DTOs;

public record RegisterRequest(string Email, string Password, string FullName);

public record LoginRequest(string Email, string Password);

public record AuthResponse(Guid UserId, string Email, string FullName, string Token);

public record UserDto(Guid Id, string Email, string FullName, DateTime CreatedAtUtc);
