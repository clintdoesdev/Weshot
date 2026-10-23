import { startTestSite } from './server';

const site = await startTestSite();
console.log(`SITE_PORT=${site.port}`);
