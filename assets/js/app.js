const tg = window.Telegram?.WebApp;
const SUPABASE_URL = 'https://fvuiisuzwezruxmlljty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NC5zaQusqVNFdoi3d8s9Ow_5wbtQF1a';
const REWARDS_API = `${SUPABASE_URL}/functions/v1/telegram-rewards`;
const state = { balance: 0, today: 0, total: 0, level: 'Master', trust: 50, streak: 0 };
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#070a12'); tg.setBackgroundColor('#070a12'); }
const user = tg?.initDataUnsafe?.user;
const usernameEl=document.getElementById('username'); if(usernameEl) usernameEl.textContent=user?.first_name||'Guest';
const avatarEl=document.getElementById('avatar'); if(avatarEl) avatarEl.textContent=(user?.first_name?.[0]||'F').toUpperCase();
function render(){
 const b=document.getElementById('balance'); if(b)b.textContent=state.balance.toLocaleString();
 const t=document.getElementById('today'); if(t)t.textContent=state.today.toLocaleString();
 const total=document.getElementById('total'); if(total)total.textContent=state.total.toLocaleString();
 const level=document.getElementById('level'); if(level)level.textContent=state.level;
 const trust=document.getElementById('trustScore'); if(trust)trust.textContent=`${state.trust}/100`;
 const streak=document.getElementById('dailyStreak'); if(streak)streak.textContent=`${state.streak} days`;
}
async function api(action,extra={}){if(!tg?.initData)throw new Error('Open this app from Telegram.');const r=await fetch(REWARDS_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({action,initData:tg.initData,...extra})});const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||'API_ERROR');return data;}
async function loadBalance(){try{const d=await api('balance');state.balance=Number(d.wallet?.coins||0);const history=d.history||[];state.total=history.reduce((s,x)=>s+Number(x.points||0),0);const day=Date.now()-86400000;state.today=history.filter(x=>new Date(x.created_at).getTime()>=day).reduce((s,x)=>s+Number(x.points||0),0);render();}catch(e){console.info('Balance:',e.message);}}
async function loadProfile(){try{const d=await api('profile');if(d.user){state.level=d.user.level||state.level;state.trust=Number(d.user.trust_score??state.trust);state.streak=Number(d.user.daily_streak??state.streak);render();}}catch(e){console.info('Profile:',e.message);}}
function waitForMonetag(timeoutMs=15000){return new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(typeof window.show_11691259==='function'){clearInterval(timer);resolve(window.show_11691259);return;}if(Date.now()-started>=timeoutMs){clearInterval(timer);reject(new Error('MONETAG_NOT_READY'));}},200);});}
async function rewardAfterAd(adType,showAd){const status=document.getElementById('adStatus');if(status)status.textContent='Please complete the ad…';await showAd();const d=await api('reward',{adType});state.balance=Number(d.coins);state.total+=Number(d.points||0);state.today+=Number(d.points||0);render();if(status)status.textContent=`✅ +${d.points||0} coins added!`;if(tg?.HapticFeedback)tg.HapticFeedback.notificationOccurred('success');}
async function showRewardedAd(){const status=document.getElementById('adStatus');if(status)status.textContent='Loading Monetag rewarded ad…';const showAd=await waitForMonetag();await rewardAfterAd('rewarded_interstitial',showAd);}
const watch=document.getElementById('watchAd');if(watch)watch.addEventListener('click',async()=>{watch.disabled=true;try{await showRewardedAd();}catch(e){const status=document.getElementById('adStatus');if(status)status.textContent=e.message==='MONETAG_NOT_READY'?'Ad is still loading. Please try again.':`❌ ${e.message}`;}finally{watch.disabled=false;}});
function popup(title,message){if(tg?.showPopup)tg.showPopup({title,message,buttons:[{id:'ok',type:'ok',text:'OK'}]});else alert(`${title}\n\n${message}`);}
document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',async()=>{const action=btn.dataset.action;if(action==='daily'){try{const d=await api('daily_login');state.streak=Number(d.streak||state.streak);if(!d.already_claimed){state.balance=Number(d.wallet?.balance??state.balance);state.total=Number(d.wallet?.lifetime_earned??state.total);popup('Daily Login',`🔥 Streak: ${state.streak} days\nReward: $${Number(d.reward||0).toFixed(4)}`);}else popup('Daily Login',`Already claimed today.\n🔥 Streak: ${state.streak} days`);render();}catch(e){popup('Daily Login',e.message);}return;}if(action==='invite'){try{const d=await api('referral');const share=`https://t.me/share/url?url=${encodeURIComponent(d.invite_link)}&text=${encodeURIComponent('Join FRMOIN Rewards and earn!')}`;if(tg?.openTelegramLink)tg.openTelegramLink(share);else location.href=share;}catch(e){popup('Invite',e.message);}return;}if(action==='withdraw'){popup('Withdraw',`Current balance: ${state.balance} coins\n\nMethods: bKash / USDT BEP20`);return;}if(action==='history'){popup('Reward History',`Total ad/task rewards: ${state.total} coins`);return;}popup('FRMOIN',`Selected: ${action||'option'}`);}));
loadBalance();loadProfile();render();