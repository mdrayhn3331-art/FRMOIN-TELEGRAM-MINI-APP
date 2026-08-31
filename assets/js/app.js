const tg = window.Telegram?.WebApp;
const SUPABASE_URL = 'https://fvuiisuzwezruxmlljty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NC5zaQusqVNFdoi3d8s9Ow_5wbtQF1a';
const REWARDS_API = `${SUPABASE_URL}/functions/v1/telegram-rewards`;
const state = { balance: 0, today: 0, total: 0 };

if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#070a12'); tg.setBackgroundColor('#070a12'); }
const user = tg?.initDataUnsafe?.user;
document.getElementById('username').textContent = user?.first_name || 'Guest';
document.getElementById('avatar').textContent = (user?.first_name?.[0] || 'F').toUpperCase();

function render(){
  document.getElementById('balance').textContent=state.balance.toLocaleString();
  document.getElementById('today').textContent=state.today.toLocaleString();
  document.getElementById('total').textContent=state.total.toLocaleString();
}
async function api(action, extra={}){
  const r=await fetch(REWARDS_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({action,initData:tg?.initData||'',...extra})});
  const data=await r.json(); if(!r.ok||!data.ok) throw new Error(data.error||'API_ERROR'); return data;
}
async function loadBalance(){
  if(!tg?.initData) return;
  try{const d=await api('balance'); state.balance=Number(d.wallet?.coins||0); state.total=(d.history||[]).reduce((s,x)=>s+Number(x.points||0),0); const day=Date.now()-86400000; state.today=(d.history||[]).filter(x=>new Date(x.created_at).getTime()>=day).reduce((s,x)=>s+Number(x.points||0),0); render();}
  catch(e){console.info('Balance:',e.message);}
}
function waitForMonetag(timeoutMs=10000){return new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(typeof window.show_11691259==='function'){clearInterval(timer);resolve(window.show_11691259);return;}if(Date.now()-started>=timeoutMs){clearInterval(timer);reject(new Error('MONETAG_NOT_READY'));}},200);});}
async function rewardAfterAd(adType, showAd){
  const status=document.getElementById('adStatus'); status.textContent='Please complete the ad to receive your reward.';
  await showAd();
  const d=await api('reward',{adType});
  state.balance=Number(d.coins); state.total+=Number(d.points); state.today+=Number(d.points); render(); status.textContent=`+${d.points} coins added!`;
  if(tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}
async function showRewardedAd(){const status=document.getElementById('adStatus');status.textContent='Loading Monetag rewarded ad…';const showAd=await waitForMonetag();await rewardAfterAd('rewarded_interstitial',showAd);}
document.getElementById('watchAd').addEventListener('click',async()=>{const button=document.getElementById('watchAd');button.disabled=true;try{await showRewardedAd();}catch(e){document.getElementById('adStatus').textContent=e.message==='MONETAG_NOT_READY'?'Ad is still loading. Please try again.':'Ad could not be completed. Please try again.';}finally{button.disabled=false;}});

function popup(title, message){
  if(tg?.showPopup){ tg.showPopup({title,message,buttons:[{id:'ok',type:'ok',text:'OK'}]}); }
  else alert(`${title}\n\n${message}`);
}

document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',async()=>{
  const action=btn.dataset.action;
  if(action==='daily'){
    try{
      const showAd=await waitForMonetag();
      await rewardAfterAd('rewarded_popup',()=>showAd('pop'));
    }catch(e){popup('Daily Bonus','The rewarded ad is not ready yet. Please try again.');}
    return;
  }
  if(action==='invite'){
    const bot='https://t.me/frmoin_bot';
    const share=`https://t.me/share/url?url=${encodeURIComponent(bot)}&text=${encodeURIComponent('Join FRMOIN Rewards and earn coins!')}`;
    if(tg?.openTelegramLink) tg.openTelegramLink(share); else location.href=share;
    return;
  }
  if(action==='withdraw'){ popup('Withdraw',`Current balance: ${state.balance.toLocaleString()} coins.\n\nWithdrawal module is ready to be connected to bKash/Nagad.`); return; }
  if(action==='history'){ popup('Reward History',`You have earned ${state.total.toLocaleString()} coins in the loaded history.`); return; }
  if(action==='tasks'){ popup('Daily Tasks','Daily task system is ready for the next setup step.'); return; }
  if(action==='leaderboard'){ popup('Leaderboard','Leaderboard will be connected to the rewards database next.'); return; }
  if(action==='promo'){ popup('Promo Code','Promo code system will be connected next.'); return; }
  popup('More Rewards','More earning options are coming soon.');
}));

loadBalance(); render();
