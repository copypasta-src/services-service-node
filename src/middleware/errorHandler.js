// If the error was found within a nested function, throw an error
// If the error was found within a surface level route call, return an error
const logger = require('./logger');
exports.errorHandler = (err, req, res, next, details) => {
  console.log(details)
  if (!res && !req) {
    logger.error('Unhandled error:', { stack: err.stack });
    throw new Error(err.message || 'Internal Server Error');
  }

  else {
    logger.error('Unhandled error:', { stack: err.stack });
    res.status(details.status).send(details);

  }
    // console.error(err.stack);
    // res.status(err.status || 500).json({
    //   message: err.message || 'Internal Server Error',
    //   statusCode: err.status || 500,
    // });
  };
  
