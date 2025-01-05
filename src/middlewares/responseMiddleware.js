function standardizeResponse(req, res, next) {
  // Add common fields to the response object
  res.responseData = {
    responseCode: null,
    message: null,
    data: null,
    // Add other common fields as needed
  };
  next();
}

export default standardizeResponse;
