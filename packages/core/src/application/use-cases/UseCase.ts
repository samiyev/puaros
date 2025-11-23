/**
 * Base interface for all use cases
 */
export interface IUseCase<TRequest, TResponse> {
    execute(request: TRequest): Promise<TResponse>;
}

/**
 * Abstract base class for use cases
 */
export abstract class UseCase<TRequest, TResponse> implements IUseCase<TRequest, TResponse> {
    public abstract execute(request: TRequest): Promise<TResponse>;
}