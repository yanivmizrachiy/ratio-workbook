from pathlib import Path

root = Path(__file__).resolve().parents[1]
chapter4 = root / 'src/components/worksheet/pages/Chapter4Pages.tsx'
s = chapter4.read_text(encoding='utf-8')
needle = "<FinalAnswer label=\"סעו-נא :\" unit='ק\"מ' />\n          <FinalAnswer label=\"הנוסעים :\" unit='ק\"מ' />"
if s.count(needle) != 2:
    raise SystemExit(f'Expected exactly two km answer pairs before disambiguation, got {s.count(needle)}')
# Keep the second pair semantically identical but syntactically distinct, so the main fixer
# can safely target only the first pair (the km-per-liter question).
second = s.rfind(needle)
equivalent = '<FinalAnswer label="סעו-נא :" unit={\'ק"מ\'} />\n          <FinalAnswer label="הנוסעים :" unit={\'ק"מ\'} />'
s = s[:second] + equivalent + s[second + len(needle):]
chapter4.write_text(s, encoding='utf-8')

code_path = root / 'scripts/apply-deep-math-audit-fixes.py'
code = code_path.read_text(encoding='utf-8')
old_assertion = "expect(renderKey('ch7-page-08')).toContain('2</span><span class=\"fraction-line\"></span><span class=\"fraction-den\">3');"
new_assertion = "expect(renderKey('ch7-page-08')).toContain('<span class=\"fraction\"><span class=\"frac-num\">2</span><span class=\"frac-line\"></span><span class=\"frac-den\">3</span></span>');"
if code.count(old_assertion) != 1:
    raise SystemExit(f'Expected one old fraction assertion, got {code.count(old_assertion)}')
code = code.replace(old_assertion, new_assertion)
exec(compile(code, 'scripts/apply-deep-math-audit-fixes.py', 'exec'), {'__name__': '__main__', '__file__': str(code_path)})
