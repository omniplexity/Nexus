/**
 * Simple Model Router
 * 
 * Provides basic model routing capabilities for Phase 2.
 * Routes requests to appropriate providers based on role.
 */

import type {
  ModelRouter,
  ModelSelection,
  ModelRequest,
  ModelProvider,
  ModelRole,
  RouterStats,
  ModelInfo,
} from '../../core/contracts/model-provider';

/**
 * Simple router configuration
 */
export interface SimpleRouterConfig {
  defaultRole?: ModelRole;
  fallbackProviderId?: string;
}

/**
 * Simple model router implementation
 */
export class SimpleModelRouter implements ModelRouter {
  private providers: Map<string, ModelProvider> = new Map();
  private defaultProvider: ModelProvider | null = null;
  private config: SimpleRouterConfig;
  private stats: RouterStats = {
    totalRequests: 0,
    byRole: {
      fast: 0,
      reasoning: 0,
      specialized: 0,
    },
    byProvider: {},
    averageLatency: 0,
    totalTokens: 0,
    totalCost: 0,
  };
  private totalLatency: number = 0;

  constructor(config: SimpleRouterConfig = {}) {
    this.config = {
      defaultRole: ModelRole.FAST,
      ...config,
    };
  }

  /**
   * Select the best model for a request
   */
  async selectModel(request: ModelRequest): Promise<ModelSelection> {
    const role = request.config?.role || this.config.defaultRole || ModelRole.FAST;
    
    // Use the default provider for Phase 2
    // In Phase 3+, this will implement intelligent routing
    const provider = this.getProviderForRole(role);
    
    if (!provider) {
      throw new Error(`No provider available for role: ${role}`);
    }

    const models = await provider.listModels();
    const model = this.selectModelByRole(models, role);

    if (!model) {
      throw new Error(`No model available for role: ${role}`);
    }

    this.updateStats(role, provider.id, 0, 0);

    return {
      provider,
      model,
      reason: `Selected ${model.name} for ${role} tasks`,
    };
  }

  /**
   * Add a provider to the pool
   */
  addProvider(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
    
    // Set as default if no default exists
    if (!this.defaultProvider) {
      this.defaultProvider = provider;
    }
    
    this.stats.byProvider[provider.id] = 0;
  }

  /**
   * Remove a provider
   */
  removeProvider(providerId: string): void {
    this.providers.delete(providerId);
    
    // Update default if needed
    if (this.defaultProvider?.id === providerId) {
      this.defaultProvider = this.providers.values().next().value || null;
    }
    
    delete this.stats.byProvider[providerId];
  }

  /**
   * Get all providers
   */
  getProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): ModelProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get router statistics
   */
  getStats(): RouterStats {
    return { ...this.stats };
  }

  /**
   * Get the provider for a specific role
   */
  private getProviderForRole(role: ModelRole): ModelProvider | null {
    // For Phase 2, use default provider
    // In future, implement role-based provider selection
    return this.defaultProvider || this.providers.values().next().value || null;
  }

  /**
   * Select a model based on role
   */
  private selectModelByRole(models: ModelInfo[], role: ModelRole): ModelInfo | null {
    const filtered = models.filter((m) => m.role === role);
    
    if (filtered.length === 0) {
      // Fall back to any model
      return models[0] || null;
    }
    
    // For fast role, pick the first (usually cheapest/fastest)
    // For reasoning, pick the best available
    return filtered[0];
  }

  /**
   * Update router statistics
   */
  private updateStats(
    role: ModelRole,
    providerId: string,
    latency: number,
    tokens: number
  ): void {
    this.stats.totalRequests++;
    this.stats.byRole[role]++;
    this.stats.byProvider[providerId] = (this.stats.byProvider[providerId] || 0) + 1;
    this.stats.totalTokens += tokens;
    this.totalLatency += latency;
    this.stats.averageLatency = this.totalLatency / this.stats.totalRequests;
  }

  /**
   * Record a successful request
   */
  recordSuccess(role: ModelRole, providerId: string, latency: number, tokens: number): void {
    this.updateStats(role, providerId, latency, tokens);
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.stats.totalRequests++;
    // Could track failures separately in future
  }

  /**
   * Check if any provider is available
   */
  isAvailable(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }
}

/**
 * Create a router with a single provider
 */
export function createSingleProviderRouter(provider: ModelProvider): SimpleModelRouter {
  const router = new SimpleModelRouter();
  router.addProvider(provider);
  return router;
}
