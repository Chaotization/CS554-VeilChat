import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../../context/userStore'; // Adjust the path as necessary
import { doc, getDoc, query, collection, where, setDoc, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc} from "firebase/firestore";
import { db } from '../../../firebase/FirebaseFunctions';
import {useChatStore} from '../../../context/chatStore';

const FriendList = ({triggerChatUpdate}) => {
  const { currentUser } = useUserStore();
  const [allFriends, setAllFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const { changeChat } = useChatStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchInput, setsearchInput] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingFriend, setViewingFriend] = useState(null);

  useEffect(() => {
    async function fetchFriendsData() {
      const promises = currentUser.friends.map(async (friendId) => {
        const docRef = doc(db, "users", friendId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
      });
      const friendsData = await Promise.all(promises);
      const sortedFriends = friendsData.filter(Boolean).sort((a, b) => {
        // Assuming the last name is stored under the key 'lastName'
        return a.lastName.localeCompare(b.lastName);
      });
      setAllFriends(sortedFriends);
      setFriends(sortedFriends);
    }
  
    if (currentUser && currentUser.friends) {
      fetchFriendsData();
    }
  }, [currentUser]);
  
  const handleSelectFriend = async (friendId) => {
    // Query to find any existing chat between the two users
    const chatsRef = collection(db, "chats");
    const firstQuery = query(chatsRef, where("members", "array-contains", currentUser.id));
    const firstQuerySnapshot = await getDocs(firstQuery);
    
    const chatsWithFriend = firstQuerySnapshot.docs.filter(doc => 
      doc.data().members.includes(friendId)
    );
  
  
    if (chatsWithFriend.length > 0) {
      // Use the first found chat document
      const chatDoc = chatsWithFriend[0];
      const chatId = chatDoc.id;
      await updateDoc(doc(db, "chats", chatId), {
        updatedAt: Date.now()
      })
      const userIDs = [currentUser.id, friendId]
      userIDs.forEach(async id => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnap = await getDoc(userChatsRef);
        if (userChatsSnap.exists()) {
          const userChatsData = userChatsSnap.data();
          const updatedChats = userChatsData.chats.map(chat => {
            if (chat.chatId === chatId) {
              return { ...chat, updatedAt: Date.now() };
            }
            return chat;
          });
          await updateDoc(userChatsRef, { chats: updatedChats });
        }
      });
      // Fetch friend's data and set the active chat
      const friendDoc = await getDoc(doc(db, "users", friendId));
      const friendData = friendDoc.data();
      changeChat(chatId, { id: friendId, ...friendData });
      triggerChatUpdate(); 
    } else {
      // Create a new chat if it does not exist
      const newChatRef = doc(collection(db, "chats"));
      await setDoc(newChatRef, {
        members: [currentUser.id, friendId],
        messages: []
      });
      const chatId = newChatRef.id;
  
      // Add new chat to each user's 'userchats'
      const userIDs = [currentUser.id, friendId];
      userIDs.forEach(async id => {
        const userChatRef = doc(db, "userchats", id);
        await updateDoc(userChatRef, {
          chats: arrayUnion({
            chatId: chatId,
            receiverId: id === currentUser.id ? friendId : currentUser.id,
            lastMessage: "",
            updatedAt: Date.now()
          })
        });
      });
    }
  };

  useEffect(() => {
    const filteredFriends = allFriends.filter(friend =>
      friend.firstName.toLowerCase().includes(searchInput.toLowerCase()) ||
      friend.lastName.toLowerCase().includes(searchInput.toLowerCase())
    );
    setFriends(filteredFriends);
  }, [searchInput, allFriends]);


  const handleDeleteFriend = async () => {
    const userRef = doc(db, "users", currentUser.id);
    const friendRef = doc(db, "users", selectedFriend.id);

    const userChatRef = doc(db, "userchats", currentUser.id);
    const userChatSnapshot = await getDoc(userChatRef);
    const userChatData = userChatSnapshot.data();
    const userFdata = userChatData.chats.find(chat => chat.receiverId === selectedFriend.id);
    const userchatDRef = doc(db, "chats", userFdata.chatId)
    

    try {
      await updateDoc(userChatRef,{
        chats: arrayRemove(userFdata)
      } );
    } catch (error) {
      console.error("Error deleting document:", error);
    }
    try {
      await deleteDoc(userchatDRef);
    } catch (e){
      console.log(e)
    }
    const friendChatRef = doc(db, "userchats", selectedFriend.id);
    const friendChatSnapshot = await getDoc(friendChatRef);
    const friendChatData = friendChatSnapshot.data();
    const FriendFdata = friendChatData.chats.find(chat => chat.receiverId === currentUser.id);
    
    
    try {
      await updateDoc(friendChatRef ,{
        chats: arrayRemove(FriendFdata)
      } );
    } catch (error) {
      console.error("Error deleting document:", error);
    }

    await updateDoc(userRef, {
      friends: arrayRemove(selectedFriend.id)
    });


    await updateDoc(friendRef, {
      friends: arrayRemove(currentUser.id)
    });


    setShowConfirm(false);
    setFriends(friends.filter(friend => friend.id !== selectedFriend.id));
  };

  return (
    <div className="friendList bg-base-100 shadow-md rounded-lg p-4 h-screen max-h-screen">
      <div className="search mb-4">
        <div className="searchbar">
        <input
            type="text"
            placeholder="Search Friend"
            className="input input-bordered w-full"
            value={searchInput}
            onChange={(e) => setsearchInput(e.target.value)} 
          />
        </div>
      </div>
      {friends.map(friend => (
        <div key={friend.id} className="item flex items-center mb-2 cursor-pointer" onClick={() => handleSelectFriend(friend.id)}>
          <img src={friend.profilePictureLocation || './public/imgs/default_avatar.png'} alt={friend.firstName} className="w-10 h-10 rounded-full mr-4" />
          <div className="texts flex-grow">
            <span className="font-bold">{friend.firstName} {friend.lastName}</span>
          </div>
          <img src="./imgs/friendprofile.png" alt="Profile" className="w-6 h-6 cursor-pointer mr-2" onClick={() => {
            setViewingFriend(friend);
            setShowProfile(true);
          }} />
          <img src="./imgs/delete.png" alt="Options" className="w-6 h-6 cursor-pointer" onClick={() => {
            setShowConfirm(true);
            setSelectedFriend(friend);
          }} />
        </div>
      ))}
      {showConfirm && (
        <div className="confirmDialog bg-base-100 shadow-md rounded-lg p-4 fixed inset-0 flex flex-col justify-center items-center">
          <p className="mb-4">Are you sure you want to delete {selectedFriend.firstName} {selectedFriend.lastName}?</p>
          <img src={selectedFriend.profilePictureLocation || './public/imgs/default_avatar.png'} alt={selectedFriend.firstName} className="w-20 h-20 rounded-full mb-4" />
          <div className="flex justify-center">
            <button className="btn btn-error mr-2" onClick={handleDeleteFriend}>Delete</button>
            <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}
      {showProfile && (
        <div className="profileDialog bg-base-100 shadow-md rounded-lg p-4 fixed inset-0 flex flex-col justify-center items-center">
        <h2 className="mb-4">{viewingFriend.firstName} {viewingFriend.lastName}'s Profile</h2>
        <img src={viewingFriend.profilePictureLocation || './public/imgs/default_avatar.png'} alt={viewingFriend.firstName} className="w-20 h-20 rounded-full mb-4" />
        <p>Email: {viewingFriend.email}</p>
        <p>Gender: {viewingFriend.gender}</p>
        <p>Languages: {viewingFriend.languages.join(', ')}</p> 
      <div className="flex justify-center">
      <button className="btn btn-secondary" onClick={() => setShowProfile(false)}>Close</button>
    </div>
  </div>
)}
    </div>
  );
};

export default FriendList;
