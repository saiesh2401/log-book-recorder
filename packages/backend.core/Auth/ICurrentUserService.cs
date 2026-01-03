namespace Backend.Core.Auth;

public interface ICurrentUserService
{
    Guid GetUserId();
}
