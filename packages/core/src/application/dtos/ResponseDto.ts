/**
 * Standard response wrapper for use cases
 */
export interface IResponseDto<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
}

export class ResponseDto<T> implements IResponseDto<T> {
    public readonly success: boolean;
    public readonly data?: T;
    public readonly error?: string;
    public readonly timestamp: Date;

    private constructor(success: boolean, data?: T, error?: string) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.timestamp = new Date();
    }

    public static ok<T>(data: T): ResponseDto<T> {
        return new ResponseDto<T>(true, data);
    }

    public static fail<T>(error: string): ResponseDto<T> {
        return new ResponseDto<T>(false, undefined, error);
    }
}