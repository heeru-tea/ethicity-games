from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent.parent
p=json.loads((root/'provenance.json').read_text(encoding='utf-8'))
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def matches(path,sha):
    b=path.read_bytes()
    return sha in (blob(b),blob(b.replace(b'\r\n',b'\n')))
missing=[]
for f in p['commonFiles']:
    if not matches(root/'common'/f['path'],f['sha']):missing.append(f['path'])
assert not missing,missing
assert matches(root/'scenario.json',p['scenarioBlobSha']),'Scenario differs from privacy-v4'
print('PASS: all '+str(len(p['commonFiles']))+' common files match the GitHub source; v4 scenario is unchanged.')
