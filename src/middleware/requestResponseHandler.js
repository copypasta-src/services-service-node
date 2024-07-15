// If the error was found within a nested function, throw an error
// If the error was found within a surface level route call, return an error
exports.requestResponseHandler = (req, res, details) => {
    console.log(details)
    if (!res && !req) {
      console.log(details)
      return details
    }
  
    else {
      console.log(details)
      res.status(details.status).send(details);
    }
    };
    
  