import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, VStack, Text, useToast } from "@chakra-ui/react";
import TaskCard from "./TaskCard";
import { ChatState } from "../../Context/ChatProvider";

const AllocatedTasks = () => {
  const { user } = ChatState();
  const [tasks, setTasks] = useState([]);
  const toast = useToast();

  const config = {
    headers: {
      Authorization: `Bearer ${user?.token}`,
    },
  };

  useEffect(() => {
    fetchAllocatedTasks();
  }, []);

  const fetchAllocatedTasks = async () => {
    try {
      const { data } = await axios.get(
        "/api/tasks/allocated-tasks",
        config
      );
      setTasks(data);
    } catch (error) {
      toast({
        title: "Error fetching allocated tasks",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={5}>
      <Text fontSize="2xl" mb={4}>
        Tasks I've Allocated
      </Text>
      <VStack spacing={4}>
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            fetchTasks={fetchAllocatedTasks}
            config={config}
          />
        ))}
      </VStack>
    </Box>
  );
};

export default AllocatedTasks; 