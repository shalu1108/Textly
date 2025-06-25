const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const fileInput = document.getElementById('file-input');

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {ignoreQueryPrefix: true});
const socket = io();

// Join chatroom
socket.emit('joinRoom', { username, room });

// Get room and users
socket.on('roomUsers', function({ room, users }){
   outputRoomName(room);
   outputUsers(users);
});

// Message from server
socket.on('message', function(message){
   outputMessage(message);
   // scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight;
});

// File message from server
socket.on('fileMessage', function(fileMessage){
   outputFileMessage(fileMessage);
   // scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener('submit', function(e){
   e.preventDefault();

   const msg = e.target.elements.msg.value;

   socket.emit('chatMessage', msg);

   e.target.elements.msg.value = '';
   e.target.elements.msg.focus();
});

// File input change
fileInput.addEventListener('change', function(e){
   const file = e.target.files[0];
   if (!file) return;

   const formData = new FormData();
   formData.append('file', file);

   fetch('/upload', {
      method: 'POST',
      body: formData
   })
   .then(response => response.json())
   .then(data => {
      socket.emit('fileMessage', { filename: data.filename, originalname: data.originalname });
   })
   .catch(error => console.error('Error:', error));

   // Clear the file input
   e.target.value = '';
});

// Output msg to DOM
function outputMessage(message) {
   const div = document.createElement('div');
   div.classList.add('message');

   // Check if the message is from the current user
   if (message.username === username) {
      div.classList.add('outgoing');
   }

   div.innerHTML = `
      <p class="meta">${message.username === username ? 'You' : message.username} <span>${message.time}</span></p>
      <p class="text">${message.text}</p>
   `;

   document.querySelector('.chat-messages').appendChild(div);
}

// Output file message to DOM
function outputFileMessage(fileMessage) {
   const div = document.createElement('div');
   div.classList.add('message');

   // Check if the message is from the current user
   if (fileMessage.username === username) {
      div.classList.add('outgoing');
   }

   div.innerHTML = `
      <p class="meta">${fileMessage.username === username ? 'You' : fileMessage.username} <span>${fileMessage.time}</span></p>
      <p class="text">${fileMessage.text}</p>
      <p><a href="${fileMessage.fileUrl}" target="_blank" download="${fileMessage.fileName}">Download ${fileMessage.fileName}</a></p>
   `;

   document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
   roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
   userList.innerHTML = users.map(user => `<li>${user.username}</li>`).join('');
}
