"""End-to-end API smoke test against a locally built Next.js server."""
import io, json, os, secrets, signal, subprocess, tempfile, time, urllib.error, urllib.request, zipfile
from http.cookiejar import CookieJar

ROOT = os.path.dirname(os.path.dirname(__file__))
BASE = 'http://127.0.0.1:3409'

def call(opener, route, method='GET', data=None, content_type='application/json', expected=200):
    body = None if data is None else (json.dumps(data).encode() if content_type == 'application/json' else data)
    request = urllib.request.Request(BASE + route, data=body, method=method, headers={'Content-Type':content_type, 'Origin':BASE} if method != 'GET' else {})
    try:
        response = opener.open(request, timeout=15)
        status, content = response.status, response.read()
    except urllib.error.HTTPError as exc:
        status, content = exc.code, exc.read()
    assert status == expected, f'{method} {route}: expected {expected}, got {status}: {content[:300]!r}'
    return json.loads(content) if content_type != 'application/octet-stream' and content else content

def multipart(fields, filename, content, mime):
    boundary = 'tcia' + secrets.token_hex(10)
    body = b''
    for name, value in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + f'\r\n--{boundary}--\r\n'.encode()
    return body, f'multipart/form-data; boundary={boundary}'

with tempfile.TemporaryDirectory(prefix='tcia-smoke-') as data_dir:
    env = dict(os.environ, DATA_DIR=data_dir, OWNER_EMAIL='owner@example.test', OWNER_PASSWORD=secrets.token_urlsafe(28))
    subprocess.run(['npm','run','owner:create'],cwd=ROOT,env=env,check=True,stdout=subprocess.DEVNULL)
    server = subprocess.Popen(['npm','run','start','--','-p','3409'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,start_new_session=True)
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen(BASE+'/login',timeout=1).read()
                break
            except Exception:
                if server.poll() is not None: raise RuntimeError(server.stderr.read().decode()[-1000:])
                time.sleep(.3)
        else: raise RuntimeError('Server did not start')
        guest = urllib.request.build_opener()
        user = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
        call(guest,'/api/resources',expected=401)
        call(user,'/api/login','POST',{'email':env['OWNER_EMAIL'],'password':env['OWNER_PASSWORD']})
        assert b'Complementos' in user.open(BASE+'/studio',timeout=15).read()
        item = call(user,'/api/resources','POST',{'kind':'prompt','title':'Prueba','description':'Inicial','content':'# Uno'},expected=201)
        rid = item['id']
        updated = call(user,f'/api/resources/{rid}','PATCH',{'content':'# Dos'})
        assert updated['version']==2
        versions = call(user,f'/api/resources/{rid}/versions')
        assert len(versions)==2
        restored = call(user,f'/api/resources/{rid}/restore','POST',{'version':1})
        assert restored['content']=='# Uno' and restored['version']==3
        project = call(user,'/api/projects','POST',{'title':'Proyecto','resourceIds':[rid]},expected=201)
        assert rid in call(user,'/api/projects')[0]['resourceIds']
        form,ctype=multipart({'resourceId':str(rid)},'note.txt',b'private content','text/plain')
        form=form.replace(b'name="file";',b'name="files";')
        uploaded=call(user,'/api/files','POST',form,ctype,201)
        fid=uploaded[0]['id']
        call(guest,f'/api/files/{fid}',expected=401)
        assert call(user,f'/api/files/{fid}',content_type='application/octet-stream')==b'private content'
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w') as zipped:
            zipped.writestr('my-skill/SKILL.md','# Mi skill\nContenido')
            zipped.writestr('my-skill/assets/readme.txt','Preserved')
        form,ctype=multipart({},'skill.zip',archive.getvalue(),'application/zip')
        imported=call(user,'/api/skills/import','POST',form,ctype,201)
        assert imported['kind']=='skill' and imported['title']=='Mi skill'
        call(guest,'/api/complements',expected=401)
        complement=call(user,'/api/complements','POST',{'title':'Pack de prueba','description':'Dos skills públicas','skillIds':['skill-uno','skill-dos']},expected=201)
        complement_id=complement['id']
        assert complement['publishedAt'] is None
        assert len(call(user,'/api/complements'))==1
        changed=call(user,f'/api/complements/{complement_id}','PATCH',{'title':'Pack actualizado','description':'Dos skills públicas','skillIds':['skill-uno','skill-dos']})
        assert changed['title']=='Pack actualizado'
        call(user,f'/api/complements/{complement_id}/publish','POST',{},expected=503)
        call(user,f'/api/complements/{complement_id}','DELETE')
        call(user,f'/api/projects/{project["id"]}','DELETE')
        call(user,f'/api/resources/{rid}','DELETE')
        call(user,'/api/logout','POST',{})
        call(user,'/api/resources',expected=401)
        print('Smoke passed: auth, private access, CRUD, versions, projects, files, skill ZIP, complement drafts, logout')
    finally:
        os.killpg(server.pid,signal.SIGTERM)
        server.wait(timeout=10)
