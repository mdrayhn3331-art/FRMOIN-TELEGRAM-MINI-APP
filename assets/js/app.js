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

/*
 * Monetag integration point.
 *
 * IMPORTANT: Do not fake a successful ad completion. Once your Monetag
 * Telegram Mini App SDK/tag is issued, place the official rewarded-ad call
 * here and award coins only from the provider's documented completion event.
 */
async function showRewardedAd() {
  const status = document.getElementById('adStatus');
  status.textContent = 'Monetag rewarded ad is not configured yet.';
  throw new Error('MONETAG_NOT_CONFIGURED');
}

document.getElementById('watchAd').addEventListener('click', async () => {
  const button = document.getElementById('watchAd');
  button.disabled = true;
  try {
    await showRewardedAd();
  } catch (error) {
    console.info(error.message);
  } finally {
    button.disabled = false;
  }
});

render();
