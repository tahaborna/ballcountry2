/* ===== سرور نمونه ذخیره ابری «کشورهای توپی» =====
   بدون هیچ وابستگی — فقط Node.js. قرارداد آداپتور HTTP بازی:
     POST /register {user, hash}   → {ok:true}
     POST /login    {user, hash}   → {ok:true}
     POST /save     {user, envelope} → {ok:true}
     POST /load     {user}         → {ok:true, envelope}
   اجرا:  node server.js [پورت]   (پیش‌فرض 8787)
   برای اینترنت عمومی، پشت HTTPS/پروکسی قرار دهید. */
const http=require('http');
const fs=require('fs');
const path=require('path');

const PORT=Number(process.argv[2]||8787);
const DB_FILE=path.join(__dirname,'cloud-db.json');
let db={accts:{},data:{}};
try{ db=JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch(e){}

function saveDB(){ try{ fs.writeFileSync(DB_FILE, JSON.stringify(db)); }catch(e){} }
function readBody(req){ return new Promise((res,rej)=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>2e6) req.destroy(); }); req.on('end',()=>{ try{ res(b?JSON.parse(b):{}); }catch(e){ rej(new Error('bad json')); } }); req.on('error',rej); }); }
function send(res, code, obj){ res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); }

http.createServer(async (req,res)=>{
  if(req.method!=='POST'){ send(res,404,{ok:false,error:'not found'}); return; }
  let body={};
  try{ body=await readBody(req); }catch(e){ send(res,400,{ok:false,error:'bad request'}); return; }
  const user=String(body.user||'').trim();
  try{
    if(req.url==='/register'){
      if(!user || user.length<3) throw new Error('نام کاربری کوتاه است');
      if(!body.hash || String(body.hash).length<8) throw new Error('هش رمز نامعتبر است');
      if(db.accts[user]) throw new Error('این نام کاربری از قبل ثبت شده است');
      db.accts[user]={hash:body.hash, createdAt:Date.now()}; saveDB();
      send(res,200,{ok:true});
    } else if(req.url==='/login'){
      const a=db.accts[user];
      if(!a) throw new Error('حسابی با این نام یافت نشد');
      if(a.hash!==body.hash) throw new Error('رمز عبور نادرست است');
      send(res,200,{ok:true});
    } else if(req.url==='/save'){
      if(!db.accts[user]) throw new Error('ابتدا وارد حساب شو');
      const size=JSON.stringify(body.envelope||{}).length;
      if(size>1e6) throw new Error('پاکت بزرگ‌تر از حد مجاز است');
      db.data[user]={...body.envelope, uploadedAt:Date.now()}; saveDB();
      send(res,200,{ok:true});
    } else if(req.url==='/load'){
      if(!db.accts[user]) throw new Error('ابتدا وارد حساب شو');
      const env=db.data[user];
      if(!env) throw new Error('هنوز نسخه‌ای در ابری ذخیره نشده');
      send(res,200,{ok:true, envelope:env});
    } else send(res,404,{ok:false,error:'not found'});
  }catch(e){ send(res,400,{ok:false, error:e.message}); }
}).listen(PORT, ()=> console.log('☁️ سرور ذخیره ابری کشورهای توپی روی پورت '+PORT));
