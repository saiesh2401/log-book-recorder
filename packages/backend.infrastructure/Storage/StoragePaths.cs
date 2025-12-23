// Purpose: Constants and paths for storage.

namespace Backend.Infrastructure.Storage;

public static class StoragePaths
{
	// Returns absolute path to repo-root storage folder
	public static string GetStorageRoot(string contentRootPath)
	{
		// contentRootPath is apps/api; storage is two levels up at repo root
		var storage = Path.GetFullPath(Path.Combine(contentRootPath, "..", "..", "storage"));
		return storage;
	}

	public static string GetTemplatesDir(string contentRootPath)
	{
		return Path.Combine(GetStorageRoot(contentRootPath), "templates");
	}

	public static string GetImagesRoot(string contentRootPath)
	{
		return Path.Combine(GetStorageRoot(contentRootPath), "images");
	}

	public static string GetUserImagesDir(string contentRootPath, string userId)
	{
		return Path.Combine(GetImagesRoot(contentRootPath), userId);
	}
}
