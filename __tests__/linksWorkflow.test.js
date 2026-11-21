import fs from 'fs';
import path from 'path';

describe('link check workflow', () => {
  const workflow = fs.readFileSync(
    path.resolve(__dirname, '../.github/workflows/links.yml'),
    'utf8',
  );

  test('runs for documentation, HTML, and workflow changes, and on a schedule', () => {
    expect(workflow).toMatch(/pull_request:[\s\S]*- '\*\*\/\*\.md'[\s\S]*- '\*\*\/\*\.html'[\s\S]*- '\.github\/workflows\/links\.yml'/);
    expect(workflow).toMatch(/schedule:\s*\n\s*- cron: '0 6 \* \* 1'/);
  });

  test('checks all pages with the pinned Docker image', () => {
    expect(workflow).toMatch(/uses: actions\/checkout@v7/);
    expect(workflow).not.toMatch(/uses: lycheeverse\/lychee-action@/);
    expect(workflow).toMatch(/lycheeverse\/lychee:0\.24\.2@sha256:[a-f0-9]{64}/);
    expect(workflow).toMatch(/--no-progress --exclude-loopback README\.md CONTRIBUTING\.md CODE_OF_CONDUCT\.md index\.html privacy\.html accessibility\.html/);
  });
});
