import React, { useState } from "react";
import { Box, Typography } from "@mui/material";

export const PreviewRemarks: React.FC<{ remarks?: string | null }> = ({ remarks }) => {
  const [expanded, setExpanded] = useState(false);
  const text = remarks?.trim();
  const previewLimit = 90;

  if (!text) return <>-</>;

  const shouldTruncate = text.length > previewLimit;
  const displayText =
    expanded || !shouldTruncate
      ? text
      : `${text.slice(0, previewLimit).trimEnd()}...`;

  return (
    <Box>
      <Typography
        component="span"
        sx={{ color: "var(--color-text-primary)", whiteSpace: "pre-wrap" }}
      >
        {displayText}
      </Typography>
      {shouldTruncate && (
        <span
          onClick={() => setExpanded(!expanded)}
          style={{
            color: "var(--color-primary-hover)",
            cursor: "pointer",
            marginLeft: "4px",
            fontSize: "0.85em",
            fontWeight: 600,
          }}
        >
          {expanded ? "View Less" : "View More"}
        </span>
      )}
    </Box>
  );
};
