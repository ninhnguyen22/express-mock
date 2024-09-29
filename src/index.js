import path from 'path';
import { serverStart } from '../lib';
import sources from '../test/sources';

serverStart(sources, {
    port: 2121, webSocketEnabled: true, logConfig: {
        isLogEnabled: true,
        logFormat: ':response-time ms :method :status :url :req-headers :req-body :req-query',
        logFile: 'access.log',
        logRotate: '1d',
        logDir: path.join(__dirname, 'logs')
    }
});
