import React from "react";
import { Box } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import TaskAllocator from "./TaskAllocator";

const TaskAllocatorPage = () => {
  const { workspaceId } = useParams(); // Get workspaceId from URL

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Box
        position="relative"
        zIndex="1000"
        w="100%"
        minHeight="100vh"
        bg="#04539d" // Corrected background color prop
        color="orange"
        css={{
          "&::-webkit-scrollbar": {
            display: "none", // Hide scrollbar for WebKit browsers
          },
          scrollbarWidth: "none", // Hide scrollbar for Firefox
          msOverflowStyle: "none", // Hide scrollbar for IE and Edge
        }}
      >
        <TaskAllocator workspaceId={workspaceId} />
      </Box>
    </div>
    
  );
};

export default TaskAllocatorPage;
