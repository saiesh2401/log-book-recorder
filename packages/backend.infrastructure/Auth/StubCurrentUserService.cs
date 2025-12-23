using Backend.Core.Auth;

namespace Backend.Infrastructure.Auth;

public class StubCurrentUserService : ICurrentUserService
{
    public string GetUserId() => "user-123";
}
