# Compara respuestas reales de la API con los esquemas de openapi.yaml (tipos, required, sin campos extra).
import json, sys, urllib.request, yaml
spec = yaml.safe_load(open(sys.argv[1]))
S = spec['components']['schemas']; R = spec['components']['responses']
B = 'http://localhost:3000/v1'
def resolve(s):
    while '$ref' in s:
        parts = s['$ref'].split('/')[1:]; s = spec
        for p in parts: s = s[p]
    return s
def check(val, sch, path):
    sch = resolve(sch)
    if val is None:
        assert sch.get('nullable'), f'{path}: null no permitido'; return
    t = sch.get('type')
    py = {'object': dict, 'array': list, 'string': str, 'integer': int, 'boolean': bool}
    if t: assert isinstance(val, py[t]) and not (t == 'integer' and isinstance(val, bool)), f'{path}: esperaba {t}, vino {val!r}'
    if 'enum' in sch: assert val in sch['enum'], f'{path}: {val!r} fuera de enum'
    if t == 'object':
        props = sch.get('properties', {})
        for r in sch.get('required', []): assert r in val, f'{path}: falta {r}'
        for k, v in val.items():
            assert k in props, f'{path}: campo no documentado {k}'; check(v, props[k], f'{path}.{k}')
    if t == 'array':
        for i, v in enumerate(val): check(v, sch['items'], f'{path}[{i}]')
def call(method, ruta, body=None, token=None):
    req = urllib.request.Request(B + ruta, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.load(r)
    except urllib.error.HTTPError as e: return e.code, json.load(e)
def schema_for(path, method, status):
    resp = spec['paths'][path][method]['responses'][str(status)]
    resp = resolve(resp)
    return resp['content']['application/json']['schema']
casos = []
st, login = call('POST', '/auth/login', {'usuario': 'empleado1', 'password': 'Refconect2026!'}); T = login['token']
casos += [('/auth/login', 'post', st, login)]
casos += [('/auth/login', 'post', *call('POST', '/auth/login', {'usuario': 'empleado1', 'password': 'x'}))]
casos += [('/auth/login', 'post', *call('POST', '/auth/login', {}))]
casos += [('/health', 'get', *call('GET', '/health'))]
casos += [('/auth/me', 'get', *call('GET', '/auth/me', token=T))]
casos += [('/auth/me', 'get', *call('GET', '/auth/me'))]
casos += [('/categorias', 'get', *call('GET', '/categorias', token=T))]
casos += [('/productos', 'get', *call('GET', '/productos?limite=50', token=T))]
casos += [('/productos', 'get', *call('GET', '/productos?limite=99', token=T))]
st, lista = call('GET', '/productos?limite=50', token=T)
for p in lista['datos']:
    casos += [('/productos/{id}', 'get', *call('GET', f"/productos/{p['id']}", token=T))]
casos += [('/productos/{id}', 'get', *call('GET', '/productos/99999', token=T))]
casos += [('/productos/{id}', 'get', *call('GET', '/productos/abc', token=T))]
for path, m, st, body in casos:
    check(body, schema_for(path, m, st), f'{m.upper()} {path} [{st}]')
print(f'OK: {len(casos)} respuestas reales coinciden con openapi.yaml')
