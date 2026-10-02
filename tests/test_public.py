import copy
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from contract import loads, validate
from validate_public import APPROVED, check


class PublicBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        for name in APPROVED:
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
        self.schema=loads((ROOT/'public-state.schema.json').read_text())
        self.state=loads((ROOT/'assets/demo-state.js').read_text().removeprefix('window.DEMO_STATE = ').removesuffix(';\n'))
    def tearDown(self):self.tmp.cleanup()
    def test_clean_inventory_and_self_scan(self):self.assertEqual(check(self.root),[])
    def test_unknown_python_file_rejected(self):
        (self.root/'probe.py').write_text('unexpected=True');self.assertTrue(check(self.root))
    def test_binary_and_bad_utf8_rejected(self):
        for value in [b'\xff',b'\x00']:
            (self.root/'README.md').write_bytes(value);self.assertTrue(check(self.root))
    def test_symlink_rejected(self):
        (self.root/'link').symlink_to(self.root/'README.md');self.assertTrue(check(self.root))
    def test_credentials_detected_in_validator_itself(self):
        p=self.root/'scripts/validate_public.py';p.write_text(p.read_text()+'\n# '+'gh'+'p_'+'a'*30);self.assertTrue(check(self.root))
    def test_private_identifier_in_approved_file(self):
        p=self.root/'README.md';p.write_text('-work'+'-event-test-'+'20260926');self.assertTrue(check(self.root))
    def test_unknown_nested_fields(self):
        self.state['agents'][0]['prompt']='hidden'
        with self.assertRaises(ValueError):validate(self.state,self.schema)
    def test_free_text_cannot_be_public(self):
        for key in ['label','role','surface']:
            s=copy.deepcopy(self.state);s['agents'][0][key]='sensitive unapproved string'
            with self.assertRaises(ValueError):validate(s,self.schema)
    def test_count_types_and_bounds(self):
        for value in [True,-1,'1']:
            s=copy.deepcopy(self.state);s['queue_summary']['queued']=value
            with self.assertRaises(ValueError):validate(s,self.schema)
    def test_timestamp_requires_zone(self):
        self.state['generated_at']='2026-10-02T10:00:00'
        with self.assertRaises(ValueError):validate(self.state,self.schema)
    def test_duplicate_keys_and_nonfinite_rejected(self):
        for text in ['{"a":1,"a":2}','{"a":NaN}']:
            with self.assertRaises(ValueError):loads(text)
    def test_unsupported_schema_keyword_rejected(self):
        with self.assertRaises(ValueError):validate({}, {'anyOf':[]})
    def test_invalid_optional_snapshot_rejected(self):
        (self.root/'public-state.json').write_text('{"secret":"hidden"}');self.assertTrue(check(self.root))

    def test_nested_git_directory_is_not_an_exemption(self):
        p=self.root/'assets/.git/private.txt';p.parent.mkdir();p.write_text('unapproved')
        self.assertTrue(check(self.root))
    def test_encoded_secret_free_text_cannot_pass_public_contract(self):
        for field,value in [('role','c2VjcmV0'),('label','Worker 01\\u0000hidden'),('id','worker-01/../hidden'),('surface','https://unapproved.invalid')]:
            state=copy.deepcopy(self.state);state['agents'][0][field]=value
            with self.assertRaises(ValueError):validate(state,self.schema)
    def test_csp_and_unsafe_rendering_mutations_rejected(self):
        p=self.root/'index.html';original=p.read_text()
        for mutation in [original.replace("connect-src 'none'","connect-src 'self'"),original.replace('<body>','<body onload="unsafe()">'),original.replace('src="assets/app.js"','src="https://unapproved.invalid/app.js"')]:
            p.write_text(mutation);self.assertTrue(check(self.root))
        p.write_text(original);js=self.root/'assets/app.js';js.write_text(js.read_text()+'\nnode.innerHTML = state.label;');self.assertTrue(check(self.root))

if __name__=='__main__':unittest.main()
