import { ShadeProperties } from './ShadeConfig';

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../../package.json');
const shadeDir = path.join(__dirname, '../../shade');

const packageJson = require(packageJsonPath);

// Get all shade files
const shadeFiles: string[] = fs.readdirSync(shadeDir).filter((file: string) => file.endsWith('.json'));

// Update configuration contribution
const shadeProperties: ShadeProperties = {};
shadeFiles.forEach((file: string) => {
    const shadePath = `shade.shadeFiles.${file}`;
    shadeProperties[shadePath] = {
        type: 'boolean',
        default: true,
        description: `Enable shade messages from ${file}`,
    };
});

packageJson.contributes.configuration.properties = {
    ...packageJson.contributes.configuration.properties,
    'shade.enabled': {
        type: 'boolean',
        default: false,
        description: 'Enable shade messages',
    },
    ...shadeProperties,
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
