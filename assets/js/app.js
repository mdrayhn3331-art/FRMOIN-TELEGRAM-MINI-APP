import { TonConnectUI } from 'https://esm.sh/@tonconnect/ui@2.2.0';

const tg=window.Telegram?.WebApp;
const SUPABASE_URL='https://fvuiisuzwezruxmlljty.supabase.co';
const SUPABASE_KEY='sb_publishable_NC5zaQusqVNFdoi3d8s9Ow_5wbtQF1a';
const REWARDS_API=`${SUPABASE_URL}/functions/v1/telegram-rewards`;
const MICRO_USD=1000000;
const MIN_WITHDRAW=MICRO_USD;
const LEVELS=[0,1000,5000,25000,100000,500000];
const state={balance:0,today:0,total:0,level:'Master',trust:50,streak:0,miningPoints:0,miningLevel:1,totalTaps:0};

if(tg){tg.ready();tg.expand();tg.setHeaderColor('#070a12');tg.setBackgroundColor('#070a12');}
const user=tg?.initDataUnsafe?.user;
const usernameEl=document.getElementById('username');if(usernameEl)usernameEl.textContent=user?.first_name||'Guest';
const avatarEl=document.getElementById('avatar');if(avatarEl)avatarEl.textContent=(user?.first_name?.[0]||'F').toUpperCase();
const usd=v=>(Number(v||0)/MICRO_USD).toFixed(4);
function render(){
  const b=document.getElementById('balance');if(b)b.textContent=`$${usd(state.balance)}`;
  const mp=document.getElementById('miningPoints');if(mp)mp.textContent=Number(state.miningPoints).toLocaleString();
  const ml=document.getElementById('miningLevel');if(ml)ml.textContent=state.miningLevel;
  const power=Math.pow(2,Math.max(0,state.miningLevel-1));
  const p=document.getElementById('miningPower');if(p)p.textContent=`+${power} / tap`;
  const mr=document.getElementById('mineReward');if(mr)mr.textContent=`+${power} POINT${power===1?'':'S'}`;
  const next=LEVELS[state.miningLevel]||null;
  const prev=LEVELS[state.miningLevel-1]||0;
  const pct=next?Math.max(0,Math.min(100,((state.miningPoints-prev)/(next-prev))*100)):100;
  const bar=document.getElementById('mineProgress');if(bar)bar.style.width=`${pct}%`;
  const nr=document.getElementById('nextLevelReq');if(nr)nr.textContent=next?`${next.toLocaleString()} pts`:'MAX LEVEL';
  const level=document.getElementById('level');if(level)level.textContent=state.miningLevel;
  const trust=document.getElementById('trustScore');if(trust)trust.textContent=`${state.trust}/100`;
  const streak=document.getElementById('dailyStreak');if(streak)streak.textContent=`${state.streak} days`;
  const today=document.getElementById('today');if(today)today.textContent=`$${usd(state.today)}`;
  const total=document.getElementById('total');if(total)total.textContent=`$${usd(state.total)}`;
  const taps=document.getElementById('totalTaps');if(taps)taps.textContent=Number(state.totalTaps).toLocaleString();
}
async function api(action,extra={}){if(!tg?.initData)throw new Error('Open this app from Telegram.');const r=await fetch(REWARDS_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({action,initData:tg.initData,...extra})});let data={};try{data=await r.json();}catch{}if(!r.ok||!data.ok)throw new Error(data.error||`API_ERROR_${r.status}`);return data;}
async function loadBalance(){try{const d=await api('balance');state.balance=Number(d.wallet?.coins||d.wallet?.balance||0);const h=d.history||[];state.total=h.reduce((s,x)=>s+Number(x.points||x.amount||0),0);state.today=h.filter(x=>new Date(x.created_at).toDateString()===new Date().toDateString()).reduce((s,x)=>s+Number(x.points||x.amount||0),0);render();}catch(e){console.info('Balance:',e.message);}}
async function loadProfile(){try{const d=await api('profile');if(d.user){state.level=d.user.level||state.level;state.trust=Number(d.user.trust_score??state.trust);state.streak=Number(d.user.daily_streak??state.streak);state.miningPoints=Number(d.user.mining_points??0);state.miningLevel=Number(d.user.mining_level??d.user.level??1);state.totalTaps=Number(d.user.total_taps??0);render();}}catch(e){console.info('Profile:',e.message);}}
function popup(title,message){if(tg?.showPopup)tg.showPopup({title,message,buttons:[{id:'ok',type:'ok',text:'OK'}]});else alert(`${title}\n\n${message}`);}

async function mine(){const btn=document.getElementById('mineButton');const status=document.getElementById('mineStatus');if(!user||btn?.disabled)return;if(btn)btn.disabled=true;try{const d=await api('mine');if(d.user){state.miningPoints=Number(d.user.mining_points);state.miningLevel=Number(d.user.mining_level);state.totalTaps=Number(d.user.total_taps);render();}if(status)status.textContent=`⛏ +${d.earned} points mined`;tg?.HapticFeedback?.impactOccurred('light');}catch(e){if(status)status.textContent=`❌ ${e.message}`;}finally{if(btn)btn.disabled=false;}}

document.getElementById('mineButton')?.addEventListener('click',mine);

async function invite(){const fallback=`https://t.me/frmoin_bot?start=ref_${user?.id||''}`;try{const d=await api('referral');const link=d.invite_link||fallback;const share=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join FRMOIN Miner and earn points!')}`;try{await navigator.clipboard.writeText(link);}catch{}if(tg?.openTelegramLink)tg.openTelegramLink(share);else location.href=share;popup('Referral Link',`${link}\n\nYour invite link is ready.`);}catch(e){popup('Referral Link',fallback);}}

document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',async()=>{const a=btn.dataset.action;if(a==='invite'){await invite();return;}if(a==='withdraw'){if(state.balance<MIN_WITHDRAW){popup('Withdraw',`Minimum withdrawal is $1.00.\nCurrent balance: $${usd(state.balance)}`);return;}popup('Withdraw',`Available: $${usd(state.balance)}\nMinimum: $1.00\nMethods: bKash / USDT BEP20`);return;}if(a==='history'){popup('Reward History',`Total rewards: $${usd(state.total)}`);return;}popup('FRMOIN',`Selected: ${a||'option'}`)}));

/* TON Connect */
let tonConnect=null;
try{
  tonConnect=new TonConnectUI({manifestUrl:`${location.origin}/tonconnect-manifest.json`,buttonRootId:'tonConnect'});
  tonConnect.onStatusChange(async wallet=>{const status=document.getElementById('walletStatus');if(wallet){if(status)status.textContent=`Connected: ${wallet.account.address.slice(0,8)}…${wallet.account.address.slice(-6)}`;const d=await api('wallet',{walletAddress:wallet.account.address});if(d.user)state.walletAddress=wallet.account.address;}else{if(status)status.textContent='Connect your wallet';}});
}catch(e){console.info('TON Connect:',e.message);}

document.getElementById('tonConnect')?.addEventListener('click',()=>{try{tonConnect?.openModal();}catch(e){popup('TON Wallet',e.message);}});

loadBalance();loadProfile();render();
