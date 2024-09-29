import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import config from './config';
import { controlApi } from './api/control';
import { SourcesParser } from './core/sources-parser';
import { SourcesRouter } from './core/sources-router';
import { recordingApi } from './api/recording';
import { apiRecorder } from './api/recording/api-recorder';
import { websocketApi } from './api/websocket';
// import rfs from 'rotating-file-stream'; 
import { createStream } from 'rotating-file-stream';

let { isLogEnabled } = config;

export class App {
  constructor(sources, serverConfig, customMiddlewareFn) {
    this.parser = new SourcesParser(sources);
    this.apiUrl = this.getApiUrl(serverConfig);
    this.app = express();

    console.log('******* CONFIG **********'.yellow);
    const logConfig = serverConfig.logConfig || {}
    if (logConfig.hasOwnProperty('isLogEnabled')) {
      isLogEnabled = logConfig.isLogEnabled;
    }
    console.log(`* isLogEnabled   ${isLogEnabled}`.yellow);

    this.initMiddleware(customMiddlewareFn, logConfig);
    this.initControlApi();
    this.initRecordingApi();
    this.initMocks();
  }

  initMiddleware(customMiddlewareFn, logConfig) {
    this.app.use(bodyParser.text());
    this.app.use(bodyParser.json());
    this.app.use(apiRecorder(this.apiUrl));
    this.initLogger(logConfig);

    if (customMiddlewareFn) {
      customMiddlewareFn(this.app.use.bind(this.app));
    }
  }

  initMocks() {
    const router = new SourcesRouter(this.parser);
    router.registerSources(this.app, isLogEnabled);
  }

  /**
   *  Method to start logger of requests
   *    Actual format
   *      0.230 ms GET 200 /some/url/
   *    More option
   *      https://github.com/expressjs/morgan
   */
  initLogger(logConfig) {
    if (isLogEnabled) {
      // Log format
      const logFormat = logConfig.logFormat || ':response-time ms :method :status :url';
      console.log(logFormat)
      // Log file
      if (logConfig.logFile) {
        const logFile = logConfig.logFile;
        const accessLogStream = createStream(logFile, {
          interval: logConfig.logRotate || '1d',
          path: logConfig.logDir,
        })
        // Add req-headers
        morgan.token('req-headers', function (req, res) {
          return JSON.stringify(req.headers)
        })
        // Add req-body
        morgan.token('req-body', function (req, res) {
          return JSON.stringify(req.body)
        })
        // Add req-query
        morgan.token('req-query', function (req, res) {
          return JSON.stringify(req.query)
        })
        this.app.use(morgan(logFormat, { stream: accessLogStream }));
      } else {
        this.app.use(morgan(logFormat));
      }
    }
  }

  initControlApi() {
    this.app.use(this.apiUrl, controlApi(this.parser));
  }

  initRecordingApi() {
    this.app.use(this.apiUrl, recordingApi());
  }

  initWebSocketApi(wsServer) {
    this.app.use(this.apiUrl, websocketApi(wsServer));
  }

  getApiUrl({ controlApiUrl } = {}) {
    return controlApiUrl ? controlApiUrl : '/api/v1';
  }

  start(port, callback) {
    return this.app.listen(port, callback);
  }
}
