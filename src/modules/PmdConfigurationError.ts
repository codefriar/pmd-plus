export class PmdConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PmdConfigurationError';
    }
}
