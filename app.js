const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');
const formatMessage = require('./utils/messages');
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./utils/users');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

const botName = 'Chatbook';

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    res.json({ filename: req.file.filename, originalname: req.file.originalname });
  } else {
    res.status(400).send('No file uploaded');
  }
});

// Run when users connect
io.on('connection', function(socket){
  socket.on('joinRoom', function({username, room}){
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    // Welcoming new user
    socket.emit('message', formatMessage(botName, 'Welcome to Chatbook!'));

    // Broadcast when a new user connects to that room
    socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat.`));

    // Send room and users info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen to chatMessage
  socket.on('chatMessage', function(msg){
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Listen to fileMessage
  socket.on('fileMessage', function(fileInfo){
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('fileMessage', {
      ...formatMessage(user.username, `Shared a file: ${fileInfo.originalname}`),
      fileUrl: `/uploads/${fileInfo.filename}`,
      fileName: fileInfo.originalname
    });
  });

  // Runs when users disconnect
  socket.on('disconnect', function(){
    const user = userLeave(socket.id);
    if (user){
      io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat.`));
      
      // Send room and users info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function(){
  console.log(`Server is running on PORT: ${PORT}`);
});
