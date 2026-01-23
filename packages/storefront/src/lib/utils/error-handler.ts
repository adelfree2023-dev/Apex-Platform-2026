export function handleError(error: unknown, defaultMessage: string): never {
    console.error(error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error(defaultMessage);
}
