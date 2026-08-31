const tg = window.Telegram?.WebApp;
const SUPABASE_URL = 'https://fvuiisuzwezruxmlljty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NC5zaQusqVNFdoi3d8s9Ow_5wbtQF1a';
const REWARDS_API = `${SUPABASE_URL}/functions/v1/telegram-rewards`;
const state = { balance: 0, today: 0, total: 0, level: 'Master', trust: 50, streak: 0 };

if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#070a12'); tg.setBackgroundColor('#070a12'); }
const user = tg?.initDataUnsafe?.user;
document.getElementById('username').textContent = user?.first_name || 'Guest';
document.getElementById('avatar').textContent = (user?.first_name?.[0] || 'F').toUpperCase();

function render(){
  document.getElementById('balance').textContent=state.balance.toLocaleString(undefined,{maximumFractionDigits:6});
  document.getElementById('today').textContent=state.today.toLocaleString(undefined,{maximumFractionDigits:6});
  document.getElementById('total').textContent=state.total.toLocaleString(undefined,{maximumFractionDigits:6});
  const level=document.getElementById('level'); if(level) level.textContent=state.level;
  const trust=document.getElementById('trustScore'); if(trust) trust.textContent=`${state.trust}/100`;
  const streak=document.getElementById('dailyStreak'); if(streak) streak.textContent=`${state.streak} days`;
}
async function api(action, extra={}){
  if(!tg?.initData) throw new Error('Open this app from Telegram.');
  const r=await fetch(REWARDS_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({action,initData:tg.initData,...extra})});
  const data=await r.json(); if(!r.ok||!data.ok) throw new Error(data.error||'API_ERROR'); return data;
}
async function loadProfile(){
  try{const d=await api('profile'); state.level=d.user.level; state.trust=Number(d.user.trust_score); state.streak=Number(d.user.daily_streak); render();}catch(e){console.info('Profile:',e.message);}
}
async function loadBalance(){
  try{const d=await api('balance'); state.balance=Number(d.wallet?.balance||0); state.total=Number(d.wallet?.lifetime_earned||0); const day=Date.now()-86400000; state.today=(d.history||[]).filter(x=>new Date(x.created_at).getTime()>=day&&Number(x.amount)>0).reduce((s,x)=>s+Number(x.amount),0); render();}
  catch(e){console.info('Balance:',e.message);}
}
function waitForMonetag(timeoutMs=10000){return new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(typeof window.show_11691259==='function'){clearInterval(timer);resolve(window.show_11691259);return;}if(Date.now()-started>=timeoutMs){clearInterval(timer);reject(new Error('MONETAG_NOT_READY'));}},200);});}
async function rewardAfterAd(adType, showAd){
  const status=document.getElementById('adStatus'); status.textContent='Please complete the ad to receive your reward.';
  await showAd();
  const d=await api('reward',{adType});
  state.balance=Number(d.coins); state.total+=Number(d.points||0); state.today+=Number(d.points||0); render(); status.textContent=`Reward credited. +${d.points} points.`;
  if(tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}
async function showRewardedAd(){const status=document.getElementById('adStatus');status.textContent='Loading Monetag rewarded ad…';const showAd=await waitForMonetag();await rewardAfterAd('rewarded_interstitial',showAd);}
document.getElementById('watchAd').addEventListener('click',async()=>{const button=document.getElementById('watchAd');button.disabled=true;try{await showRewardedAd();}catch(e){document.getElementById('adStatus').textContent=e.message==='MONETAG_NOT_READY'?'Ad is still loading. Please try again.':'Ad could not be completed. Please try again.';}finally{button.disabled=false;}});

function popup(title, message){ if(tg?.showPopup){ tg.showPopup({title,message,buttons:[{id:'ok',type:'ok',text:'OK'}]}); } else alert(`${title}\n\n${message}`); }

async function openTasks(){
  try{const d=await api('tasks'); const items=(d.tasks||[]).slice(0,8).map(t=>`${t.platform.toUpperCase()} • ${t.action} • $${Number(t.payout).toFixed(4)}`).join('\n'); popup('Available Tasks',items||'No active tasks right now.');}
  catch(e){popup('Tasks',e.message);}
}

document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',async()=>{
  const action=btn.dataset.action;
  if(action==='daily'){
    try{const d=await api('daily_login'); state.streak=Number(d.streak||state.streak); if(!d.already_claimed){state.balance=Number(d.wallet?.balance||state.balance); state.total=Number(d.wallet?.lifetime_earned||state.total); popup('Daily Login',`🔥 Streak: ${state.streak} days\nReward: $${Number(d.reward||0).toFixed(4)}`);}else popup('Daily Login',`Already claimed today.\n🔥 Streak: ${state.streak} days`); render();}
    catch(e){popup('Daily Login',e.message);} return;
  }
  if(action==='tasks'){await openTasks();return;}
  if(action==='invite'){
    try{const d=await api('referral'); const share=`https://t.me/share/url?url=${encodeURIComponent(d.invite_link)}&text=${encodeURIComponent('Join FRMOIN Rewards and earn!')}`; if(tg?.openTelegramLink) tg.openTelegramLink(share); else location.href=share;}catch(e){popup('Invite',e.message);} return;
  }
  if(action==='withdraw'){ popup('Withdraw',`Current balance: $${state.balance.toFixed(6)}\n\nMethods: bKash / USDT BEP20\nMinimums are enforced by the server.`); return; }
  if(action==='history'){ popup('Reward History',`Lifetime earned: $${state.total.toFixed(6)}\n\nUse the Wallet/Transactions screen for the full ledger.`); return; }
  if(action==='leaderboard'){ popup('Leaderboard','Leaderboard API is reserved for the next module.'); return; }
  if(action==='promo'){ popup('Promo Code','Promo code system is reserved for the next module.'); return; }
  popup('More Rewards','More earning options are coming soon.');
}));

loadProfile(); loadBalance(); render();
