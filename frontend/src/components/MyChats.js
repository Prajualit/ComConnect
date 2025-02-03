import React, { useEffect, useState } from "react";
import { Box, Stack, Text, Button,Flex } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useToast } from "@chakra-ui/toast";
import { ChatState } from "../Context/ChatProvider";
import { useParams, useNavigate } from "react-router-dom";
import { fetchChats } from "../utils/api";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { getSender } from "../config/ChatLogics";
import "./chatbox.css";
import { API_URL } from "../config/api.config";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();
  const { workspaceId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const handleFetchChats = async () => {
    try {
      if (!workspaceId) {
        throw new Error("No workspace selected.");
      }
      const data = await fetchChats(user.token, workspaceId);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    handleFetchChats();
  }, [fetchAgain, workspaceId]);

  const sortedChats = Array.isArray(chats)
    ? [...chats].sort((a, b) => a.chatName.length - b.chatName.length)
    : [];

  return (
    <Box
      d="flex"
      flexDir="column"
      alignItems="center"
      p={3}
      bg="white"
      w="100%"
      h="100%"
      borderRadius="lg"
      borderWidth="1px"
      className="my-chats-container"
    >
      <Box>
          <Flex
            position={"relative"}
            
            left="0"
            right="0"
            margin="0 auto"
            justifyContent="center"
            alignItems="center"
          >
            <Text
              fontFamily="Arial"
              fontSize={"6xl"}
              fontWeight="900"
              textAlign="left"
              bg="linear-gradient(0deg, rgba(0, 122, 255, 0.15), rgba(0, 122, 255, 0.15)), linear-gradient(0deg, #CBDCF3, #CBDCF3)"
              bgClip="text"
              color="transparent"
              zIndex={2}
            >
              COM
            </Text>
            <Text
              fontFamily="Arial"
              fontSize={"6xl"}
              fontWeight="900"
              textAlign="left"
              color="transparent"
              padding="0 8px"
              sx={{
                WebkitTextStroke: "2.47px rgba(203, 220, 243, 1)",
                WebkitTextFillColor: "transparent",
              }}
              zIndex={2}
            >
              CONNECT
            </Text>
            
          </Flex>
        </Box>

    
      <Box
        pb={3}
        px={3}
        fontSize={{ base: "28px", md: "30px" }}
        fontFamily="Work sans"
        display="flex"
        w="100%"
        justifyContent="center"
        alignItems={"center"}
        gap={"4%"}
      >
        <Button className="groupchatbtn">My Chats</Button>
        <GroupChatModal>
          <Button
            d="flex"
            alignItems={"center"}
            fontSize={{ base: "17px", md: "10px", lg: "17px" }}
            rightIcon={<AddIcon />}
            textAlign={"center"}
            className="groupchatbtn"
          >
            New Group Chat
          </Button>
        </GroupChatModal>

        

        <Button
          d="flex"
          fontSize={{ base: "17px", md: "10px", lg: "17px" }}
          textAlign={"center"}
          className="taskbtn groupchatbtn"
          onClick={() => navigate(`/tasks/${workspaceId}`)} // Pass workspaceId in the URL
        >
          Go to Tasks
        </Button>

        <Button
          d="flex"
          fontSize={{ base: "17px", md: "10px", lg: "17px" }}
          textAlign={"center"}
          className="taskbtn groupchatbtn"
          onClick={() => navigate(`/geo-location`)} // Pass workspaceId in the URL
        >
          map
        </Button>
      </Box>
      <Box
      d="flex"
      flexDir="column"
      w="100%"
      h="100%"
      borderRadius="lg"
      overflowY="auto"
      className="box-chat">
        
      <Box
        d="flex"
        flexDir="column"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="auto"
        background="linear-gradient(135deg, #D9D9D9 30%, #ffffff 70%)"
        backdropFilter="blur(10px)"
        className="group-chat-content"
       
      >
        {Array.isArray(chats) ? (
          <Stack >
            {sortedChats.map((chat) => (
              <Box
                onClick={() => setSelectedChat(chat)}

                cursor="pointer"
                bg={selectedChat === chat ? "#FBB03B" : "#E8E8E8"}
                color={selectedChat === chat ? "#04539D" : "#04539D"}
              

                px={3}
                py={2}
                borderRadius="lg"
                key={chat._id}
              >
                <Text>
                  {!chat.isGroupChat
                    ? getSender(loggedUser, chat.users)
                    : chat.chatName}
                </Text>
                {chat.latestMessage && (
                  <Text fontSize="xs">
                    <b>{chat.latestMessage.sender.name} : </b>
                    {chat.latestMessage.content.length > 50
                      ? chat.latestMessage.content.substring(0, 51) + "..."
                      : chat.latestMessage.content}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
      </Box>
    </Box>
  );
};

export default MyChats;
