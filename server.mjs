import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';

const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({limit:'100kb'}));
app.use(express.static(path.join(__dirname,'public')));

const ADMIN_CODE=process.env.ADMIN_CODE || 'STIKE-ADMIN-2026';
let settings={announcement:'Willkommen bei Pets99 Hub!',slowMode:false,chatEnabled:true};
let messages=[
 {id:1,user:'stikerpo56',text:'Willkommen im globalen Chat 👋',time:Date.now()-1000*60*4},
 {id:2,user:'LuckyPet',text:'Welche Pets benutzt ihr gerade?',time:Date.now()-1000*60*2}
];

app.get('/api/config',(_,res)=>res.json({settings}));
app.get('/api/chat',(req,res)=>res.json(messages.slice(-100)));
app.post('/api/chat',(req,res)=>{
 if(!settings.chatEnabled)return res.status(403).json({error:'Chat deaktiviert'});
 const user=String(req.body.user||'Guest').trim().slice(0,24);
 const text=String(req.body.text||'').trim().slice(0,300);
 if(!text)return res.status(400).json({error:'Nachricht fehlt'});
 const m={id:Date.now(),user:user||'Guest',text,time:Date.now()};
 messages.push(m); messages=messages.slice(-250); res.json(m);
});
app.post('/api/admin/login',(req,res)=>{
 const code=String(req.body.code||'');
 res.json({ok:code===ADMIN_CODE});
});
app.post('/api/admin/settings',(req,res)=>{
 const code=String(req.body.code||'');
 if(code!==ADMIN_CODE)return res.status(403).json({error:'Ungültiger Admin-Code'});
 if(typeof req.body.announcement==='string')settings.announcement=req.body.announcement.slice(0,180);
 if(typeof req.body.slowMode==='boolean')settings.slowMode=req.body.slowMode;
 if(typeof req.body.chatEnabled==='boolean')settings.chatEnabled=req.body.chatEnabled;
 res.json({ok:true,settings});
});

app.listen(process.env.PORT||3000,()=>console.log('Pets99 Hub running'));
