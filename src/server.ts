import app from './app';

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shutdown complete');
  });
});


