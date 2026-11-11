import datetime as dt
import importlib.util
import json
from pathlib import Path
import socket
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import unittest
from unittest.mock import patch, MagicMock
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import security_audit_llm as a


def unit(text='danger();', ident='one'):
    return {'file': 'functions/a.js', 'start': 1, 'end': len(text.splitlines()), 'id': ident,
            'content': text, 'context': '', 'tokens': 30, 'source_sha256': a.digest(text)}


def finding(u=None):
    u = u or unit()
    return {'title': 'Unauthorized access', 'severity': 'high', 'category': 'authorization',
            'file': u['file'], 'start_line': 1, 'end_line': 1, 'evidence': u['content'].splitlines()[0],
            'impact': 'An unauthorized user can read another account.', 'recommendation': 'Validate ownership.'}


def analysis(findings=None):
    return {'findings': findings or [], 'limitations': 'Only the supplied code was examined.'}


def manifest(units=None):
    return a.seal_manifest({'version': 1, 'shards': [units or [unit()]], 'model': 'qwen3-4b',
                           'revision': 'test'})


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.exceptions = self.root / 'exceptions.json'
        a.atomic_json(self.exceptions, {'version': 1, 'exceptions': []})
        a.STOP = False

    def tearDown(self):
        self.temp.cleanup()

    def write_result(self, m, findings=None, index=0, filename='result.json'):
        rows = [dict(id=u['id'], file=u['file'], start=u['start'], end=u['end'], status='completed',
                     analysis=analysis(findings), duration_seconds=1) for u in m['shards'][index]]
        p = self.root / filename
        a.atomic_json(p, {'manifest_id':m['id'], 'model':m['model'], 'shard':index, 'results':rows})
        return p

    def test_discovery_excludes_dependencies_and_symlinks(self):
        for name in ['functions/a.js','functions/sub/b.ts','functions/node_modules/x.js', 'functions/dist/y.js']:
            p = self.root / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_text('x')
        (self.root / 'functions/link.js').symlink_to(self.root / 'functions/a.js')
        self.assertEqual(len(a.discover(self.root, 'cloud_functions')), 2)

    def test_missing_targets_fail(self):
        for target in a.TARGETS:
            with self.assertRaises(ValueError): a.discover(self.root, target)

    def test_token_split_covers_all_lines_with_original_positions(self):
        p = self.root / 'a.js'
        p.write_text('\n'.join('x' * 100 for _ in range(190)))
        units = a.split_source(p, self.root, lambda messages: len(messages[-1]['content']))
        coverage=set()
        for u in units:
            coverage.update(range(u['start'],u['end']+1))
            self.assertLessEqual(u['tokens'], 6736)
            self.assertEqual(u['content'], '\n'.join(p.read_text().splitlines()[u['start']-1:u['end']]))
        self.assertEqual(coverage, set(range(1,191)))
        self.assertGreater(len(units),1)
        self.assertLess(units[1]['start'], units[0]['end']+1)

    def test_oversized_single_line_fails(self):
        p=self.root/'a.js'; p.write_text('x'*10000)
        with self.assertRaises(ValueError): a.split_source(p,self.root,lambda m:len(m[-1]['content']))

    def test_distribution_no_empty_or_duplicate_shards(self):
        units=[dict(unit(ident=str(i)),tokens=1000-i*10) for i in range(43)]
        bins=a.distribute(units,20)
        self.assertEqual(len(bins),20)
        self.assertEqual(len({u['id'] for s in bins for u in s}),43)
        self.assertTrue(all(bins))
        self.assertEqual(a.distribute([unit()],20),[[unit()]])
        self.assertEqual(bins,a.distribute(units,20))
        with self.assertRaises(ValueError): a.distribute(units,21)

    def test_response_and_evidence_validation(self):
        a.validate_analysis(analysis([finding()]),unit())
        for change in [{'evidence':'invented'}, {'start_line':0}, {'severity':'ALTA'}, {'file':'other'},
                       {'end_line':2}, {'impact':''}, {'start_line':True}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                a.validate_analysis(analysis([dict(finding(),**change)]),unit())
        for bad in [{}, {'findings':[], 'limitations':None}, {'findings':'text','limitations':''}]:
            with self.assertRaises(ValueError):a.validate_analysis(bad,unit())

    def test_truncated_and_invalid_json_rejected(self):
        c=a.Client('http://127.0.0.1:8080','test')
        for stop,content in [('length','{}'),('stop','broken'),('stop','')]:
            with patch.object(c,'post',return_value={'choices':[{'finish_reason':stop,'message':{'content':content}}]}):
                with self.assertRaises((ValueError,json.JSONDecodeError)):c.analyze(unit())

    def test_invalid_response_is_preserved_for_diagnosis(self):
        c = a.Client('http://127.0.0.1:8080', 'test')
        response = {'choices':[{'finish_reason':'length','message':{'content':'partial'}}]}
        with patch.object(c,'post',return_value=response):
            with self.assertRaises(a.InvalidAnalysis) as caught:
                c.analyze(unit())
            self.assertEqual(caught.exception.response, response)

    def test_no_retry_for_timeout_or_http400(self):
        c=a.Client('http://127.0.0.1:8080','test')
        for error in [socket.timeout(),urllib.error.URLError(socket.timeout()),
                      urllib.error.HTTPError('x',400,'bad',{},None)]:
            with patch.object(a.urllib.request,'urlopen',side_effect=error) as request:
                with self.assertRaises(Exception):c.post('/x',{},retry=True)
                self.assertEqual(request.call_count,1)

    def test_only_one_transient_retry(self):
        c=a.Client('http://127.0.0.1:8080','test')
        for error in [urllib.error.URLError(ConnectionRefusedError()),
                      urllib.error.HTTPError('x',503,'loading',{},None),
                      urllib.error.HTTPError('x',429,'busy',{},None)]:
            with patch.object(a.urllib.request,'urlopen',side_effect=error) as request, patch.object(a.time,'sleep'):
                with self.assertRaises(Exception):c.post('/x',{},retry=True)
                self.assertEqual(request.call_count,2)

    def test_local_endpoint_only(self):
        for url in ['https://example.com','http://10.0.0.1','http://localhost.evil','http://u:p@localhost']:
            with self.assertRaises(ValueError):a.validate_llm_endpoint(url)
        for url in ['http://127.0.0.1:8080','http://localhost:8080','http://[::1]:8080']:
            a.validate_llm_endpoint(url)

    def test_incremental_persistence_and_three_failure_cutoff(self):
        units=[unit(ident=str(i)) for i in range(5)]
        for u in units:
            p=self.root/u['file'];p.parent.mkdir(exist_ok=True);p.write_text(u['content'])
        m=manifest(units); output=self.root/'result.json'
        class Client:
            calls=0
            def analyze(client,u,timeout):
                state=a.read_json(output)
                self.assertEqual(len(state['results']),5)
                client.calls+=1
                raise TimeoutError('test')
        c=Client()
        self.assertEqual(a.run_shard(m,0,c,output,root=self.root),2)
        rows=a.read_json(output)['results']
        self.assertEqual([r['status'] for r in rows],['failed']*3+['pending']*2)
        self.assertEqual(c.calls,3)
        self.assertTrue(output.with_suffix('.md').exists())

    def test_budget_and_interruption_preserve_pending(self):
        for budget,stop in [(100,False),(3000,True)]:
            a.STOP=stop
            p=self.root/'result.json'
            self.assertEqual(a.run_shard(manifest(),0,None,p,budget,root=self.root),2)
            self.assertEqual(a.read_json(p)['results'][0]['status'],'pending')

    def test_successful_shard_and_changed_source(self):
        u=unit(); p=self.root/u['file'];p.parent.mkdir();p.write_text(u['content'])
        class Client:
            def analyze(self,u,timeout):return analysis(),{'total_tokens':15}
        out=self.root/'result.json'
        self.assertEqual(a.run_shard(manifest(),0,Client(),out,root=self.root),0)
        p.write_text('changed')
        self.assertEqual(a.run_shard(manifest(),0,Client(),out,root=self.root),2)

    def test_aggregate_severity_and_valid_exception(self):
        m=manifest(); f=finding(); p=self.write_result(m,[f])
        data,code=a.aggregate(m,[p],self.exceptions)
        self.assertEqual(code,3)
        exception={'fingerprint':a.fingerprint(f),'justification':'Reviewed test case', 'expires':'2099-01-01'}
        a.atomic_json(self.exceptions,{'version':1,'exceptions':[exception]})
        data,code=a.aggregate(m,[p],self.exceptions)
        self.assertEqual(code,0)
        self.assertTrue(data['findings'][0]['suppressed'])
        exception['expires']='2000-01-01'
        a.atomic_json(self.exceptions,{'version':1,'exceptions':[exception]})
        self.assertEqual(a.aggregate(m,[p],self.exceptions)[1],3)

    def test_aggregate_missing_duplicate_and_mismatched_artifacts_fail(self):
        m=manifest(); p=self.write_result(m)
        self.assertEqual(a.aggregate(m,[],self.exceptions)[1],2)
        self.assertEqual(a.aggregate(m,[p,p],self.exceptions)[1],2)
        data=a.read_json(p);data['manifest_id']='wrong';a.atomic_json(p,data)
        self.assertEqual(a.aggregate(m,[p],self.exceptions)[1],2)

    def test_aggregate_validates_findings_again(self):
        m=manifest();p=self.write_result(m,[dict(finding(),evidence='not in source')])
        self.assertEqual(a.aggregate(m,[p],self.exceptions)[1],2)

    def test_overlapping_findings_deduplicated_with_maximum_severity(self):
        units=[unit(ident='a'),unit(ident='b')];m=manifest(units)
        p=self.write_result(m,[finding()])
        data,code=a.aggregate(m,[p],self.exceptions)
        self.assertEqual(code,3);self.assertEqual(len(data['findings']),1)

    def test_fingerprint_preserves_string_literal_whitespace(self):
        first = dict(finding(), evidence="allow('a b');")
        second = dict(finding(), evidence="allow('a  b');")
        self.assertNotEqual(a.fingerprint(first), a.fingerprint(second))

    def test_manifest_tampering_detected(self):
        m=manifest();m['shards'][0][0]['content']='other'
        with self.assertRaises(ValueError):a.verify_manifest(m)

    def test_benchmark_fixtures_balanced(self):
        cases=a.read_json(ROOT/'tests/security_audit/benchmark_cases.json')
        self.assertEqual(len(cases),24)
        self.assertEqual(sum(c['vulnerable'] for c in cases),12)
        self.assertEqual(len({c['id'] for c in cases}),24)

    def test_model_selection_thresholds_and_tiebreak(self):
        def score(model,duration,hits=10,passed=True):
            return {'model':model,'duration_seconds':duration,'rounds':[{'hits':hits,'false_high':0}]*2,'passed':passed}
        self.assertEqual(a.choose_model([score('4b',100),score('7b',109,11)]),'7b')
        self.assertEqual(a.choose_model([score('4b',100),score('7b',111,12)]),'4b')
        with self.assertRaises(ValueError):a.choose_model([score('4b',100,passed=False)])

    def test_benchmark_does_not_count_wrong_category(self):
        u=dict(unit(),vulnerable=True,expected_category='injection',repeat=0)
        m=manifest([u])
        result={'results':[{'id':u['id'],'status':'completed','analysis':analysis([finding()])}],
                'duration_seconds':1,'errors':[]}
        score=a.score_benchmark(m,result)
        self.assertEqual(score['rounds'][0]['hits'],0)
        self.assertFalse(score['passed'])

    def test_malformed_exception_rejected(self):
        a.atomic_json(self.exceptions,{'version':1,'exceptions':[{'justification':''}]})
        with self.assertRaises(ValueError):a.load_exceptions(self.exceptions)


class RuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('audit_runtime', ROOT/'scripts/security_audit/runtime.py')
        cls.runtime = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.runtime)

    def test_runner_validation_and_no_unapproved_model(self):
        runtime = self.runtime
        config = {'selected_model':None, 'models':{'qwen3-4b':{}}, 'llama_revision':'fixed'}
        for args in [['describe','--max-runners','21'], ['describe','--mode','auditoria']]:
            with patch.object(sys,'argv',['runtime.py']+args), patch.object(a,'read_json',return_value=config):
                with self.assertRaises(ValueError):runtime.main()

    def test_download_checks_checksum_before_publication(self):
        import io
        runtime = self.runtime
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            config = {'models':{'test':{'repo':'owner/model','revision':'fixed','file':'model.gguf',
                                      'sha256':a.digest('expected')}}}
            with patch.object(runtime,'CACHE',root), patch.object(runtime.urllib.request,'urlopen',return_value=io.BytesIO(b'bad')), patch.object(runtime.time,'sleep'):
                with self.assertRaises(Exception):runtime.provision_model(config,'test')
                self.assertFalse((root/'models/model.gguf').exists())
                self.assertFalse((root/'models/model.download').exists())

    def test_packaged_server_uses_local_shared_libraries(self):
        runtime = self.runtime
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'server/bin').mkdir(parents=True)
            (root/'server/revision').write_text('fixed')
            (root/'models').mkdir()
            (root/'models/model.gguf').write_text('weights')
            config = {'llama_revision':'fixed','models':{'test':{
                'file':'model.gguf','sha256':a.digest('weights')}}}
            process = MagicMock();process.poll.return_value = None
            response = MagicMock();response.__enter__.return_value.status = 200
            with patch.object(runtime,'CACHE',root), patch.object(runtime.subprocess,'Popen',return_value=process) as spawn, patch.object(runtime.urllib.request,'urlopen',return_value=response):
                runtime.start(config,'test',root/'output')
                self.assertTrue(spawn.call_args.kwargs['env']['LD_LIBRARY_PATH'].startswith(str(root/'server/bin')))

    def test_checksum_valid_cache_avoids_network(self):
        runtime = self.runtime
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);(root/'models').mkdir();(root/'models/model.gguf').write_text('expected')
            config = {'models':{'test':{'file':'model.gguf','sha256':a.digest('expected')}}}
            with patch.object(runtime,'CACHE',root), patch.object(runtime.urllib.request,'urlopen') as network:
                runtime.provision_model(config,'test')
                network.assert_not_called()


class HttpIntegrationTests(unittest.TestCase):
    def test_template_tokenization_and_structured_completion(self):
        requests = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_POST(self):
                data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                requests.append((self.path, data))
                if self.path == '/apply-template':
                    result = {'prompt': 'chat-template'}
                elif self.path == '/tokenize':
                    result = {'tokens': [1, 2, 3]}
                else:
                    result = {'choices': [{'finish_reason': 'stop', 'message': {
                        'content': json.dumps(analysis())}}], 'usage': {'total_tokens': 10}}
                body = json.dumps(result).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(body)
        with ThreadingHTTPServer(('127.0.0.1', 0), Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                client = a.Client(f'http://127.0.0.1:{server.server_port}', 'qwen3-4b')
                self.assertEqual(client.count(a.messages(unit())), 3)
                result, usage = client.analyze(unit())
                self.assertEqual(result['findings'], [])
                self.assertEqual(usage['total_tokens'], 10)
                self.assertEqual(requests[1][1]['content'], 'chat-template')
                self.assertEqual(requests[2][1]['max_tokens'], 1200)
                self.assertIn('json_schema', requests[2][1]['response_format'])
            finally:
                server.shutdown()
                thread.join()


if __name__ == '__main__':
    unittest.main()
