const config = require('../config');
const logger = require('../utils/logger');

global.config = config;
global.logger = logger;

jest.setTimeout(70000);