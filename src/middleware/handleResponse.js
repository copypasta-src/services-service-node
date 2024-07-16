async function handleResponse(req, res, logicFunc, data) {
    try {
      const result = await logicFunc(data);
      if (res && req) {
        res.status(200).send(result);
      } else {
        return result;
      }
    } catch (error) {
      if (res && req) {
        res.status(500).send('Error processing request');
      } else {
        throw error;
      }
    }
  }
  