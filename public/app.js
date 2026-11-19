const statusMessage = document.querySelector('#server-status');
const checkButton = document.querySelector('#check-server');

async function checkServer() {
  checkButton.disabled = true;
  checkButton.textContent = 'Checking…';
  statusMessage.textContent = 'Checking the server…';

  try {
    const response = await fetch('/api/health', {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Health request failed');
    const result = await response.json();
    if (result.status !== 'ok') throw new Error('Unexpected health response');
    statusMessage.textContent = 'Connected. The server is ready.';
  } catch {
    statusMessage.textContent = 'Could not reach the server. Check your connection and try again.';
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = 'Check again';
  }
}

checkButton.addEventListener('click', checkServer);
checkServer();
