import fs from 'fs';
import path from 'path';

describe('objective counter styles', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '..', 'styles', 'game.css'), 'utf8');

  test('font size and padding apply to the counters, not the instrument inside them', () => {
    // A descendant selector would also match <span class="objective-symbol">
    // and apply the font size twice, so finished instruments would look smaller or larger.
    expect(css).not.toMatch(/#objective-counters\s+span\b/);
    expect(css.match(/#objective-counters > span\s*\{/g)).toHaveLength(2);
  });

  test('a finished instrument does not need its own padding reset', () => {
    const rule = css.match(/#objective-counters \.done \.objective-symbol\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).not.toMatch(/padding/);
  });
});
