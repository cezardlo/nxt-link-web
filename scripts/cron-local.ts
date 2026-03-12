import { config } from 'dotenv';
config({ path: '.env.local' });

async function runCron() {
  const startTime = new Date().toLocaleTimeString();
  console.log(`[${startTime}] Triggering cron pipeline...`);

  try {
    const res = await fetch('http://localhost:3000/api/agents/cron');
    const data = await res.json();
    console.log(`[${startTime}] Status: ${res.status}`);
    console.log(`[${startTime}] Result:`, JSON.stringify(data).slice(0, 500));
  } catch (err) {
    console.error(`[${startTime}] Error:`, err);
  }
}

// Run immediately then every 30 minutes
runCron();
setInterval(runCron, 30 * 60 * 1000);
console.log('Cron runner started — fires every 30 minutes. Press Ctrl+C to stop.');
