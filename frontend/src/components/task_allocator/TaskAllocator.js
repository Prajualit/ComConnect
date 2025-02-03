import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  Flex,
  Stack,
} from "@chakra-ui/react";
import StatusPanel from "./StatusPanel";
import { ChatState } from "../../Context/ChatProvider";
import AllocatedTasks from "./AllocatedTasks";
import { API_URL } from "../../config/api.config";

const TaskAllocator = ({ workspaceId }) => {
  const { user } = ChatState();
  const toast = useToast();

  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const config = {
    headers: {
      Authorization: `Bearer ${user?.token}`,
    },
  };

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_URL}/tasks/my-tasks?workspaceId=${workspaceId}`,
        config
      );
      setTasks(data);
    } catch (error) {
      toast({
        title: "Error fetching tasks",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [workspaceId, config, toast]);

  useEffect(() => {
    if (user?.token) {
      fetchTasks();
    }
  }, [fetchTasks, user?.token]);

  const allocateTask = async () => {
    try {
      const { data } = await axios.post(
        `${API_URL}/tasks/allocate`,
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

      setTasks((prevTasks) => [...prevTasks, data]);
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

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  return (
    <Box p={5} maxWidth="1200px" mx="auto">
      <Stack spacing={4} mb={8}>
        <FormControl id="heading" isRequired>
          <FormLabel>Heading</FormLabel>
          <Input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            maxWidth="100%"
          />
        </FormControl>
        <FormControl id="description" isRequired>
          <FormLabel>Description</FormLabel>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxWidth="100%"
            resize="vertical"
          />
        </FormControl>
        <FormControl id="email" isRequired>
          <FormLabel>Assignee Email</FormLabel>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxWidth="100%"
          />
        </FormControl>
        <FormControl id="attachments">
          <FormLabel>Attachments</FormLabel>
          <Input
            value={attachments}
            onChange={(e) => setAttachments(e.target.value.split(","))}
            maxWidth="100%"
          />
        </FormControl>
      </Stack>
      <Button colorScheme="blue" mb={8} onClick={allocateTask}>
        Allocate Task
      </Button>
      <Flex wrap="wrap" gap={6}>
        <Box flex="1" minWidth="250px">
          <StatusPanel
            title="To Do"
            tasks={tasks.filter((task) => task.status === "to-do")}
            fetchTasks={fetchTasks}
            config={config}
            onTaskClick={handleTaskClick}
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatusPanel
            title="In Progress"
            tasks={tasks.filter((task) => task.status === "in-progress")}
            fetchTasks={fetchTasks}
            config={config}
            onTaskClick={handleTaskClick}
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatusPanel
            title="Done"
            tasks={tasks.filter((task) => task.status === "done")}
            fetchTasks={fetchTasks}
            config={config}
            onTaskClick={handleTaskClick}
          />
        </Box>
      </Flex>
      <Box mt={8}>
        <AllocatedTasks />
      </Box>
      {/* Add modal for task details here */}
    </Box>
  );
};

export default TaskAllocator;
