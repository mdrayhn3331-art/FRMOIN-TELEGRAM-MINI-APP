import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};

async function hmac(key: ArrayBuffer|Uint8Array, message: string){const cryptoKey=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(message)));}
function hex(bytes: Uint8Array){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function validateInitData(initData:string){if(!BOT_TOKEN||!initData)throw new Error('Telegram authentication is not configured');const params=new URLSearchParams(initData);const receivedHash=params.get('hash');if(!receivedHash)throw new Error('Invalid Telegram initData');params.delete('hash');const dataCheckString=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');const secret=await hmac(new TextEncoder().encode('WebAppData'),BOT_TOKEN);const calculated=hex(await hmac(secret,dataCheckString));if(calculated!==receivedHash)throw new Error('Telegram authentication failed');const authDate=Number(params.get('auth_date')??0);if(!authDate||Math.floor(Date.now()/1000)-authDate>86400)throw new Error('Telegram session expired');const userRaw=params.get('user');if(!userRaw)throw new Error('Telegram user is missing');return JSON.parse(userRaw);}
async function getUser(initData:string){const tgUser=await validateInitData(initData);const {data,error}=await supabase.from('users').upsert({telegram_id:tgUser.id,username:tgUser.username??null,first_name:tgUser.first_name??null,last_name:tgUser.last_name??null,photo_url:tgUser.photo_url??null,updated_at:new Date().toISOString()},{onConflict:'telegram_id'}).select().single();if(error)throw error;return data;}
async function balance(userId:string){const [{data:wallet,error:wErr},{data:history,error:hErr}]=await Promise.all([supabase.from('wallets').select('*').eq('user_id',userId).single(),supabase.from('transactions').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(50)]);if(wErr)throw wErr;if(hErr)throw hErr;return {wallet,history:history??[]};}
function miningLevel(points:number){if(points>=500000)return 6;if(points>=100000)return 5;if(points>=25000)return 4;if(points>=5000)return 3;if(points>=1000)return 2;return 1;}
function miningPower(level:number){return Math.pow(2,Math.max(0,level-1));}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const body=await req.json();const action=String(body.action??'');const user=await getUser(String(body.initData??''));
    if(action==='profile')return Response.json({ok:true,user},{headers:cors});
    if(action==='balance')return Response.json({ok:true,user,...(await balance(user.id))},{headers:cors});

    if(action==='mine'){
      const now=Date.now();
      const {data:current,error:readErr}=await supabase.from('users').select('mining_points,mining_level,last_mine_at,total_taps').eq('id',user.id).single();
      if(readErr)throw readErr;
      if(current.last_mine_at && now-new Date(current.last_mine_at).getTime()<350)throw new Error('MINING_TOO_FAST');
      const oldPoints=Number(current.mining_points??0);
      if(Number(current.mining_level??1)===1 && oldPoints>=1000)throw new Error('FREE_MINING_LIMIT_REACHED');
      const level=miningLevel(oldPoints);const earned=miningPower(level);const newPoints=oldPoints+earned;const newLevel=miningLevel(newPoints);
      const {data:updated,error:updateErr}=await supabase.from('users').update({mining_points:newPoints,mining_level:newLevel,last_mine_at:new Date(now).toISOString(),total_taps:Number(current.total_taps??0)+1,updated_at:new Date(now).toISOString()}).eq('id',user.id).select().single();
      if(updateErr)throw updateErr;
      return Response.json({ok:true,earned,user:updated},{headers:cors});
    }

    if(action==='wallet'){
      const walletAddress=String(body.walletAddress??'').trim();if(!walletAddress)throw new Error('Wallet address required');
      const {data:updated,error}=await supabase.from('users').update({wallet_address:walletAddress,updated_at:new Date().toISOString()}).eq('id',user.id).select().single();if(error)throw error;
      return Response.json({ok:true,user:updated},{headers:cors});
    }

    if(action==='daily_login'){
      const today=new Date().toISOString().slice(0,10);const {data:existing}=await supabase.from('daily_logins').select('*').eq('user_id',user.id).eq('login_date',today).maybeSingle();if(existing)return Response.json({ok:true,already_claimed:true,streak:user.daily_streak,...(await balance(user.id))},{headers:cors});
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);const {data:prev}=await supabase.from('daily_logins').select('streak_value').eq('user_id',user.id).eq('login_date',yesterday).maybeSingle();const streak=prev?Number(prev.streak_value)+1:1;const reward=Math.min(100+streak*10,200);const {error:loginErr}=await supabase.from('daily_logins').insert({user_id:user.id,login_date:today,streak_value:streak,reward});if(loginErr)throw loginErr;const {data:wallet}=await supabase.from('wallets').select('*').eq('user_id',user.id).single();const newBalance=Number(wallet.balance)+reward;await supabase.from('wallets').update({balance:newBalance,lifetime_earned:Number(wallet.lifetime_earned)+reward,updated_at:new Date().toISOString()}).eq('user_id',user.id);await supabase.from('transactions').insert({user_id:user.id,type:'daily_login',amount:reward,balance_after:newBalance,description:`Daily login streak ${streak}`});await supabase.from('users').update({daily_streak:streak,last_login_at:new Date().toISOString()}).eq('id',user.id);return Response.json({ok:true,already_claimed:false,streak,reward,...(await balance(user.id))},{headers:cors});
    }

    if(action==='referral'){const {data:refs,error}=await supabase.from('referrals').select('*').eq('referrer_id',user.id).order('created_at',{ascending:false});if(error)throw error;const invite=`https://t.me/frmoin_bot?start=ref_${user.referral_code}`;return Response.json({ok:true,referral_code:user.referral_code,invite_link:invite,commission_rates:[0.2,0.2,0.25],referrals:refs??[]},{headers:cors});}
    if(action==='tasks'){const {data,error}=await supabase.from('tasks').select('*').eq('status','active').order('created_at',{ascending:false});if(error)throw error;return Response.json({ok:true,tasks:data??[]},{headers:cors});}
    if(action==='task_start'){const taskId=String(body.taskId??'');const {data:task}=await supabase.from('tasks').select('*').eq('id',taskId).eq('status','active').single();if(!task)throw new Error('Task not found');const {data,error}=await supabase.from('task_completions').upsert({task_id:taskId,user_id:user.id,status:'pending',verification_data:{}},{onConflict:'task_id,user_id'}).select().single();if(error)throw error;return Response.json({ok:true,completion:data,target_url:task.target_url},{headers:cors});}
    if(action==='task_verify')return Response.json({ok:false,error:'Platform verification adapter is required before payout.'},{status:400,headers:cors});

    if(action==='withdraw'){
      const method=String(body.method??'');
      if(method!=='ton')throw new Error('Only TON withdrawals are supported');
      const walletAddress=String(body.walletAddress??'').trim();
      const amountFat=Number(body.amountFat??0);
      if(!walletAddress)throw new Error('Connect a TON wallet first');
      if(!Number.isFinite(amountFat)||amountFat<10000)throw new Error('Minimum withdrawal is 10,000 FAT COIN ($10)');
      const {data:wallet}=await supabase.from('wallets').select('*').eq('user_id',user.id).single();
      const available=Number(wallet?.balance??0);
      if(available<amountFat)throw new Error('Insufficient FAT COIN balance');
      const {data:existing}=await supabase.from('withdrawals').select('id').eq('user_id',user.id).in('status',['pending','processing']).limit(1);
      if(existing?.length)throw new Error('A withdrawal is already processing');
      const {data,error}=await supabase.from('withdrawals').insert({user_id:user.id,method:'ton',account_value:walletAddress,amount:amountFat,status:'pending'}).select().single();
      if(error)throw error;
      return Response.json({ok:true,withdrawal:data,status:'pending',message:'TON payout queued. A trusted server-side treasury worker must verify and broadcast the transaction.'},{headers:cors});
    }
    if(action==='withdrawals'){const {data,error}=await supabase.from('withdrawals').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(error)throw error;return Response.json({ok:true,withdrawals:data??[]},{headers:cors});}
    throw new Error('Unknown action');
  }catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:'SERVER_ERROR'},{status:400,headers:cors});}
});
