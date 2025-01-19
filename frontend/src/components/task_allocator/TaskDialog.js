import React, { useState } from "react";
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
} from "@chakra-ui/react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";

const TaskDialog = ({ isOpen, onClose, workspaceId }) => {
  const { user } = ChatState();
  const toast = useToast();
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [attachments, setAttachments] = useState([]);

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
            <FormControl isRequired>
              <FormLabel>Assignee Email</FormLabel>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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