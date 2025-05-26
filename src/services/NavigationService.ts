import { routes, createRoute } from "../config/routes"

export interface NavigationOptions {
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
}

export class NavigationService {
  private router: any

  constructor(router: any) {
    this.router = router
  }

  /**
   * Navigate to a route
   */
  navigate(
    route: string,
    params: Record<string, string | number> = {},
    options: NavigationOptions = {},
  ): Promise<boolean> {
    const url = createRoute(route, params)

    return this.router.push(url, undefined, {
      scroll: options.scroll !== false,
      shallow: options.shallow === true,
    })
  }

  /**
   * Replace current route
   */
  replace(route: string, params: Record<string, string | number> = {}): Promise<boolean> {
    const url = createRoute(route, params)
    return this.router.replace(url)
  }

  /**
   * Navigate back
   */
  back(): void {
    this.router.back()
  }

  /**
   * Get current route
   */
  getCurrentRoute(): string {
    return this.router.pathname
  }

  /**
   * Get route parameters
   */
  getParams(): Record<string, string> {
    return this.router.query
  }

  /**
   * Create a file download URL
   */
  createDownloadUrl(fileId: string): string {
    return createRoute(routes.api.filesystem.download, { fileId })
  }

  /**
   * Create a file preview URL
   */
  createPreviewUrl(fileId: string): string {
    return createRoute(routes.preview, { fileId })
  }

  /**
   * Create a file content URL
   */
  createContentUrl(fileId: string): string {
    return createRoute(routes.api.filesystem.content, { fileId })
  }
}
