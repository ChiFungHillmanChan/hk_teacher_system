module.exports = (req, res) => {
  console.log('🎯 Simple function called!', req.url);

  res.status(200).json({
    success: true,
    message: 'Simple function working!',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};
