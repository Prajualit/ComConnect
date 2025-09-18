import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  FormControl,
  Input,
  useToast,
  Box,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";

const UpdateGroupChatModal = ({ fetchMessages, fetchAgain, setFetchAgain }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameloading, setRenameLoading] = useState(false);
  const toast = useToast();

  const { selectedChat, setSelectedChat, user } = ChatState();

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) {
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`/api/user?search=${search}`, config);
      console.log(data);
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!groupChatName) return;

    try {
      setRenameLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(
        `/api/chat/rename`,
        {
          chatId: selectedChat._id,
          chatName: groupChatName,
        },
        config
      );

      console.log(data._id);
      // setSelectedChat("");
      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setRenameLoading(false);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: error.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setRenameLoading(false);
    }
    setGroupChatName("");
  };

  const handleAddUser = async (user1) => {
    if (selectedChat.users.find((u) => u._id === user1._id)) {
      toast({
        title: "User Already in group!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    if (selectedChat.groupAdmin._id !== user._id) {
      toast({
        title: "Only admins can add someone!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(
        `/api/chat/groupadd`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: error.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
    setGroupChatName("");
  };

  const handleRemove = async (user1) => {
    if (selectedChat.groupAdmin._id !== user._id && user1._id !== user._id) {
      toast({
        title: "Only admins can remove someone!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(
        `/api/chat/groupremove`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      user1._id === user._id ? setSelectedChat() : setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      fetchMessages();
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: error.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
    setGroupChatName("");
  };

  return (
    <>
      <Text
        w={"100%"}
        onClick={onOpen}
        cursor={"pointer"}
        px={3}
        lineHeight={"none"}
      >
        {selectedChat.chatName.toUpperCase()}
      </Text>

      <Modal onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg="#0F1924" border="1px solid #21364A" color="white">
          <ModalHeader
            fontSize="20px"
            fontFamily="Work sans"
            d="flex"
            justifyContent="center"
            color="white"
          >
            Group Details
          </ModalHeader>

          <ModalCloseButton color="white" _hover={{ bg: "#21364A" }} />
          <ModalBody d="flex" flexDir="column" alignItems="center">
            <Text lineHeight={"none"} mb={4} fontSize="24px">{selectedChat.chatName}</Text>
            <Box w="100%" d="flex" flexWrap="wrap" pb={3}>
              {selectedChat.users.map((u) => (
                <UserBadgeItem
                  key={u._id}
                  user={u}
                  admin={selectedChat.groupAdmin}
                  handleFunction={() => handleRemove(u)}
                />
              ))}
            </Box>
            <FormControl display="flex">
              <Input
                placeholder="Chat Name"
                mb={3}
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                border="1px solid #3C87CD"
                color="white"
                _placeholder={{ color: "gray.400" }}
                bg="#0F1924"
                borderColor="#2982db20"
                _hover={{ borderColor: "#2982db40" }}
                _focus={{
                  borderColor: "#21364A",
                  boxShadow: "0 0 0 1px #21364A",
                  bg: "#131f2bff",
                }}
              />
              <Button
                variant="solid"
                bg="#21364A"
                color="white"
                _hover={{ bg: "#1a2a39ff" }}
                _active={{ bg: "#1a2a39ff" }}
                ml={1}
                isLoading={renameloading}
                onClick={handleRename}
              >
                Update
              </Button>
            </FormControl>
            <FormControl>
              <Input
                placeholder="Add User to group"
                mb={1}
                onChange={(e) => handleSearch(e.target.value)}
                border="1px solid #3C87CD"
                bg="#0F1924"
                borderColor="#2982db20"
                color="white"
                _placeholder={{ color: "gray.400" }}
                _hover={{ borderColor: "#2982db40" }}
                _focus={{
                  borderColor: "#21364A",
                  boxShadow: "0 0 0 1px #21364A",
                  bg: "#131f2bff",
                }}
              />
            </FormControl>

            {loading ? (
              <Spinner size="lg" color="#3C87CD" />
            ) : (
              <Box
                maxH="200px"
                overflowY="auto"
                w="100%"
                sx={{
                  // Custom scrollbar styling
                  "&::-webkit-scrollbar": {
                    width: "2px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "#21364A",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#3C87CD",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    background: "#1f449c",
                  },
                }}
              >
                {searchResult?.map((user) => (
                  <UserListItem
                    key={user._id}
                    user={user}
                    handleFunction={() => handleAddUser(user)}
                  />
                ))}
              </Box>
            )}
          </ModalBody>
          <ModalFooter bg="#0F1924">
            <Button
              onClick={() => handleRemove(user)}
              bg="#dc3545"
              color="white"
              _hover={{ bg: "#c82333" }}
              _active={{ bg: "#bd2130" }}
            >
              Leave Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
