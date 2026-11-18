import fs from 'fs';
import path from 'path';

describe('index.html modulepreload links', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const modules = fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js'));

  test.each(modules)('src/%s has a modulepreload link', (file) => {
    expect(html).toContain(`<link rel="modulepreload" href="src/${file}">`);
  });
});
