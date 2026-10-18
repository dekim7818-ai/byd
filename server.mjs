import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createHash,timingSafeEqual} from 'node:crypto';
import {fetchSeries} from './providers.mjs';
import {keys,meta} from './market.mjs';
const password=process.env.DASHBOARD_PASSWORD;
if(!password||password.length<16)throw new Error('Set DASHBOARD_PASSWORD to a unique secret with at least 16 characters. The server will not start without access protection.');
const user=process.env.DASHBOARD_USER||'investor',port=Number(process.env.PORT||10000),host=process.env.HOST||'0.0.0.0';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT.');
const expected=createHash('sha256').update(user+':'+password).digest();
const html=readFileSync(new URL('./index.html',import.meta.url));
const states=new Map(),pending=new Map();let lastCycleAt=null,nextCycleAt=null;
const snapshot=JSON.parse(readFileSync(new URL('./snapshot.json',import.meta.url),'utf8'));
for(const key of keys)if(snapshot[key]?.points?.length>1)states.set(key,{data:snapshot[key],error:null,checkedAt:null});
function authorized(req){const value=req.headers.authorization;if(!value?.startsWith('Basic ')||value.length>4096)return false;const input=Buffer.from(value.slice(6),'base64').toString('utf8');return timingSafeEqual(createHash('sha256').update(input).digest(),expected);}
function json(res,body,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function update(key,force=false){if(pending.has(key))return pending.get(key);const promise=(async()=>{const data=await fetchSeries(key,force);const previous=states.get(key);const state=data.status==='ok'?{data,error:null,checkedAt:new Date().toISOString()}:{data:previous?.data??null,error:data.error||'제공처 연결 실패',checkedAt:new Date().toISOString()};states.set(key,state);return state;})().finally(()=>pending.delete(key));pending.set(key,promise);return promise;}
async function cycle(){lastCycleAt=new Date().toISOString();nextCycleAt=new Date(Date.parse(lastCycleAt)+900000).toISOString();await Promise.allSettled(keys.map(k=>update(k,true)));console.log('Market collection complete:',keys.map(k=>k+':'+(states.get(k)?.error?'unavailable':'ok')).join(' '));console.log('Market collection diagnostics:',JSON.stringify(Object.fromEntries(keys.map(k=>{const s=states.get(k);return [k,{status:s?.error?'unavailable':'ok',error:s?.error??null,observations:s?.data?.points.length??0,lastObservation:s?.data?.points.at(-1)?.date??null}];}))));}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if((req.method==='GET'||req.method==='HEAD')&&url.pathname==='/healthz'){json(res,{status:'ok'});return;}
  if(!authorized(req)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Market Pulse", charset="UTF-8"','Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('개인용 대시보드입니다. 로그인해 주세요.');return;}
  if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{json(res,{error:'invalid origin'},403);return;}if(origin.host!==req.headers.host){json(res,{error:'cross-origin request blocked'},403);return;}}
  if(req.method!=='GET'&&req.method!=='HEAD'){json(res,{error:'method not allowed'},405);return;}
  if(url.pathname==='/api/health'){json(res,{application:'market-pulse',version:3,intervalMinutes:15,lastCycleAt,nextCycleAt,indicators:Object.fromEntries(keys.map(k=>[k,{status:states.get(k)?.error?'error':states.get(k)?.checkedAt?'ok':'loading',fetchedAt:states.get(k)?.data?.fetchedAt??null,observationDate:states.get(k)?.data?.points.at(-1)?.date??null}]))});return;}
  if(url.pathname==='/api/market'){
   const key=url.searchParams.get('series');if(!keys.includes(key)){json(res,{error:'unknown series'},400);return;}
   const state=await update(key);json(res,state.error?state.data?{...state.data,cached:true,error:state.error}:{status:'unavailable',points:[],source:meta[key].symbol,sourceUrl:meta[key].url,error:state.error,fetchedAt:state.checkedAt}:state.data);return;
  }
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});res.end(req.method==='HEAD'?undefined:html);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  json(res,{error:'not found'},404);
 }catch(error){console.error('Request failed:',error.message);json(res,{error:'request failed'},500);}
});
const timer=setInterval(cycle,900000);
server.on('error',error=>{clearInterval(timer);console.error(error.message);process.exitCode=1;});
server.listen(port,host,()=>{console.log('Market Pulse cloud server listening on port '+port);cycle();});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);server.close(()=>process.exit());});

