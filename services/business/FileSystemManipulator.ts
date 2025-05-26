import type { IFileSystemManipulator, IFileSystemProvider, ICacheService } from "../../types/interfaces"

export class FileSystemManipulator implements IFileSystemManipulator {
  constructor(
    private provider: IFileSystemProvider,
    private cache: ICacheService,
  ) {}

  async copyEntry(source: string, destination: string): Promise<void> {
    const stats = await this.provider.getStats(source)

    if (stats.isDirectory) {
      await this.provider.createDirectory(destination)
      const entries = await this.provider.readDirectory(source)

      for (const entry of entries) {
        const newSource = `${source}/${entry.name}`
        const newDestination = `${destination}/${entry.name}`
        await this.copyEntry(newSource, newDestination)
      }
    } else {
      const content = await this.provider.readFile(source)
      await this.provider.writeFile(destination, content)
    }

    this.invalidateCache(source)
    this.invalidateCache(destination)
  }

  async moveEntry(source: string, destination: string): Promise<void> {
    await this.copyEntry(source, destination)
    await this.provider.deleteEntry(source)

    this.invalidateCache(source)
    this.invalidateCache(destination)
  }

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    await this.moveEntry(oldPath, newPath)
  }

  async duplicateEntry(path: string): Promise<string> {
    const pathParts = path.split("/")
    const name = pathParts[pathParts.length - 1]
    const directory = pathParts.slice(0, -1).join("/")

    let counter = 1
    let newPath: string

    do {
      const extension = name.includes(".") ? name.split(".").pop() : ""
      const baseName = name.includes(".") ? name.substring(0, name.lastIndexOf(".")) : name
      const newName = extension ? `${baseName}_copy${counter}.${extension}` : `${baseName}_copy${counter}`
      newPath = `${directory}/${newName}`
      counter++
    } while (await this.pathExists(newPath))

    await this.copyEntry(path, newPath)
    return newPath
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await this.provider.getStats(path)
      return true
    } catch {
      return false
    }
  }

  private invalidateCache(path: string): void {
    // Invalidate all cache entries related to this path
    const stats = this.cache.getStats()
    // This is a simplified cache invalidation - in a real implementation,
    // you'd want to track cache keys more systematically
    this.cache.clear()
  }
}
