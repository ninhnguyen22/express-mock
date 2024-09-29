import { StatusCodes } from 'http-status-codes';
import { methods, contentType } from '../constants';
import { isFunction, isString, isObject, isArray } from './utils';
import { matchRecordPost } from './matchers/http-post-matcher';
import { matchRecordGet } from './matchers/http-get-matcher';
// ** For XML
import xml from 'xml2js';

const sendResponse = (response, res, next) => {
  if (response.file) {
    const { type, path } = response.file;

    if (!type) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send('File type has to be specified!')
        .end();
      return;
    }

    if (!path) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send('File path has to be specified!')
        .end();
      return;
    }

    res.status(response.statusCode).type(type);
    res.sendFile(
      path,
      {
        dotfiles: 'deny',
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true,
        },
      },
      function (err) {
        if (err) {
          next(err);
        } else {
          console.log('Sent:', path);
        }
      }
    );
  } else {
    if (response.contentType === contentType.XML) {
      sendXmlResponse(response, res, next);
    } else {
      res.send(response.body);
    }
  }
};

const sendXmlResponse = (response, res, next) => {
  if (isString(response.body)) {
    res.send(response.body);
  }
  if (isObject(response.body)) {
    const builder = new xml.Builder({
      renderOpts: { 'pretty': false }
    });
    res.send(builder.buildObject(response.body));
  }
  if (isArray(response.body)) {
    const builder = new xml.Builder({
      renderOpts: { 'pretty': false }
    });
    res.send(builder.buildObject({ ['root']: response.body }));
  }
}

export const requestHandler = (sourcesParser, req, res, next) => {
  let method = req.method;
  let path = req.route.path;
  let definitions = sourcesParser.getMap()[path][method];

  // console.log(method);
  // console.log(req.body);

  let response = null;
  let matchedRecord = null;

  if (definitions.length === 1) {
    matchedRecord = definitions[0];
    response = matchedRecord.response;
  } else {
    switch (method) {
      case methods.POST: {
        matchedRecord = matchRecordPost(req, definitions);
        break;
      }

      case methods.GET:
      case methods.PUT:
      case methods.DELETE:
      case methods.PATCH:
      default: {
        matchedRecord = matchRecordGet(req, definitions);
      }
    }

    if (matchedRecord !== null) {
      response = matchedRecord.response;
    }

    if (response === null) {
      console.log('ERR no reaponse but why?'.bgRed.white);
      console.log('I know this URL but no match for parameters.'.bgBlue.white);
      console.log(`method ${method}    path ${path}`);
      console.log('QUERY'.yellow);
      console.log(req.query);
      console.log('BODY'.yellow);
      console.log(req.body);
      console.log('bundle'.yellow);
      // myLog(bundle);
      res
        .status(StatusCodes.NOT_FOUND)
        .send('NOT FOUND - no reaponse but why? Look to console.')
        .end();
      return;
    }
  }

  if (isFunction(response)) {
    if (matchedRecord.useFullRequestInResponse) {
      response = response(req);
    } else {
      response = response(req.params, req.query, req.body, req.headers);
    }
  }

  if (!!response.headers) {
    response.headers.forEach((headerItem) => {
      res.setHeader(headerItem['name'], headerItem['values'][0]);
    });
  }

  res
    .status(response.statusCode)
    .type(response.contentType || contentType.JSON);

  if (response.delay) {
    setTimeout(() => {
      sendResponse(response, res, next);
    }, response.delay);
  } else {
    sendResponse(response, res, next);
  }
};
