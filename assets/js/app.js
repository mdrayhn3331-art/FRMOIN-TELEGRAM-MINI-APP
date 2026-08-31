const tg = window.Telegram?.WebApp;
const state = { balance: 0, today: 0, total: 0 };

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#070a12');
  tg.setBackgroundColor('#070a12');
}

const user = tg?.initDataUnsafe?.user;
const displayName = user?.first_name || 'Guest';
document.getElementById('username').textContent = displayName;
document.getElementById('avatar').textContent = (user?.first_name?.[0] || 'F').toUpperCase();

function render() {
  document.getElementById('balance').textContent = state.balance.toLocaleString();
  document.getElementById('today').textContent = state.today.toLocaleString();
  document.getElementById('total').textContent = state.total.toLocaleString();
}

function waitForMonetag(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (typeof window.show_11691259 === 'function') {
        clearInterval(timer);
        resolve(window.show_11691259);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        reject(new Error('MONETAG_NOT_READY'));
      }
    }, 200);
  });
}

async function showRewardedAd() {
  const status = document.getElementById('adStatus');
  status.textContent = 'Loading Monetag rewarded ad…';

  const showAd = await waitForMonetag();
  status.textContent = 'Please complete the ad to receive your reward.';

  // Monetag's rewarded SDK call resolves when the rewarded ad flow completes.
  await showAd();

  // Reward only after the SDK promise resolves; never reward on a failed/closed call.
  state.balance += 100;
  state.today += 100;
  state.total += 100;
  render();
  status.textContent = '+100 coins added!';

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred('success');
  }
}

document.getElementById('watchAd').addEventListener('click', async () => {
  const button = document.getElementById('watchAd');
  const status = document.getElementById('adStatus');
  button.disabled = true;
  try {
    await showRewardedAd();
  } catch (error) {
    console.info('Monetag:', error.message);
    status.textContent = error.message === 'MONETAG_NOT_READY'
      ? 'Ad is still loading. Please try again.'
      : 'Ad could not be completed. Please try again.';
  } finally {
    button.disabled = false;
  }
});

render();
