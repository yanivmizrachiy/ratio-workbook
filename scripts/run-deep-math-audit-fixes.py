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

code = (root / 'scripts/apply-deep-math-audit-fixes.py').read_text(encoding='utf-8')
exec(compile(code, 'scripts/apply-deep-math-audit-fixes.py', 'exec'), {'__name__': '__main__', '__file__': str(root / 'scripts/apply-deep-math-audit-fixes.py')})
