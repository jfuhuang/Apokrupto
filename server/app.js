const express = require('express'); // Import Express
const app = express(); // Create an Express application instance
const port = 3000; // Define the port number
const userRoutes = require('./routes/userRoutes');
const lobbyRoutes = require('./routes/lobbyRoutes');


app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/lobbies', lobbyRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

async function start() {
  try {
    await require('./dbInit')(); // Initialize the DB.
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}!`);
    });
  } catch (err) {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  }
}

start();
