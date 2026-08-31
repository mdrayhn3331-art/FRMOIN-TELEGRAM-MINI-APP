const tg=window.Telegram?.WebApp; if(tg){tg.ready();tg.expand();}
const SUPABASE_URL='https://fvuiisuzwezruxmlljty.supabase.co';
const SUPABASE_KEY='sb_publishable_NC5zaQusqVNFdoi3d8s9Ow_5wbtQF1a';
const API=`${SUPABASE_URL}/functions/v1/telegram-rewards`;
const statusEl=document.getElementById('taskStatus');
const setStatus=(m)=>{if(statusEl)statusEl.textContent=m;};
function startTask(title,url){
  if(!url||url==='#'){setStatus(`${title}: target link is not configured yet.`);return;}
  tg?.openLink(url); setStatus(`${title}: complete the task, then submit your proof.`);
}
function bind(){
 document.querySelectorAll('.task-action[data-url]').forEach(b=>b.addEventListener('click',()=>startTask(b.dataset.title||'Task',b.dataset.url)));
 document.querySelectorAll('.start[data-task]').forEach(b=>b.addEventListener('click',()=>{
   const id=b.dataset.task; const url=b.dataset.url||'#';
   startTask(b.dataset.title||'Task',url);
   setTimeout(()=>{
     const proof=prompt('Paste your proof URL (or leave blank if unavailable):');
     if(proof!==null) submit(id,proof.trim());
   },500);
 }));
}
async function submit(taskId,proof){
 if(!tg?.initData){setStatus('Open this page inside Telegram Mini App to submit tasks.');return;}
 if(!taskId){setStatus('Task is not configured.');return;}
 try{setStatus('Submitting for verification…');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({action:'submit_task',initData:tg.initData,taskId,proofUrl:proof})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'SUBMIT_FAILED');setStatus('Submitted ✓ Pending verification. Reward will be added after verification.');}catch(e){setStatus(`Could not submit: ${e.message}`);}}
bind();