import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  useToast,
  Stack,
  Box,
  List,
  ListItem,
} from "@chakra-ui/react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";

const TaskDialog = ({ isOpen, onClose, workspaceId, selectedChat }) => {
  const { user } = ChatState();
  const toast = useToast();
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [channelUsers, setChannelUsers] = useState([]);

  useEffect(() => {
    if (selectedChat) {
      // Get users from the current chat/channel
      setChannelUsers(selectedChat.users || []);
    }
  }, [selectedChat]);

  const handleEmailSearch = (searchTerm) => {
    setEmail(searchTerm);
    if (searchTerm.trim()) {
      const filteredUsers = channelUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filteredUsers);
    } else {
      setSearchResults([]);
    }
  };

  const selectUser = (selectedUser) => {
    setEmail(selectedUser.email);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };

      await axios.post(
        "/api/tasks/allocate",
        { heading, description, email, workspaceId, attachments },
        config
      );

      toast({
        title: "Task Allocated",
        description: "Task has been successfully allocated.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      onClose();
      setHeading("");
      setDescription("");
      setEmail("");
      setAttachments([]);
    } catch (error) {
      toast({
        title: "Error allocating task",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Allocate New Task</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Heading</FormLabel>
              <Input
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired position="relative">
              <FormLabel>Assignee Email</FormLabel>
              <Input
                value={email}
                onChange={(e) => handleEmailSearch(e.target.value)}
                placeholder="Type to search users in channel"
              />
              {searchResults.length > 0 && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  right={0}
                  bg="white"
                  boxShadow="md"
                  borderRadius="md"
                  maxH="200px"
                  overflowY="auto"
                  zIndex={1000}
                >
                  <List spacing={2}>
                    {searchResults.map((user) => (
                      <ListItem
                        key={user._id}
                        p={2}
                        cursor="pointer"
                        _hover={{ bg: "gray.100" }}
                        onClick={() => selectUser(user)}
                      >
                        {user.email}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>Attachments</FormLabel>
              <Input
                value={attachments}
                onChange={(e) => setAttachments(e.target.value.split(","))}
                placeholder="Enter attachment URLs separated by commas"
              />
            </FormControl>
            <Button colorScheme="blue" onClick={handleSubmit}>
              Allocate Task
            </Button>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default TaskDialog; 