// Import from local vendored server code
import app from './_server/index';
import serverless from 'serverless-http';

export default serverless(app);
