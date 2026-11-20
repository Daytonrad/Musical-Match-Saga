import fs from 'fs';
import path from 'path';

describe('jest coverage configuration', () => {
  const root = path.resolve(__dirname, '..');
  const configPath = path.join(root, 'jest.config.js');

  test('collects coverage from every src file, including untested ones', () => {
    const config = fs.readFileSync(configPath, 'utf8');
    expect(config).toMatch(/collectCoverageFrom\s*:\s*\[\s*['"]src\/\*\*\/\*\.js['"]\s*\]/);
  });
});
