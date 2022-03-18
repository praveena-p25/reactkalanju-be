const c_users = [];

// joins the user to the specific chatroom
function join_User(socket_id, state, id, module, socket, exp = 15 * 60000) {
  const p_user = { socket_id, state, id, module, exp };

  c_users.push(p_user);

  setTimeout(() => {
    user_Disconnect(socket_id);
    socket.emit("get_out");
  }, exp);

  return p_user;
}

// Gets a particular user id to return the current user
function get_Current_User(state, id, module) {
  return c_users.find(
    (p_user) =>
      p_user.id === id && p_user.state === state && p_user.module === module
  );
}

// called when the user leaves the chat and its user object deleted from array
function user_Disconnect(id) {
  const index = c_users.findIndex((p_user) => p_user.socket_id === id);
  if (index !== -1) {
    return c_users.splice(index, 1)[0];
  }
}

module.exports = {
  join_User,
  get_Current_User,
  user_Disconnect,
};
