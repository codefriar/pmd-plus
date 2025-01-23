export interface ShadeConfig {
    enabled: boolean;
    shadeFiles: ShadeFileConfig;
}

export interface ShadeFileConfig {
    [key: string]: boolean;
}

export interface PackageJsonConfigSnippet {
    type: string;
    default: boolean;
    description: string;
}

export interface ShadeProperties {
    [key: string]: PackageJsonConfigSnippet;
}

export interface Shade {
    severity: number;
    shade: string;
}
