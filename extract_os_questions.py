"""Mechanical extraction of supplied five-mark PDF question banks."""
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

if len(sys.argv) != 3:
    raise SystemExit('Usage: python extract_os_questions.py <processes-bank.pdf> <memory-bank.pdf>')
sources = [Path(filename) for filename in sys.argv[1:]]
groups = []
for source in sources:
    text = '\n'.join(page.extract_text() or '' for page in PdfReader(source).pages)
    pattern = r'(?m)(?:^|\n)\s*(?:Q)?(\d+)\.\s+(.*?)(?=\n\s*(?:Q)?\d+\.\s+|\n\s*Faculty note|\Z)'
    found = []
    for match in re.finditer(pattern, text, re.S):
        question = re.sub(r'\s+', ' ', match.group(2)).strip()
        question = question.replace('Operating Systems Question Bank | 5 Marks Each ', '')
        question = re.sub(r'\s+CO\d+\s*\|\s*BL\d+\s*\|\s*5 Marks.*$', '', question)
        question = re.sub(r'\s*\(5\s*marks\).*$', '', question, flags=re.I)
        found.append({'number': int(match.group(1)), 'question': question})
    if len(found) == 76 and found[6]['number'] == 31:
        found[5]['question'] += ' ' + found[6]['question']
        del found[6]
    groups.append(found)

with open('os-questions.js', 'w', encoding='utf8') as output:
    output.write('const osQuestions = ' + json.dumps(groups, ensure_ascii=False, indent=2) + ';\n')
print('Extracted question counts:', [len(group) for group in groups])
