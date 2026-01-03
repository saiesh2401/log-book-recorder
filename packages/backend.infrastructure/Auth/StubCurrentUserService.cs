using Backend.Core.Auth;

namespace Backend.Infrastructure.Auth;

public class StubCurrentUserService : ICurrentUserService
{
    public Guid GetUserId() => Guid.Parse("00000000-0000-0000-0000-000000000001");
}
